-- Fix task_submissions table to support both tournament_tasks and regular tasks
-- First, create a backup of existing data
CREATE TABLE IF NOT EXISTS task_submissions_backup AS 
SELECT * FROM task_submissions;

-- Drop the existing table
DROP TABLE IF EXISTS task_submissions;

-- Recreate task_submissions with proper foreign key constraints
CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'error')),
  test_results JSONB,
  score INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  memory_used_mb INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  evaluated_at TIMESTAMPTZ
);

-- Restore data from backup
INSERT INTO task_submissions 
SELECT * FROM task_submissions_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_tournament_id ON task_submissions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submitted_at ON task_submissions(submitted_at);

-- Enable RLS
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

-- Recreate RLS Policies
DROP POLICY IF EXISTS "Users can view their own submissions" ON task_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON task_submissions;
DROP POLICY IF EXISTS "Trainers and admins can view all submissions" ON task_submissions;

CREATE POLICY "Users can view their own submissions" ON task_submissions
  FOR SELECT USING (user_id = (auth.jwt() ->> 'user_id')::uuid);

CREATE POLICY "Users can create submissions" ON task_submissions
  FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'user_id')::uuid);

CREATE POLICY "Trainers and admins can view all submissions" ON task_submissions
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('trainer', 'admin'));

-- Clean up backup table (optional, comment out if you want to keep it)
-- DROP TABLE IF EXISTS task_submissions_backup;
