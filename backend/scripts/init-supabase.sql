-- LAVA backend tables. The submissions table already exists (original app data).
-- Run this whole file once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  licence_number text,
  organisation text,
  role text DEFAULT 'public' CHECK (role IN ('public','surveyor','officer','admin')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id text PRIMARY KEY,
  name text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'uploaded' CHECK (type IN ('builtin','uploaded')),
  word_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS user_id text;

CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_region ON public.submissions(region);
