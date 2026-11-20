# ADR-0018: Halchal Admin Panel Architecture — Isolated Next.js Application, Mandatory TOTP MFA (AAL2), Role-Based Access Control, and Immutable Audit Trail

- **Date:** 2026-11-20
- **Status:** Accepted
- **Author:** Principal Full-Stack Engineer & Application Security Engineer

## Context

Halchal operates as a live, crowd-sourced utility status platform across Bangladesh under active blackout conditions. As the platform matures, operating the system requires administrative capabilities: monitoring grid and server health, moderating abuse and sybil attacks, managing geographic zones and redirect aliases, updating official government LPG/utility prices, managing editorial guides, sending localized emergency notifications, and gating SEO indexing flags.

However, mixing administrative functionality into the public web client (`web/`) or trusting client-side role validation presents severe security, privacy, and architectural risks:
1. **Attack Surface & Accidental Exposure:** Exposing administrative routes on the public domain (`halchal.bd/admin`) increases targeted probing, credential stuffing, and bundle pollution. Public users on 2G/3G connections must not download administrative code or libraries.
2. **Citizen Privacy Non-Negotiable:** Under ADR-0005 and `CLAUDE.md`, Halchal enforces zero raw GPS storage, absolute anonymity between users, and an ephemeral 72-hour raw report TTL. The admin panel must never display or store raw GPS, street addresses, or raw device identifiers. All telemetry and moderation must strictly operate on cryptographic hashes (`device_id_hash`, user UUIDs).
3. **Privilege Escalation & Impersonation:** Simple session checks or client-side role checks are vulnerable to token tampering, JWT replay, and broken access controls. Sensitive operational switches (kill switches, official prices, ban actions, zone overrides) require rigorous multi-factor authentication and an immutable audit trail.
4. **Search Engine Poisoning:** Admin routes, internal metrics, and moderation tools must never be indexed, crawled, or surfaced in search engine result pages.

## Decision

We establish the Halchal Admin Panel as an isolated, hardened internal application with the following architectural specifications:

### 1. Isolated Deployment Architecture (`admin/`)
- The admin panel is engineered as an independent Next.js 15 App Router application in `admin/` with its own `package.json`, TypeScript configuration, and Tailwind CSS system.
- It deploys strictly on a separate administrative subdomain (e.g. `admin.halchal.bd`), completely isolated from the citizen web client (`web/`).
- Zero search indexation:
  - Every page, route handler, and API response transmits `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.
  - Dedicated `robots.ts` serving `User-agent: *\nDisallow: /`.
  - Zero sitemaps generated or referenced.
- Hardened security headers enforced via Next.js middleware:
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`
- Optional edge hardening: Documented configuration for Cloudflare Access Zero-Trust mTLS / IP allowlisting in front of the administrative subdomain.

### 2. Authentication, Mandatory TOTP MFA (AAL2), & Session Life Cycle
- **No Public Self-Signup:** Public registration is disabled. Administrative identities exist exclusively in the `public.admin_users` table provisioned by an existing owner or via the bootstrap CLI.
- **Mandatory TOTP MFA:** The application enforces Supabase Authenticator Assurance Level 2 (AAL2). A session without AAL2 can access **nothing** except `/auth/mfa` (TOTP enrollment or challenge verification) and `/auth/logout`.
- **Session Expiration Guardrails:**
  - Idle timeout: 30 minutes of inactivity invalidates the admin session.
  - Absolute timeout: 12 hours maximum lifetime regardless of activity.
- **Brute-Force & Rate Limiting Defense:**
  - Login attempts rate limited per IP address and per email address using Upstash Redis with progressive delays.
  - Uniform generic authentication failure messages ("Invalid credentials") to eliminate username enumeration.

### 3. Granular Role-Based Access Control (RBAC) & Search Path Isolation
- Defined `admin_role` enum: `owner`, `moderator`, `content_editor`, `analyst`.
- Centralized, typed permission matrix (`admin/src/lib/auth/permissions.ts`) enforced in server code (Server Actions & Route Handlers) and database policies.
- Database security helper:
  ```sql
  CREATE OR REPLACE FUNCTION public.is_admin(required_roles public.admin_role[] DEFAULT NULL)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS ...
  ```
- **Service Role Isolation:** The Supabase Service Role key is strictly server-only (`import 'server-only'`) and never bundled into client scripts. Every Server Action re-checks the caller's authenticated identity and active role on every invocation.

### 4. Append-Only Immutable Audit Trail (`admin_audit_log`)
- An append-only relational table `admin_audit_log` records every mutation across the platform:
  `id, at, admin_id, action, entity_type, entity_id, before, after, reason, ip_hash, user_agent`.
- Immutability enforced by both Row Level Security and a PostgreSQL trigger raising an uncatchable exception on `UPDATE` or `DELETE`.
- Mutations on sensitive entities (kill switches, bans, price updates, admin role changes) strictly require a non-empty `reason`.
- IP addresses are pseudonymized using SHA-256 (`ip_hash`). Sensitive credentials, tokens, or personal identifiers are strictly redacted before serialization.

### 5. Safe First Admin Bootstrap & Secret Leakage Prevention
- Administrative bootstrap is handled via `scripts/create-first-admin.ts`, reading credentials interactively or via ephemeral environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- Password policy enforces minimum 14 characters, character complexity, and denial of top common passwords.
- No passwords, tokens, or secrets are ever committed, logged, or printed.
- Automated secret scanning (`scripts/check-secrets-leakage.mjs`) is integrated into CI to prevent token leaks.

### 6. User Interface Architecture
- UI philosophy: English administrative labels with Bengali operational data values.
- Built with Tailwind CSS v4, accessible UI components (dialogs, tables, forms, badges), responsive sidebar navigation, and full light/dark theme support.
- TanStack Table for high-density filtering and pagination of zones, reports, audit logs, and abuse telemetry.

## Consequences

- **Positive:**
  - Complete isolation between public citizen traffic and internal operational tools.
  - Zero risk of public search engines indexing internal admin consoles.
  - Resilient defense-in-depth: AAL2 TOTP MFA + Upstash rate limiting + session timeouts + PostgreSQL SECURITY DEFINER RLS + append-only audit trail.
  - Non-negotiable citizen privacy preserved: zero raw GPS, zero unhashed device identifiers.
- **Trade-offs:**
  - Operational overhead of maintaining two separate Next.js applications (`web/` and `admin/`).
  - Admins must configure an authenticator app (Google Authenticator, 1Password, etc.) before accessing any operational dashboard.
