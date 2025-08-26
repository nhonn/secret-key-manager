-- Forward-Only Database Migration for Secret Key Manager
-- This script creates the complete database schema in its current state
-- No backward compatibility or migration history is maintained

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    parent_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secrets table
CREATE TABLE secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    url TEXT,
    username TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    encryption_iv TEXT,
    encryption_salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    key_value TEXT NOT NULL,
    description TEXT,
    url TEXT,
    tags TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    encryption_iv TEXT,
    encryption_salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Environment Variables table
CREATE TABLE environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    encryption_iv TEXT,
    encryption_salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access Logs table
CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Projects indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_parent_id ON projects(parent_id);

-- Secrets indexes
CREATE INDEX idx_secrets_user_id ON secrets(user_id);
CREATE INDEX idx_secrets_project_id ON secrets(project_id);
CREATE INDEX idx_secrets_expires_at ON secrets(expires_at);

-- API Keys indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- Environment Variables indexes
CREATE INDEX idx_environment_variables_user_id ON environment_variables(user_id);
CREATE INDEX idx_environment_variables_project_id ON environment_variables(project_id);

-- Access Logs indexes
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- Audit Logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_resource ON audit_logs(user_id, resource_type, resource_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Secrets policies
CREATE POLICY "Users can view their own secrets" ON secrets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own secrets" ON secrets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own secrets" ON secrets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own secrets" ON secrets
    FOR DELETE USING (auth.uid() = user_id);

-- API Keys policies
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Environment Variables policies
CREATE POLICY "Users can view their own environment variables" ON environment_variables
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own environment variables" ON environment_variables
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own environment variables" ON environment_variables
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own environment variables" ON environment_variables
    FOR DELETE USING (auth.uid() = user_id);

-- Access Logs policies
CREATE POLICY "Users can view their own access logs" ON access_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access logs" ON access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Audit Logs policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to increment access count
CREATE OR REPLACE FUNCTION increment_access_count(resource_type TEXT, resource_uuid UUID)
RETURNS VOID AS $$
DECLARE
    user_agent_value TEXT;
BEGIN
    -- Safely get user agent, fallback to NULL if not available
    BEGIN
        user_agent_value := current_setting('request.headers', true)::json->>'user-agent';
    EXCEPTION
        WHEN OTHERS THEN
            user_agent_value := NULL;
    END;
    
    INSERT INTO access_logs (user_id, resource_type, resource_id, action, ip_address, user_agent)
    VALUES (
        auth.uid(),
        resource_type,
        resource_uuid,
        'VIEW',
        inet_client_addr(),
        user_agent_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired items
CREATE OR REPLACE FUNCTION cleanup_expired_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Delete expired secrets
    DELETE FROM secrets WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired API keys
    DELETE FROM api_keys WHERE expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default projects for new users
CREATE OR REPLACE FUNCTION create_default_projects(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    dev_project_id UUID;
    staging_project_id UUID;
    prod_project_id UUID;
BEGIN
    -- Create main environment projects
    INSERT INTO projects (user_id, name, description, color)
    VALUES 
        (target_user_id, 'Development', 'Development environment projects', '#10B981')
    RETURNING id INTO dev_project_id;
    
    INSERT INTO projects (user_id, name, description, color)
    VALUES 
        (target_user_id, 'Staging', 'Staging environment projects', '#F59E0B')
    RETURNING id INTO staging_project_id;
    
    INSERT INTO projects (user_id, name, description, color)
    VALUES 
        (target_user_id, 'Production', 'Production environment projects', '#EF4444')
    RETURNING id INTO prod_project_id;
    
    -- Create sub-projects for each environment
    INSERT INTO projects (user_id, name, description, parent_id, color)
    VALUES 
        -- Development sub-projects
        (target_user_id, 'Database', 'Database credentials and connections', dev_project_id, '#10B981'),
        (target_user_id, 'API Services', 'External API keys and tokens', dev_project_id, '#10B981'),
        (target_user_id, 'Authentication', 'Auth tokens and certificates', dev_project_id, '#10B981'),
        (target_user_id, 'Storage', 'File storage and CDN credentials', dev_project_id, '#10B981'),
        
        -- Staging sub-projects
        (target_user_id, 'Database', 'Database credentials and connections', staging_project_id, '#F59E0B'),
        (target_user_id, 'API Services', 'External API keys and tokens', staging_project_id, '#F59E0B'),
        (target_user_id, 'Authentication', 'Auth tokens and certificates', staging_project_id, '#F59E0B'),
        (target_user_id, 'Storage', 'File storage and CDN credentials', staging_project_id, '#F59E0B'),
        
        -- Production sub-projects
        (target_user_id, 'Database', 'Database credentials and connections', prod_project_id, '#EF4444'),
        (target_user_id, 'API Services', 'External API keys and tokens', prod_project_id, '#EF4444'),
        (target_user_id, 'Authentication', 'Auth tokens and certificates', prod_project_id, '#EF4444'),
        (target_user_id, 'Storage', 'File storage and CDN credentials', prod_project_id, '#EF4444');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user data
CREATE OR REPLACE FUNCTION delete_user_data(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete in order of dependencies
    DELETE FROM audit_logs WHERE user_id = user_uuid;
    DELETE FROM access_logs WHERE user_id = user_uuid;
    DELETE FROM environment_variables WHERE user_id = user_uuid;
    DELETE FROM api_keys WHERE user_id = user_uuid;
    DELETE FROM secrets WHERE user_id = user_uuid;
    DELETE FROM projects WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sanitize data for audit logs
CREATE OR REPLACE FUNCTION sanitize_for_audit(data JSONB, table_name TEXT)
RETURNS JSONB AS $$
DECLARE
    sanitized JSONB;
BEGIN
    sanitized := data;
    
    -- Remove sensitive fields based on table
    CASE table_name
        WHEN 'secrets' THEN
            sanitized := sanitized - 'value' - 'encryption_iv' - 'encryption_salt';
        WHEN 'api_keys' THEN
            sanitized := sanitized - 'key_value' - 'encryption_iv' - 'encryption_salt';
        WHEN 'environment_variables' THEN
            sanitized := sanitized - 'value' - 'encryption_iv' - 'encryption_salt';
        ELSE
            -- For other tables, no sanitization needed
            NULL;
    END CASE;
    
    RETURN sanitized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, resource_type, resource_id, action, old_values)
        VALUES (
            OLD.user_id,
            TG_TABLE_NAME,
            OLD.id,
            TG_OP,
            sanitize_for_audit(to_jsonb(OLD), TG_TABLE_NAME)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, resource_type, resource_id, action, old_values, new_values)
        VALUES (
            NEW.user_id,
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            sanitize_for_audit(to_jsonb(OLD), TG_TABLE_NAME),
            sanitize_for_audit(to_jsonb(NEW), TG_TABLE_NAME)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, resource_type, resource_id, action, new_values)
        VALUES (
            NEW.user_id,
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            sanitize_for_audit(to_jsonb(NEW), TG_TABLE_NAME)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Audit triggers for data changes
CREATE TRIGGER secrets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON secrets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER api_keys_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER environment_variables_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON environment_variables
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Audit log summary view
CREATE VIEW audit_log_summary AS
SELECT 
    user_id,
    resource_type,
    action,
    COUNT(*) as action_count,
    MAX(created_at) as last_action_at
FROM audit_logs
GROUP BY user_id, resource_type, action;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON secrets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON environment_variables TO authenticated;
GRANT SELECT, INSERT ON access_logs TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;

-- Grant view permissions
GRANT SELECT ON audit_log_summary TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_access_count(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_items() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_projects(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO authenticated;

COMMIT;