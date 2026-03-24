-- Migration: Create cascade delete function for users
-- This function safely deletes a user and all their related data

-- Create function to delete user and all related data
CREATE OR REPLACE FUNCTION delete_user_cascade(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Log the deletion
  INSERT INTO system_logs (action, details, user_id)
  VALUES ('user_deleted', json_build_object('deleted_user_id', target_user_id), target_user_id);

  -- Delete from tables with CASCADE constraints (these will be deleted automatically)
  -- user_sessions, user_progress, tournament_participants, task_submissions, 
  -- tournament_results, payment_attempts, user_subscriptions, receipts, 
  -- recurring_subscriptions, user_roles

  -- Handle tables without CASCADE that need special attention
  
  -- Update tasks created by this user to remove creator reference
  UPDATE tasks 
  SET created_by = NULL 
  WHERE created_by = target_user_id;

  -- Update tournament_tasks created by this user to remove creator reference  
  UPDATE tournament_tasks 
  SET created_by = NULL 
  WHERE created_by = target_user_id;

  -- Update tournaments created by this user to remove creator reference
  UPDATE tournaments 
  SET created_by = NULL 
  WHERE created_by = target_user_id;

  -- Finally delete the user
  DELETE FROM custom_users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION delete_user_cascade TO service_role;
