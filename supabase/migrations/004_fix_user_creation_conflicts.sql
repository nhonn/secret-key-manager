-- Fix conflicting create_default_credential_folders function definitions
-- This resolves the "Database error while attempting to save new user" OAuth issue

-- Drop the existing trigger that automatically creates folders
DROP TRIGGER IF EXISTS create_default_folders_trigger ON auth.users;

-- Drop the old trigger-based function
DROP FUNCTION IF EXISTS create_default_credential_folders();

-- Drop the existing RPC function with the old parameter name
DROP FUNCTION IF EXISTS create_default_credential_folders(UUID);

-- Create an idempotent RPC function that can be safely called multiple times
CREATE OR REPLACE FUNCTION create_default_credential_folders(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    development_folder_id UUID;
    staging_folder_id UUID;
    production_folder_id UUID;
    folder_count INTEGER;
BEGIN
    -- Check if folders already exist for this user
    SELECT COUNT(*) INTO folder_count
    FROM credential_folders 
    WHERE user_id = target_user_id 
    AND name IN ('Development', 'Staging', 'Production')
    AND parent_id IS NULL;
    
    -- Only create folders if they don't already exist
    IF folder_count = 0 THEN
        -- Create main environment folders
        INSERT INTO credential_folders (user_id, name, description)
        VALUES (target_user_id, 'Development', 'Development environment credentials')
        RETURNING id INTO development_folder_id;
        
        INSERT INTO credential_folders (user_id, name, description)
        VALUES (target_user_id, 'Staging', 'Staging environment credentials')
        RETURNING id INTO staging_folder_id;
        
        INSERT INTO credential_folders (user_id, name, description)
        VALUES (target_user_id, 'Production', 'Production environment credentials')
        RETURNING id INTO production_folder_id;
        
        -- Create service-specific subfolders for each environment
        INSERT INTO credential_folders (user_id, name, description, parent_id)
        VALUES 
            (target_user_id, 'Database', 'Database connection credentials', development_folder_id),
            (target_user_id, 'API Services', 'Third-party API credentials', development_folder_id),
            (target_user_id, 'Authentication', 'Authentication service credentials', development_folder_id),
            (target_user_id, 'Storage', 'Cloud storage credentials', development_folder_id),
            
            (target_user_id, 'Database', 'Database connection credentials', staging_folder_id),
            (target_user_id, 'API Services', 'Third-party API credentials', staging_folder_id),
            (target_user_id, 'Authentication', 'Authentication service credentials', staging_folder_id),
            (target_user_id, 'Storage', 'Cloud storage credentials', staging_folder_id),
            
            (target_user_id, 'Database', 'Database connection credentials', production_folder_id),
            (target_user_id, 'API Services', 'Third-party API credentials', production_folder_id),
            (target_user_id, 'Authentication', 'Authentication service credentials', production_folder_id),
            (target_user_id, 'Storage', 'Cloud storage credentials', production_folder_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the entire operation
        RAISE WARNING 'Failed to create default credential folders for user %: %', target_user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_credential_folders(UUID) TO authenticated;