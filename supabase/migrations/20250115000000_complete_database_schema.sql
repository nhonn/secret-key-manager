-- ============================================================================
-- COMPLETE DATABASE SCHEMA - FIXED VERSION
-- ============================================================================
-- This migration creates the complete database schema for the Secret Key Manager
-- with proper column names that match TypeScript type definitions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
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

-- Secrets table (FIXED: value -> encrypted_value)
CREATE TABLE secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,  -- FIXED: was 'value'
    description TEXT,
    url TEXT,
    username TEXT,
    tags TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,  -- ADDED: missing from original
    encryption_iv TEXT,
    encryption_salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table (FIXED: key_value -> encrypted_key)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    encrypted_key TEXT NOT NULL,  -- FIXED: was 'key_value'
    description TEXT,
    service TEXT,
    url TEXT,
    tags TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,  -- ADDED: missing from original
    encryption_iv TEXT,
    encryption_salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Environment Variables table (FIXED: value -> encrypted_value)
CREATE TABLE environment_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,  -- FIXED: was 'value'
    environment TEXT,  -- ADDED: missing from original
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

-- Audit Logs table (FIXED: added missing columns)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,  -- ADDED: missing from original
    user_agent TEXT,  -- ADDED: missing from original
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- OPTIMIZED INDEXES
-- ============================================================================

-- SECRETS TABLE INDEXES
-- Primary query pattern: user_id + created_at (for getSecrets with ordering)
CREATE INDEX idx_secrets_user_created 
  ON secrets (user_id, created_at DESC);

-- Search pattern: user_id + name/description (for search functionality)
CREATE INDEX idx_secrets_user_search 
  ON secrets (user_id, name, description);

-- Project filtering: user_id + project_id + created_at
CREATE INDEX idx_secrets_user_project_created 
  ON secrets (user_id, project_id, created_at DESC) 
  WHERE project_id IS NOT NULL;

-- Tag search: tags only (GIN index for array operations)
CREATE INDEX idx_secrets_user_tags 
  ON secrets USING GIN (tags) 
  WHERE tags IS NOT NULL AND user_id IS NOT NULL;

-- Expiration queries
CREATE INDEX idx_secrets_expires_at ON secrets(expires_at);

-- API KEYS TABLE INDEXES
-- Primary query pattern: user_id + created_at
CREATE INDEX idx_api_keys_user_created 
  ON api_keys (user_id, created_at DESC);

-- Search pattern: user_id + name/description/service/url
CREATE INDEX idx_api_keys_user_search 
  ON api_keys (user_id, name, description, service, url);

-- Project filtering: user_id + project_id + created_at
CREATE INDEX idx_api_keys_user_project_created 
  ON api_keys (user_id, project_id, created_at DESC) 
  WHERE project_id IS NOT NULL;

-- Tag search: tags only (GIN index for array operations)
CREATE INDEX idx_api_keys_user_tags 
  ON api_keys USING GIN (tags) 
  WHERE tags IS NOT NULL AND user_id IS NOT NULL;

-- Expiration queries
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- ENVIRONMENT VARIABLES TABLE INDEXES
-- Primary query pattern: user_id + created_at
CREATE INDEX idx_env_vars_user_created 
  ON environment_variables (user_id, created_at DESC);

-- Search pattern: user_id + name/description/environment
CREATE INDEX idx_env_vars_user_search 
  ON environment_variables (user_id, name, description, environment);

-- Project filtering: user_id + project_id + created_at
CREATE INDEX idx_env_vars_user_project_created 
  ON environment_variables (user_id, project_id, created_at DESC) 
  WHERE project_id IS NOT NULL;

-- Environment filtering: user_id + environment + created_at
CREATE INDEX idx_env_vars_user_env_created 
  ON environment_variables (user_id, environment, created_at DESC) 
  WHERE environment IS NOT NULL;

-- Tag search: tags only (GIN index for array operations)
CREATE INDEX idx_env_vars_user_tags 
  ON environment_variables USING GIN (tags) 
  WHERE tags IS NOT NULL AND user_id IS NOT NULL;

-- PROJECTS TABLE INDEXES
-- Primary query pattern: user_id + created_at
CREATE INDEX idx_projects_user_created 
  ON projects (user_id, created_at DESC);

