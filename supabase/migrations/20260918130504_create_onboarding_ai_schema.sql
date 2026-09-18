/*
# OnboardAI Agentic Platform Schema

## Overview
Creates the complete database schema for an agentic AI onboarding platform.
This is a single-tenant demo app with no auth — all policies allow anon + authenticated access.

## New Tables

1. **users** — Demo user profiles (name, role, department, onboarding progress)
2. **documents** — Organizational knowledge documents (uploaded by admin)
3. **document_chunks** — Text chunks extracted from documents, with embedding vectors for RAG
4. **onboarding_tasks** — Per-user onboarding tasks with status state machine
5. **access_requests** — Access requests created by the workflow agent
6. **contacts** — NovaTech organizational directory contacts
7. **agent_activity** — Execution events logged by the agent orchestrator

## Security
- RLS enabled on all tables
- All policies use `TO anon, authenticated` since this is a no-auth demo app
- Data is intentionally shared/public for demo purposes
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  department text NOT NULL,
  avatar text NOT NULL DEFAULT '',
  start_date text NOT NULL DEFAULT '',
  progress int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

-- 2. Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'TXT',
  size text NOT NULL DEFAULT '',
  upload_date text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'indexed',
  sections int NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE TO anon, authenticated USING (true);

-- 3. Document chunks table (with vector embedding)
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  section_label text NOT NULL DEFAULT '',
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_document_chunks" ON document_chunks;
CREATE POLICY "anon_select_document_chunks" ON document_chunks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_document_chunks" ON document_chunks;
CREATE POLICY "anon_insert_document_chunks" ON document_chunks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_document_chunks" ON document_chunks;
CREATE POLICY "anon_delete_document_chunks" ON document_chunks FOR DELETE TO anon, authenticated USING (true);

-- 4. Onboarding tasks table
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'FileText',
  status text NOT NULL DEFAULT 'pending',
  task_order int NOT NULL DEFAULT 0,
  link text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_user_id ON onboarding_tasks(user_id);

ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_onboarding_tasks" ON onboarding_tasks;
CREATE POLICY "anon_select_onboarding_tasks" ON onboarding_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_onboarding_tasks" ON onboarding_tasks;
CREATE POLICY "anon_insert_onboarding_tasks" ON onboarding_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_onboarding_tasks" ON onboarding_tasks;
CREATE POLICY "anon_update_onboarding_tasks" ON onboarding_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_onboarding_tasks" ON onboarding_tasks;
CREATE POLICY "anon_delete_onboarding_tasks" ON onboarding_tasks FOR DELETE TO anon, authenticated USING (true);

-- 5. Access requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource text NOT NULL,
  approver text NOT NULL DEFAULT '',
  approver_role text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_access_requests" ON access_requests;
CREATE POLICY "anon_select_access_requests" ON access_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_access_requests" ON access_requests;
CREATE POLICY "anon_insert_access_requests" ON access_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_access_requests" ON access_requests;
CREATE POLICY "anon_update_access_requests" ON access_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  handles_issue text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_contacts" ON contacts;
CREATE POLICY "anon_select_contacts" ON contacts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contacts" ON contacts;
CREATE POLICY "anon_insert_contacts" ON contacts FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 7. Agent activity table
CREATE TABLE IF NOT EXISTS agent_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  icon text NOT NULL DEFAULT 'Activity',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  timestamp text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'completed',
  tool text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  event_type text NOT NULL DEFAULT 'TOOL_EXECUTED',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_user_id ON agent_activity(user_id);

ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_agent_activity" ON agent_activity;
CREATE POLICY "anon_select_agent_activity" ON agent_activity FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_agent_activity" ON agent_activity;
CREATE POLICY "anon_insert_agent_activity" ON agent_activity FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_agent_activity" ON agent_activity;
CREATE POLICY "anon_delete_agent_activity" ON agent_activity FOR DELETE TO anon, authenticated USING (true);
