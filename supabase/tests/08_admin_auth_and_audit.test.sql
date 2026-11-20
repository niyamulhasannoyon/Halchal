-- =============================================================================
-- Test File: 08_admin_auth_and_audit.test.sql
-- Description: pgTAP tests for Halchal Admin Panel authentication and audit log:
--              - RLS enabled on admin_users and admin_audit_log.
--              - Anon role CANNOT select, insert, update or delete on admin tables.
--              - Authenticated non-admin CANNOT access admin tables.
--              - is_admin() function returns false for unauthenticated / non-admins.
--              - admin_audit_log is append-only: UPDATE and DELETE are prohibited.
--              - admin_users protects against deleting or deactivating the last active owner.
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(12);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures in auth and public schemas
-- -----------------------------------------------------------------------------
do $$
declare
    v_owner_id uuid := '11111111-1111-1111-1111-111111111111';
    v_moderator_id uuid := '22222222-2222-2222-2222-222222222222';
    v_normal_user_id uuid := '33333333-3333-3333-3333-333333333333';
begin
    -- Ensure test users exist in auth.users
    insert into auth.users (id, email)
    values 
        (v_owner_id, 'owner@halchal.test'),
        (v_moderator_id, 'moderator@halchal.test'),
        (v_normal_user_id, 'citizen@halchal.test')
    on conflict (id) do nothing;

    -- Insert admin records
    insert into public.admin_users (user_id, email, role, is_active)
    values
        (v_owner_id, 'owner@halchal.test', 'owner'::public.admin_role, true),
        (v_moderator_id, 'moderator@halchal.test', 'moderator'::public.admin_role, true)
    on conflict (user_id) do nothing;
end;
$$;

-- Test 1: Verify RLS is enabled on admin_users and admin_audit_log
select ok(
    (select bool_and(relrowsecurity) from pg_class
     where relname in ('admin_users', 'admin_audit_log')
       and relnamespace = 'public'::regnamespace),
    'RLS is enabled on admin_users and admin_audit_log'
);

-- Test 2: Anon role cannot select from admin_users
set local role anon;

select is(
    (select count(*) from public.admin_users),
    0::bigint,
    'Anon role sees 0 rows in admin_users via RLS'
);

-- Test 3: Anon role cannot select from admin_audit_log
select is(
    (select count(*) from public.admin_audit_log),
    0::bigint,
    'Anon role sees 0 rows in admin_audit_log via RLS'
);

-- Test 4: Anon role cannot insert into admin_users
select throws_ok(
    $$ insert into public.admin_users (user_id, email, role) values ('44444444-4444-4444-4444-444444444444', 'hacker@test.com', 'owner') $$,
    '42501',
    NULL,
    'Anon role cannot insert into admin_users'
);

-- Test 5: Switch to authenticated non-admin user
set local role authenticated;
set local "request.jwt.claim.sub" = '33333333-3333-3333-3333-333333333333';

-- Authenticated non-admin is_admin() returns false
select is(
    public.is_admin(),
    false,
    'is_admin() returns false for regular authenticated non-admin citizen'
);

-- Authenticated non-admin sees 0 rows in admin_users
select is(
    (select count(*) from public.admin_users),
    0::bigint,
    'Authenticated non-admin sees 0 rows in admin_users'
);

-- Test 6: Switch to authenticated admin (owner)
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select is(
    public.is_admin(),
    true,
    'is_admin() returns true for authenticated active owner'
);

-- Test 7: Active owner can view admin users
select is(
    (select count(*) >= 2 from public.admin_users),
    true,
    'Active owner can view admin users'
);

-- Test 8: Active owner can insert audit log entry
do $$
begin
    insert into public.admin_audit_log (
        admin_id, action, entity_type, entity_id, before, after, reason, ip_hash
    ) values (
        '11111111-1111-1111-1111-111111111111',
        'ADMIN_INVITE',
        'admin_user',
        '22222222-2222-2222-2222-222222222222',
        null,
        '{"email":"moderator@halchal.test","role":"moderator"}'::jsonb,
        'Initial onboarding of moderator',
        'hash123'
    );
end;
$$;

select is(
    (select count(*) > 0 from public.admin_audit_log where action = 'ADMIN_INVITE'),
    true,
    'Active owner can successfully insert audit log record'
);

-- Test 9: admin_audit_log immutability - UPDATE is prohibited
select throws_matching(
    $$ update public.admin_audit_log set reason = 'tampered reason' where action = 'ADMIN_INVITE' $$,
    'admin_audit_log is append-only',
    'Updating admin_audit_log throws exception due to immutability trigger'
);

-- Test 10: admin_audit_log immutability - DELETE is prohibited
select throws_matching(
    $$ delete from public.admin_audit_log where action = 'ADMIN_INVITE' $$,
    'admin_audit_log is append-only',
    'Deleting from admin_audit_log throws exception due to immutability trigger'
);

-- Test 11: Last active owner protection - cannot deactivate sole active owner
select throws_matching(
    $$ update public.admin_users set is_active = false where user_id = '11111111-1111-1111-1111-111111111111' $$,
    'Cannot delete or deactivate the last remaining active owner',
    'Deactivating last active owner throws exception'
);

-- Test 12: Last active owner protection - cannot demote sole active owner
select throws_matching(
    $$ update public.admin_users set role = 'moderator' where user_id = '11111111-1111-1111-1111-111111111111' $$,
    'Cannot delete or deactivate the last remaining active owner',
    'Demoting last active owner throws exception'
);

rollback;
