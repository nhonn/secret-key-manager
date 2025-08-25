-- Migration: Update create_default_credential_folders function to use projects table
-- This migration updates the function to reference the new projects table name

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS create_default_credential_folders(UUID);

-- Recreate the function with updated table references
CREATE OR REPLACE FUNCTION create_default_projects(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  folder_count INTEGER;
BEGIN
  -- Check if projects already exist for this user
  SELECT COUNT(*)
  FROM projects
  WHERE user_id = target_user_id
  INTO folder_count;

  -- Only create projects if they don't already exist
  IF folder_count = 0 THEN
    -- Create main environment projects
    INSERT INTO projects (user_id, name, description)
    VALUES (target_user_id, 'Development', 'Development environment credentials');

    INSERT INTO projects (user_id, name, description)
    VALUES (target_user_id, 'Staging', 'Staging environment credentials');

    INSERT INTO projects (user_id, name, description)
    VALUES (target_user_id, 'Production', 'Production environment credentials');

  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create default projects for user %: %', target_user_id, SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_projects(UUID) TO authenticated;

-- Also create an alias for backward compatibility
CREATE OR REPLACE FUNCTION create_default_credential_folders(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the new function
  PERFORM create_default_projects(target_user_id);
END;
$$;

-- Grant execute permission for backward compatibility
GRANT EXECUTE ON FUNCTION create_default_credential_folders(UUID) TO authenticated;

COMMIT;