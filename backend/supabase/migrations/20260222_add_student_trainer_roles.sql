-- Add student and trainer roles to custom_users table
-- This migration updates the role constraint to include new user types

-- First, drop the existing check constraint
ALTER TABLE custom_users DROP CONSTRAINT IF EXISTS custom_users_role_check;

-- Add the updated constraint with student and trainer roles
ALTER TABLE custom_users 
ADD CONSTRAINT custom_users_role_check 
CHECK (role IN ('user', 'admin', 'student', 'trainer'));

-- Create an index on role for better performance
CREATE INDEX IF NOT EXISTS idx_custom_users_role ON custom_users(role);
