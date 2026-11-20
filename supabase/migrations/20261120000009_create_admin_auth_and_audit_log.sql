-- ==============================================================================
-- Halchal Migration: 20261120000009_create_admin_auth_and_audit_log.sql
-- Architecture: ADR-0018 (Halchal Admin Panel Architecture)
--
-- Features:
-- 1. admin_role enum ('owner', 'moderator', 'content_editor', 'analyst')
-- 2. admin_users table with pre-provisioned Google OAuth owners
-- 3. is_admin(admin_role[]) SECURITY DEFINER helper function with search_path = ''
-- 4. admin_audit_log append-only table with trigger prohibiting UPDATE/DELETE
-- 5. Strict Row Level Security (RLS) policies denying anon and non-admins
-- ==============================================================================

-- 1. Create admin_role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE public.admin_role AS ENUM ('owner', 'moderator', 'content_editor', 'analyst');
    END IF;
END $$;

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    role public.admin_role NOT NULL DEFAULT 'analyst',
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
);

-- Index for fast user_id and active status lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_active_role ON public.admin_users (user_id, is_active, role);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users (email);

-- Pre-seed designated Google OAuth Owners
INSERT INTO public.admin_users (email, role, is_active)
VALUES 
    ('niyamulhasanbd@gmail.com', 'owner'::public.admin_role, true),
    ('niyamulhasan1089@gmail.com', 'owner'::public.admin_role, true)
ON CONFLICT (email) DO UPDATE SET 
    role = 'owner'::public.admin_role,
    is_active = true;

-- 3. Last Active Owner Protection Trigger
CREATE OR REPLACE FUNCTION public.check_last_active_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    active_owner_count integer;
BEGIN
    -- Detect if an active owner is being deleted, deactivated, or demoted
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner' AND OLD.is_active = true) OR
       (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND OLD.is_active = true AND (NEW.is_active = false OR NEW.role <> 'owner')) THEN
        
        SELECT count(*) INTO active_owner_count
        FROM public.admin_users
        WHERE role = 'owner' AND is_active = true AND id <> OLD.id;

        IF active_owner_count < 1 THEN
            RAISE EXCEPTION 'Cannot delete or deactivate the last remaining active owner';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_active_owner ON public.admin_users;
CREATE TRIGGER trg_protect_last_active_owner
BEFORE UPDATE OR DELETE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.check_last_active_owner();

-- 4. SECURITY DEFINER is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin(required_roles public.admin_role[] DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    current_user_id uuid;
    admin_record RECORD;
BEGIN
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;

    SELECT role, is_active INTO admin_record
    FROM public.admin_users
    WHERE user_id = current_user_id;

    IF NOT FOUND OR NOT admin_record.is_active THEN
        RETURN false;
    END IF;

    IF required_roles IS NULL OR array_length(required_roles, 1) IS NULL THEN
        RETURN true;
    END IF;

    RETURN admin_record.role = ANY(required_roles);
END;
$$;

-- Grant execution to authenticated users (function internally checks auth.uid() against admin_users)
GRANT EXECUTE ON FUNCTION public.is_admin(public.admin_role[]) TO authenticated, service_role;

-- 5. Create append-only admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    at timestamptz NOT NULL DEFAULT now(),
    admin_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    before jsonb,
    after jsonb,
    reason text,
    ip_hash text,
    user_agent text
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_at ON public.admin_audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON public.admin_audit_log (entity_type, entity_id);

-- 6. Trigger to strictly enforce append-only immutability on admin_audit_log
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'admin_audit_log is append-only: updates and deletes are prohibited';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON public.admin_audit_log;
CREATE TRIGGER trg_prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON public.admin_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies on admin_users
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Owners can insert admin users" ON public.admin_users;
CREATE POLICY "Owners can insert admin users"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(ARRAY['owner']::public.admin_role[]));

DROP POLICY IF EXISTS "Owners can update admin users" ON public.admin_users;
CREATE POLICY "Owners can update admin users"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.is_admin(ARRAY['owner']::public.admin_role[]))
WITH CHECK (public.is_admin(ARRAY['owner']::public.admin_role[]));

DROP POLICY IF EXISTS "Owners can delete admin users" ON public.admin_users;
CREATE POLICY "Owners can delete admin users"
ON public.admin_users
FOR DELETE
TO authenticated
USING (public.is_admin(ARRAY['owner']::public.admin_role[]));

-- 9. RLS Policies on admin_audit_log
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());
