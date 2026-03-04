-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  max_participants INTEGER,
  is_public BOOLEAN DEFAULT true,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  rules TEXT,
  created_by UUID NOT NULL REFERENCES custom_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tournament_tasks table
CREATE TABLE IF NOT EXISTS tournament_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT,
  points INTEGER DEFAULT 100,
  order_index INTEGER NOT NULL,
  time_limit_minutes INTEGER DEFAULT 60,
  memory_limit_mb INTEGER DEFAULT 256,
  test_cases JSONB,
  solution_template JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES custom_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tournament_participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'disqualified')),
  UNIQUE(tournament_id, user_id)
);

-- Create task_submissions table
CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tournament_tasks(id) ON DELETE CASCADE,
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

-- Create tournament_results table
CREATE TABLE IF NOT EXISTS tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
  total_score INTEGER DEFAULT 0,
  tasks_solved INTEGER DEFAULT 0,
  tasks_attempted INTEGER DEFAULT 0,
  rank INTEGER,
  completion_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Create general tasks table (for non-tournament tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT,
  points INTEGER DEFAULT 100,
  time_limit_minutes INTEGER DEFAULT 60,
  memory_limit_mb INTEGER DEFAULT 256,
  test_cases JSONB,
  solution_template JSONB,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES custom_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tournament_task_id UUID REFERENCES tournament_tasks(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id),
  UNIQUE(user_id, tournament_task_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_time ON tournaments(start_time);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by);

CREATE INDEX IF NOT EXISTS idx_tournament_tasks_tournament_id ON tournament_tasks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_tasks_difficulty ON tournament_tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_tournament_tasks_category ON tournament_tasks(category);
CREATE INDEX IF NOT EXISTS idx_tournament_tasks_order ON tournament_tasks(tournament_id, order_index);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON tournament_participants(status);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_tournament_id ON task_submissions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submitted_at ON task_submissions(submitted_at);

CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_user_id ON tournament_results(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_rank ON tournament_results(tournament_id, rank);

CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_is_public ON tasks(is_public);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_task_id ON user_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_tournament_task_id ON user_progress(tournament_task_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Anyone can view public tournaments" ON tournaments
  FOR SELECT USING (is_public = true);

CREATE POLICY "Trainers and admins can create tournaments" ON tournaments
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('trainer', 'admin'));

CREATE POLICY "Tournament creators can update their tournaments" ON tournaments
  FOR UPDATE USING (created_by = (auth.jwt() ->> 'user_id')::uuid OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Trainers and admins can view all tournaments" ON tournaments
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('trainer', 'admin'));

-- RLS Policies for tournament_tasks
CREATE POLICY "Anyone can view tasks from tournaments they can access" ON tournament_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_tasks.tournament_id 
      AND (tournaments.is_public = true OR auth.jwt() ->> 'role' IN ('trainer', 'admin'))
    )
  );

CREATE POLICY "Tournament creators can manage tasks" ON tournament_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_tasks.tournament_id 
      AND (tournaments.created_by = (auth.jwt() ->> 'user_id')::uuid OR auth.jwt() ->> 'role' = 'admin')
    )
  );

-- RLS Policies for tournament_participants
CREATE POLICY "Users can view tournament participants" ON tournament_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_participants.tournament_id 
      AND (tournaments.is_public = true OR auth.jwt() ->> 'role' IN ('trainer', 'admin'))
    )
  );

CREATE POLICY "Users can join tournaments" ON tournament_participants
  FOR INSERT WITH CHECK (
    user_id = (auth.jwt() ->> 'user_id')::uuid AND
    auth.jwt() ->> 'role' = 'student'
  );

CREATE POLICY "Tournament creators can manage participants" ON tournament_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_participants.tournament_id 
      AND (tournaments.created_by = (auth.jwt() ->> 'user_id')::uuid OR auth.jwt() ->> 'role' = 'admin')
    )
  );

-- RLS Policies for task_submissions
CREATE POLICY "Users can view their own submissions" ON task_submissions
  FOR SELECT USING (user_id = (auth.jwt() ->> 'user_id')::uuid);

CREATE POLICY "Users can create submissions" ON task_submissions
  FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'user_id')::uuid);

CREATE POLICY "Trainers and admins can view all submissions" ON task_submissions
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('trainer', 'admin'));

-- RLS Policies for tournament_results
CREATE POLICY "Anyone can view tournament results" ON tournament_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_results.tournament_id 
      AND (tournaments.is_public = true OR auth.jwt() ->> 'role' IN ('trainer', 'admin'))
    )
  );

CREATE POLICY "System can manage results" ON tournament_results
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for tasks
CREATE POLICY "Anyone can view public tasks" ON tasks
  FOR SELECT USING (is_public = true);

CREATE POLICY "Task creators can manage their tasks" ON tasks
  FOR ALL USING (created_by = (auth.jwt() ->> 'user_id')::uuid OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Trainers and admins can view all tasks" ON tasks
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('trainer', 'admin'));

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (user_id = (auth.jwt() ->> 'user_id')::uuid);

CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (user_id = (auth.jwt() ->> 'user_id')::uuid);

CREATE POLICY "System can manage progress" ON user_progress
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tournaments_timestamp
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_tournament_tasks_timestamp
  BEFORE UPDATE ON tournament_tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_user_progress_timestamp
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_tournament_results_timestamp
  BEFORE UPDATE ON tournament_results
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_tasks_timestamp
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
