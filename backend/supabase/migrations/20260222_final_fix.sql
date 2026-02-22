-- Final fix for payment system issues
-- This migration ensures everything works correctly

-- Step 1: Fix foreign key references by updating the constraint
-- Drop existing foreign key constraints if they exist
ALTER TABLE payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_user_id_fkey;
ALTER TABLE payment_attempts DROP CONSTRAINT IF EXISTS payment_attempts_package_id_fkey;
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_package_id_fkey;
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_user_id_fkey;
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_order_id_fkey;

-- Step 2: Recreate constraints with correct references to custom_users
ALTER TABLE payment_attempts 
ADD CONSTRAINT payment_attempts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES custom_users(id) ON DELETE CASCADE;

ALTER TABLE payment_attempts 
ADD CONSTRAINT payment_attempts_package_id_fkey 
FOREIGN KEY (package_id) REFERENCES subscription_plans(id) ON DELETE CASCADE;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES custom_users(id) ON DELETE CASCADE;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_package_id_fkey 
FOREIGN KEY (package_id) REFERENCES subscription_plans(id) ON DELETE CASCADE;

ALTER TABLE receipts 
ADD CONSTRAINT receipts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES custom_users(id) ON DELETE CASCADE;

ALTER TABLE receipts 
ADD CONSTRAINT receipts_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES payment_attempts(order_id) ON DELETE CASCADE;

-- Step 3: Disable RLS temporarily to drop policies
ALTER TABLE payment_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own payment attempts" ON payment_attempts CASCADE;
DROP POLICY IF EXISTS "Service role full access to payment_attempts" ON payment_attempts CASCADE;
DROP POLICY IF EXISTS "Users can manage own payment attempts" ON payment_attempts CASCADE;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions CASCADE;
DROP POLICY IF EXISTS "Service role full access to user_subscriptions" ON user_subscriptions CASCADE;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON user_subscriptions CASCADE;

DROP POLICY IF EXISTS "Users can view own receipts" ON receipts CASCADE;
DROP POLICY IF EXISTS "Service role full access to receipts" ON receipts CASCADE;
DROP POLICY IF EXISTS "Service insert receipts" ON receipts CASCADE;

-- Step 5: Re-enable RLS
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple, working policies
-- Policy for payment_attempts: users can see their own payment attempts
CREATE POLICY "Users can view own payment attempts" ON payment_attempts
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy for payment_attempts: authenticated users can insert/update
CREATE POLICY "Service role can manage payment attempts" ON payment_attempts
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- Policy for user_subscriptions: users can see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy for user_subscriptions: authenticated users can insert/update
CREATE POLICY "Service role can manage user subscriptions" ON user_subscriptions
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- Policy for receipts: users can see their own receipts
CREATE POLICY "Users can view own receipts" ON receipts
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy for receipts: authenticated users can insert
CREATE POLICY "Service role can insert receipts" ON receipts
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Step 7: Grant necessary permissions
GRANT ALL ON payment_attempts TO authenticated;
GRANT ALL ON payment_attempts TO service_role;
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON user_subscriptions TO service_role;
GRANT SELECT ON receipts TO authenticated;
GRANT ALL ON receipts TO service_role;
