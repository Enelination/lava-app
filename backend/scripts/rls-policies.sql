-- LAVA Row Level Security migration.
--
-- BEFORE running this: set SUPABASE_SERVICE_ROLE_KEY in your environment (Render/env).
-- The backend prefers SUPABASE_SERVICE_ROLE_KEY (service_role bypasses RLS), so this script
-- locks the database down: the anon/authenticated roles are revoked entirely, meaning even a
-- leaked anon key cannot read or write any table.
--
-- Run this whole file once in the Supabase SQL editor (after init-supabase.sql and
-- audit-and-notifications.sql).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['users','submissions','knowledge_base','settings','chat_messages','audit_logs','notifications'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Only the service_role (server-side) may touch the data. Anonymous/authenticated clients get nothing.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Belt-and-braces: explicitly empty policies for anon/authenticated in case grants are ever re-added.
CREATE POLICY "no anon access" ON public.users FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "no anon access" ON public.submissions FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "no anon access" ON public.knowledge_base FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "no anon access" ON public.settings FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "no anon access" ON public.chat_messages FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "no anon access" ON public.audit_logs FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "no anon access" ON public.notifications FOR ALL TO anon USING (false) WITH CHECK (false);

-- Sanity check: confirm RLS is on.
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users','submissions','knowledge_base','settings','chat_messages','audit_logs','notifications')
  AND rowsecurity = true;
