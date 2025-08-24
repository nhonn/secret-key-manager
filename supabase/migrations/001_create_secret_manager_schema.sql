-- Create tables for Secret Key Manager

-- Secrets table
CREATE TABLE secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credential folders table
CREATE TABLE credential_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES credential_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES credential_folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL,
    service VARCHAR(255),
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Environment variables table
CREATE TABLE environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES credential_folders(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    environment VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access logs table
CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_secrets_user_id ON secrets(user_id);
CREATE INDEX idx_secrets_expires_at ON secrets(expires_at);
CREATE INDEX idx_credential_folders_user_id ON credential_folders(user_id);
CREATE INDEX idx_credential_folders_parent_id ON credential_folders(parent_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_folder_id ON api_keys(folder_id);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_environment_variables_user_id ON environment_variables(user_id);
CREATE INDEX idx_environment_variables_folder_id ON environment_variables(folder_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- Enable Row Level Security
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secrets table
CREATE POLICY "Users can view their own secrets" ON secrets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own secrets" ON secrets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own secrets" ON secrets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own secrets" ON secrets
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for credential_folders table
CREATE POLICY "Users can view their own credential folders" ON credential_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credential folders" ON credential_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credential folders" ON credential_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credential folders" ON credential_folders
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for api_keys table
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for environment_variables table
CREATE POLICY "Users can view their own environment variables" ON environment_variables
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own environment variables" ON environment_variables
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own environment variables" ON environment_variables
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own environment variables" ON environment_variables
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for access_logs table
CREATE POLICY "Users can view their own access logs" ON access_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access logs" ON access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Database functions

-- Function to increment access count
CREATE OR REPLACE FUNCTION increment_access_count(table_name TEXT, record_id UUID)
RETURNS VOID AS $$
BEGIN
    IF table_name = 'secrets' THEN
        UPDATE secrets SET access_count = access_count + 1 WHERE id = record_id;
    ELSIF table_name = 'api_keys' THEN
        UPDATE api_keys SET access_count = access_count + 1 WHERE id = record_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired items
CREATE OR REPLACE FUNCTION cleanup_expired_items()
RETURNS VOID AS $$
BEGIN
    DELETE FROM secrets WHERE expires_at IS NOT NULL AND expires_at < NOW();
    DELETE FROM api_keys WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default credential folders for new users
CREATE OR REPLACE FUNCTION create_default_credential_folders()
RETURNS TRIGGER AS $$
DECLARE
    development_folder_id UUID;
    staging_folder_id UUID;
    production_folder_id UUID;
BEGIN
    -- Create main environment folders
    INSERT INTO credential_folders (user_id, name, description)
    VALUES (NEW.id, 'Development', 'Development environment credentials')
    RETURNING id INTO development_folder_id;
    
    INSERT INTO credential_folders (user_id, name, description)
    VALUES (NEW.id, 'Staging', 'Staging environment credentials')
    RETURNING id INTO staging_folder_id;
    
    INSERT INTO credential_folders (user_id, name, description)
    VALUES (NEW.id, 'Production', 'Production environment credentials')
    RETURNING id INTO production_folder_id;
    
    -- Create service-specific subfolders for each environment
    INSERT INTO credential_folders (user_id, name, description, parent_id)
    VALUES 
        (NEW.id, 'Database', 'Database connection credentials', development_folder_id),
        (NEW.id, 'API Services', 'Third-party API credentials', development_folder_id),
        (NEW.id, 'Authentication', 'Authentication service credentials', development_folder_id),
        (NEW.id, 'Storage', 'Cloud storage credentials', development_folder_id),
        
        (NEW.id, 'Database', 'Database connection credentials', staging_folder_id),
        (NEW.id, 'API Services', 'Third-party API credentials', staging_folder_id),
        (NEW.id, 'Authentication', 'Authentication service credentials', staging_folder_id),
        (NEW.id, 'Storage', 'Cloud storage credentials', staging_folder_id),
        
        (NEW.id, 'Database', 'Database connection credentials', production_folder_id),
        (NEW.id, 'API Services', 'Third-party API credentials', production_folder_id),
        (NEW.id, 'Authentication', 'Authentication service credentials', production_folder_id),
        (NEW.id, 'Storage', 'Cloud storage credentials', production_folder_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default folders for new users
CREATE TRIGGER create_default_folders_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_credential_folders();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON secrets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credential_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON environment_variables TO authenticated;
GRANT SELECT, INSERT ON access_logs TO authenticated;

-- Grant permissions to anon role for public access (if needed)
GRANT SELECT ON secrets TO anon;
GRANT SELECT ON credential_folders TO anon;
GRANT SELECT ON api_keys TO anon;
GRANT SELECT ON environment_variables TO anon;
GRANT SELECT ON access_logs TO anon;