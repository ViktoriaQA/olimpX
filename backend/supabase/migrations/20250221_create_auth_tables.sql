-- Create custom users table for JWT authentication (separate from Supabase auth.users)
CREATE TABLE IF NOT EXISTS custom_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  country_code TEXT,
  password_hash TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'student', 'trainer')),
  is_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  email_verification_token TEXT,
  verification_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_sessions table for JWT session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create sms_verification_codes table
CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_users_email ON custom_users(email);
CREATE INDEX IF NOT EXISTS idx_custom_users_phone ON custom_users(phone);
CREATE INDEX IF NOT EXISTS idx_custom_users_email_verification_token ON custom_users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_phone ON sms_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_expires_at ON sms_verification_codes(expires_at);

-- Enable RLS
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON custom_users;
DROP POLICY IF EXISTS "Users can update own profile" ON custom_users;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role full access to sms codes" ON sms_verification_codes;

-- RLS policies for custom_users table
CREATE POLICY "Users can view own profile" ON custom_users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON custom_users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS policies for user_sessions table
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions" ON user_sessions
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS policies for sms_verification_codes table
CREATE POLICY "Service role full access to sms codes" ON sms_verification_codes
  FOR ALL USING (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_custom_users_updated_at ON custom_users;
CREATE TRIGGER update_custom_users_updated_at 
  BEFORE UPDATE ON custom_users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_custom_users_updated_at();

-- Function to clean up expired sessions and verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS void AS $$
BEGIN
  -- Delete expired sessions
  DELETE FROM user_sessions WHERE expires_at < now();
  
  -- Delete expired SMS verification codes
  DELETE FROM sms_verification_codes WHERE expires_at < now();
  
  -- Delete expired email verification tokens
  UPDATE custom_users 
  SET email_verification_token = NULL, 
      verification_token_expires_at = NULL 
  WHERE verification_token_expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Insert a default admin user (password: Admin123!)
INSERT INTO custom_users (email, first_name, last_name, password_hash, role, is_verified, phone_verified)
VALUES (
  'admin@codearena.com',
  'Admin',
  'User',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvOe', -- Admin123!
  'admin',
  true,
  true
) ON CONFLICT (email) DO NOTHING;
