-- Remove user_roles table and related dependencies

-- Drop policies that depend on has_role function first
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;

-- Drop the has_role function
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- Drop all RLS policies for user_roles table (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
        DROP POLICY IF EXISTS "Users can insert own role during onboarding" ON public.user_roles;
        DROP POLICY IF EXISTS "Allow role creation on signup" ON public.user_roles;
        DROP POLICY IF EXISTS "Service role full access to user_roles" ON public.user_roles;
        
        -- Drop the user_roles table
        DROP TABLE IF EXISTS public.user_roles;
    END IF;
END $$;

-- Remove app_role enum (if no longer used)
-- Note: This will fail if other tables still use it, so we'll keep it for now
-- DROP TYPE IF EXISTS public.app_role;

-- Update RLS policies that used has_role function
-- These policies should now check custom_users.role directly

-- Update tournaments policies
DROP POLICY IF EXISTS "Trainers and admins can create tournaments" ON public.tournaments;
CREATE POLICY "Trainers and admins can create tournaments" ON public.tournaments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE custom_users.id = auth.uid() 
      AND custom_users.role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainers and admins can view all tournaments" ON public.tournaments;
CREATE POLICY "Trainers and admins can view all tournaments" ON public.tournaments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE custom_users.id = auth.uid() 
      AND custom_users.role IN ('trainer', 'admin')
    )
  );

-- Update tournament_tasks policies
DROP POLICY IF EXISTS "Anyone can view tasks from tournaments they can access" ON public.tournament_tasks;
CREATE POLICY "Anyone can view tasks from tournaments they can access" ON public.tournament_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_tasks.tournament_id 
      AND (
        tournaments.is_public = true 
        OR EXISTS (
          SELECT 1 FROM public.custom_users 
          WHERE custom_users.id = auth.uid() 
          AND custom_users.role IN ('trainer', 'admin')
        )
      )
    )
  );

-- Update tournament_participants policies
DROP POLICY IF EXISTS "Anyone can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Anyone can view tournament participants" ON public.tournament_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_participants.tournament_id 
      AND (
        tournaments.is_public = true 
        OR EXISTS (
          SELECT 1 FROM public.custom_users 
          WHERE custom_users.id = auth.uid() 
          AND custom_users.role IN ('trainer', 'admin')
        )
      )
    )
  );

-- Update task_submissions policies
DROP POLICY IF EXISTS "Trainers and admins can view all submissions" ON public.task_submissions;
CREATE POLICY "Trainers and admins can view all submissions" ON public.task_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE custom_users.id = auth.uid() 
      AND custom_users.role IN ('trainer', 'admin')
    )
  );

-- Update tournament_results policies
DROP POLICY IF EXISTS "Anyone can view tournament results" ON public.tournament_results;
CREATE POLICY "Anyone can view tournament results" ON public.tournament_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_results.tournament_id 
      AND (
        tournaments.is_public = true 
        OR EXISTS (
          SELECT 1 FROM public.custom_users 
          WHERE custom_users.id = auth.uid() 
          AND custom_users.role IN ('trainer', 'admin')
        )
      )
    )
  );

-- Update tasks policies
DROP POLICY IF EXISTS "Trainers and admins can view all tasks" ON public.tasks;
CREATE POLICY "Trainers and admins can view all tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE custom_users.id = auth.uid() 
      AND custom_users.role IN ('trainer', 'admin')
    )
  );

-- Recreate subscription_plans policy without has_role function
CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE custom_users.id = auth.uid() 
      AND custom_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE custom_users.id = auth.uid() 
      AND custom_users.role = 'admin'
    )
  );