-- Hierarchy queries: parent_id + created_at
CREATE INDEX idx_projects_parent_created 
  ON projects (parent_id, created_at DESC) 
  WHERE parent_id IS NOT NULL;

-- Search pattern: user_id + name/description
CREATE INDEX idx_projects_user_search 
  ON projects (user_id, name, description);

-- ACCESS LOGS TABLE INDEXES
-- Primary query pattern: user_id + created_at (for recent activity)
CREATE INDEX idx_access_logs_user_created 
  ON access_logs (user_id, created_at DESC);

-- Resource tracking: resource_type + resource_id + created_at
CREATE INDEX idx_access_logs_resource_created 
  ON access_logs (resource_type, resource_id, created_at DESC);

-- Action filtering: user_id + action + created_at
CREATE INDEX idx_access_logs_user_action_created 
  ON access_logs (user_id, action, created_at DESC);

-- AUDIT LOGS TABLE INDEXES
-- Primary query pattern: user_id + created_at
CREATE INDEX idx_audit_logs_user_created 
  ON audit_logs (user_id, created_at DESC);

-- Resource tracking: resource_type + resource_id + created_at
CREATE INDEX idx_audit_logs_resource_created 
  ON audit_logs (resource_type, resource_id, created_at DESC);

-- Action filtering: user_id + action + created_at
CREATE INDEX idx_audit_logs_user_action_created 
  ON audit_logs (user_id, action, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- PROJECTS POLICIES
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- SECRETS POLICIES
CREATE POLICY "Users can view their own secrets" ON secrets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own secrets" ON secrets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own secrets" ON secrets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own secrets" ON secrets
    FOR DELETE USING (auth.uid() = user_id);

-- API KEYS POLICIES
CREATE POLICY "Users can view their own api keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- ENVIRONMENT VARIABLES POLICIES
CREATE POLICY "Users can view their own environment variables" ON environment_variables
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own environment variables" ON environment_variables
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own environment variables" ON environment_variables
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own environment variables" ON environment_variables
    FOR DELETE USING (auth.uid() = user_id);

-- ACCESS LOGS POLICIES
CREATE POLICY "Users can view their own access logs" ON access_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own access logs" ON access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AUDIT LOGS POLICIES
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_environment_variables_updated_at BEFORE UPDATE ON environment_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to delete all user data (for GDPR compliance)
CREATE OR REPLACE FUNCTION delete_user_data(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete in order to respect foreign key constraints
    DELETE FROM access_logs WHERE user_id = user_uuid;
    DELETE FROM audit_logs WHERE user_id = user_uuid;
    DELETE FROM secrets WHERE user_id = user_uuid;
    DELETE FROM api_keys WHERE user_id = user_uuid;
    DELETE FROM environment_variables WHERE user_id = user_uuid;
    DELETE FROM projects WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Analyze tables for better query planning
ANALYZE projects;
ANALYZE secrets;
ANALYZE api_keys;
ANALYZE environment_variables;
ANALYZE access_logs;
ANALYZE audit_logs;

-- ============================================================================
-- SCHEMA VALIDATION
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE projects IS 'User projects for organizing secrets, API keys, and environment variables';
COMMENT ON TABLE secrets IS 'Encrypted user secrets with metadata';
COMMENT ON TABLE api_keys IS 'Encrypted API keys with service information';
COMMENT ON TABLE environment_variables IS 'Encrypted environment variables for different environments';
COMMENT ON TABLE access_logs IS 'Log of user access to resources';
COMMENT ON TABLE audit_logs IS 'Audit trail of changes to resources';

-- Add column comments for critical fields
COMMENT ON COLUMN secrets.encrypted_value IS 'AES-256-GCM encrypted secret value';
COMMENT ON COLUMN api_keys.encrypted_key IS 'AES-256-GCM encrypted API key';
COMMENT ON COLUMN environment_variables.encrypted_value IS 'AES-256-GCM encrypted environment variable value';
COMMENT ON COLUMN secrets.encryption_iv IS 'Initialization vector for AES encryption';
COMMENT ON COLUMN secrets.encryption_salt IS 'Salt used for key derivation';