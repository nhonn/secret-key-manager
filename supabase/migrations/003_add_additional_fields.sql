-- Add missing fields to secrets table
ALTER TABLE secrets ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE secrets ADD COLUMN IF NOT EXISTS username TEXT;

-- Add color field to credential_folders table
ALTER TABLE credential_folders ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- Create delete_user_data function for Settings page
CREATE OR REPLACE FUNCTION delete_user_data(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user's data in order (respecting foreign key constraints)
  DELETE FROM access_logs WHERE user_id = user_uuid;
  DELETE FROM environment_variables WHERE user_id = user_uuid;
  DELETE FROM api_keys WHERE user_id = user_uuid;
  DELETE FROM secrets WHERE user_id = user_uuid;
  DELETE FROM credential_folders WHERE user_id = user_uuid;
  
  -- Note: We don't delete from auth.users as that's handled by Supabase Auth
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO authenticated;