-- Audit trail + in-app notifications.
-- Run this whole file once in the Supabase SQL editor (after init-supabase.sql).

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id text,
  actor_name text,
  action text NOT NULL,
  target_type text DEFAULT 'submission',
  target_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at desc);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  message text NOT NULL,
  target_id text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at desc);
