-- Create system_logs table for audit and monitoring
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES custom_users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can view all logs" ON system_logs;
DROP POLICY IF EXISTS "Service role full access to system logs" ON system_logs;

-- RLS policies for system_logs table
CREATE POLICY "Admin can view all logs" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM custom_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role full access to system logs" ON system_logs
  FOR ALL USING (auth.role() = 'service_role');
