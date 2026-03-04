-- Fix RLS policies for custom_users table to allow auth middleware to read roles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.custom_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.custom_users;

-- Create new policies that allow reading role for auth purposes
CREATE POLICY "Users can view own profile" ON public.custom_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can view all users" ON public.custom_users
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Users can update own profile" ON public.custom_users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can update all users" ON public.custom_users
  FOR UPDATE USING (auth.role() = 'service_role');

-- Ensure RLS is enabled
ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;
