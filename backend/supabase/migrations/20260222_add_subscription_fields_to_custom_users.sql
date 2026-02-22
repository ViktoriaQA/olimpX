-- Add subscription fields to custom_users table
-- This migration adds the missing fields for subscription status tracking

ALTER TABLE custom_users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_custom_users_subscription_status ON custom_users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_custom_users_subscription_expires_at ON custom_users(subscription_expires_at);
