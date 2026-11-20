import { test, expect } from '@playwright/test';

test.describe('Admin Panel Security & Authentication Guardrails', () => {
  test('disallows search engine indexing via robots.txt and security headers', async ({ request, page }) => {
    // 1. Verify robots.txt blocks all crawlers
    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.status()).toBe(200);
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain('User-agent: *');
    expect(robotsText).toContain('Disallow: /');

    // 2. Verify security headers on login page
    const loginRes = await page.goto('/login');
    expect(loginRes).not.toBeNull();
    const headers = loginRes!.headers();

    expect(headers['x-robots-tag']).toContain('noindex');
    expect(headers['x-robots-tag']).toContain('nofollow');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  test('redirects unauthenticated requests from dashboard routes to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/admins');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/audit-log');
    await expect(page).toHaveURL(/\/login/);
  });

  test('renders login interface with Bengali disclaimer and handles failed login gracefully', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('Halchal Operations Panel');
    await expect(page.locator('text=হালচাল অভ্যন্তরীণ প্রশাসন ও নজরদারি পোর্টাল')).toBeVisible();

    const emailInput = page.locator('#admin-email');
    const passwordInput = page.locator('#admin-password');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Attempt invalid credentials
    await emailInput.fill('invalid-operator@halchal.bd');
    await passwordInput.fill('InvalidPassword123!@#');
    await submitBtn.click();

    // Generic error message should appear
    const alert = page.locator('#auth-error-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Invalid email or password');
  });

  test('rejects mutations on protected API endpoints when unauthenticated', async ({ request }) => {
    // 1. Invite admin without session
    const inviteRes = await request.post('/api/admins', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: 'test@halchal.bd',
        role: 'moderator',
        reason: 'Attempt unauthorized invite',
      },
    });
    expect(inviteRes.status()).toBe(401);

    // 2. Audit log export without session
    const exportRes = await request.get('/api/audit-log?format=csv');
    expect(exportRes.status()).toBe(401);

    // 3. Reset MFA without session
    const resetRes = await request.post('/api/admins/reset-mfa', {
      data: {
        userId: '11111111-1111-1111-1111-111111111111',
        reason: 'Attempt reset',
      },
    });
    expect(resetRes.status()).toBe(401);
  });
});
