# Halchal Operations Admin Panel (`admin/`)

> **Internal Application Security Directive:**  
> Privileged administration portal for Halchal (হালচাল) utility monitoring and operations across Bangladesh.  
> **Strictly private:** No public access, no search indexation, mandatory TOTP MFA (AAL2), and immutable audit trail.

---

## 1. Architectural Principles (ADR-0018)

1. **Subdomain & Code Isolation:**  
   The admin panel is maintained as an independent Next.js 15 application inside `admin/` with its own `package.json`, deployed strictly on an isolated administrative subdomain (e.g. `https://admin.halchal.bd`). Public citizen users (`web/`) never download administrative bundles.
2. **Zero Search Indexation:**  
   Every response transmits `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`. A root `robots.txt` disallows all crawlers (`Disallow: /`), and zero sitemaps are generated.
3. **Defense-in-Depth Authentication:**  
   - Public self-signup is disabled. Admin accounts exist exclusively in `public.admin_users`.
   - Mandatory TOTP MFA: Sessions without Authenticator Assurance Level 2 (AAL2) can access **nothing** except `/auth/mfa` and `/auth/logout`.
   - Inactivity timeout: 30 minutes of idle time invalidates the session.
   - Absolute timeout: 12 hours maximum lifetime regardless of activity.
   - Anti-brute-force rate limiting per IP and per Email via Upstash Redis with progressive failure backoff.
4. **Server-Side Service Role Isolation:**  
   `SUPABASE_SERVICE_ROLE_KEY` is loaded strictly in server-side Route Handlers and Server Actions (`import 'server-only'`). The caller's authenticated identity, active status, and role permissions are verified on **every single invocation**.
5. **Append-Only Immutable Audit Trail:**  
   Every mutation writes to `public.admin_audit_log` with before/after state diffs, SHA-256 pseudonymized IP hash, and mandatory operational reason. A PostgreSQL trigger prohibits all `UPDATE` and `DELETE` operations.
6. **Citizen Privacy Non-Negotiable:**  
   The admin panel never displays or stores raw GPS coordinates or street addresses. All telemetry operates on Uber H3 Resolution 8 spatial cells and cryptographic hashes (`device_id_hash`).

---

## 2. Local Development & Setup

### Prerequisites
- Node.js >= 20.12.0
- Supabase Project or local Supabase CLI instance (`supabase start`)
- Upstash Redis instance (optional for local testing; memory fallback provided)

### Installation
```bash
cd admin
npm install
cp .env.example .env.local
```

### Environment Variables (`admin/.env.local`)
Configure the following keys:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Running the Development Server
```bash
npm run dev
# Starts on port 3001 (http://localhost:3001)
```

---

## 3. First Admin Bootstrap CLI (`create-first-admin.ts`)

To create the initial `owner` account, run the bootstrap script from the repository root:

```bash
# Interactive mode (prompts for email and hidden password)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/create-first-admin.ts

# Or via ephemeral environment variables:
ADMIN_EMAIL="owner@domain.bd" ADMIN_PASSWORD="..." SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/create-first-admin.ts
```

### Password Policy
The script strictly validates:
- Minimum length: 14 characters
- At least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special symbol
- Rejects common / leaked passwords and repetitive character sequences
- **Security Rule:** Never hardcode passwords in `.env`, git commits, seeds, or documentation.

---

## 4. Disaster Recovery & MFA Loss Protocol

If an administrator loses their physical device or TOTP authenticator app:

1. **Another Owner Recovers Access:**
   - Any active administrator with the `owner` role navigates to `/admins`.
   - Locates the affected administrator and clicks the **Force MFA Reset** button.
   - Enters a mandatory audit rationale (e.g. `Physical device lost by operator; identity verified via out-of-band video call`).
   - The backend unenrolls all existing TOTP factors and sets `requires_mfa: true`.
   - On next sign-in, the administrator is prompted to scan a new QR code.

2. **Emergency Database Break-Glass (Console Access Required):**
   If the sole active owner loses MFA access:
   - Connect to Supabase SQL Editor or psql CLI with database administrator privileges.
   - Unenroll MFA factors for the owner user ID:
     ```sql
     DELETE FROM auth.mfa_factors WHERE user_id = '<OWNER_UUID>';
     ```
   - Verify the owner is active in `public.admin_users`:
     ```sql
     UPDATE public.admin_users SET is_active = true WHERE user_id = '<OWNER_UUID>';
     ```
   - The owner logs in and immediately enrolls a new authenticator app.

---

## 5. Network Hardening Toggle: Cloudflare Access / IP Allowlist

In production environments, placing the administrative subdomain behind Zero-Trust Network Access (ZTNA) is strongly recommended:

### Option A: Cloudflare Access (Recommended)
1. In Cloudflare Zero Trust Dashboard, create an **Access Application** for `admin.halchal.bd`.
2. Add an **Allow Policy** requiring:
   - Identity Provider login (Google Workspace / GitHub Org / Email OTP to authorized team domain).
   - Country / IP address restriction.
3. Users authenticate through Cloudflare Access first before reaching the Next.js admin application.

### Option B: Edge IP Allowlist
If using Vercel or Cloudflare Workers:
- Configure Web Application Firewall (WAF) rule:
  `If (http.host eq "admin.halchal.bd" and not ip.src in { OFFICE_IP VPN_IP }) then Block`.

---

## 6. Backup & Immutability Verification

- Database backups must include `public.admin_users` and `public.admin_audit_log`.
- To verify audit log immutability:
  ```sql
  -- This MUST fail with: 'admin_audit_log is append-only'
  UPDATE public.admin_audit_log SET reason = 'test' WHERE id = '...';
  DELETE FROM public.admin_audit_log WHERE id = '...';
  ```
- To verify sole owner protection:
  ```sql
  -- This MUST fail with: 'Cannot delete or deactivate the last remaining active owner'
  UPDATE public.admin_users SET is_active = false WHERE role = 'owner';
  ```
