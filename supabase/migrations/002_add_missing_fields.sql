-- Add missing fields to existing tables

-- Add folder_id to secrets table
ALTER TABLE secrets ADD COLUMN folder_id UUID REFERENCES credential_folders(id) ON DELETE SET NULL;

-- Add encryption fields to secrets table
ALTER TABLE secrets ADD COLUMN encryption_iv TEXT;
ALTER TABLE secrets ADD COLUMN encryption_salt TEXT;

-- Add encryption fields to api_keys table
ALTER TABLE api_keys ADD COLUMN encryption_iv TEXT;
ALTER TABLE api_keys ADD COLUMN encryption_salt TEXT;

-- Add encryption fields to environment_variables table
ALTER TABLE environment_variables ADD COLUMN encryption_iv TEXT;
ALTER TABLE environment_variables ADD COLUMN encryption_salt TEXT;

-- Create indexes for the new folder_id column
CREATE INDEX idx_secrets_folder_id ON secrets(folder_id);

-- Update the create_default_credential_folders function to be callable as RPC
CREATE OR REPLACE FUNCTION create_default_credential_folders(user_id UUID)
RETURNS VOID AS $$
DECLARE
    development_folder_id UUID;
    staging_folder_id UUID;
    production_folder_id UUID;
BEGIN
    -- Create main environment folders
    INSERT INTO credential_folders (user_id, name, description)
    VALUES (user_id, 'Development', 'Development environment credentials')
    RETURNING id INTO development_folder_id;
    
    INSERT INTO credential_folders (user_id, name, description)
    VALUES (user_id, 'Staging', 'Staging environment credentials')
    RETURNING id INTO staging_folder_id;
    
    INSERT INTO credential_folders (user_id, name, description)
    VALUES (user_id, 'Production', 'Production environment credentials')
    RETURNING id INTO production_folder_id;
    
    -- Create service-specific subfolders for each environment
    INSERT INTO credential_folders (user_id, name, description, parent_id)
    VALUES 
        (user_id, 'Database', 'Database connection credentials', development_folder_id),
        (user_id, 'API Services', 'Third-party API credentials', development_folder_id),
        (user_id, 'Authentication', 'Authentication service credentials', development_folder_id),
        (user_id, 'Storage', 'Cloud storage credentials', development_folder_id),
        
        (user_id, 'Database', 'Database connection credentials', staging_folder_id),
        (user_id, 'API Services', 'Third-party API credentials', staging_folder_id),
        (user_id, 'Authentication', 'Authentication service credentials', staging_folder_id),
        (user_id, 'Storage', 'Cloud storage credentials', staging_folder_id),
        
        (user_id, 'Database', 'Database connection credentials', production_folder_id),
        (user_id, 'API Services', 'Third-party API credentials', production_folder_id),
        (user_id, 'Authentication', 'Authentication service credentials', production_folder_id),
        (user_id, 'Storage', 'Cloud storage credentials', production_folder_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;