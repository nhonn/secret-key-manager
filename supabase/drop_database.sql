-- Drop Script for Secret Key Manager Database
-- This script safely removes all database objects created by the migrations
-- Execute this script to completely clean up the database

BEGIN;

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

-- Drop audit triggers
DROP TRIGGER IF EXISTS secrets_audit_trigger ON secrets;
DROP TRIGGER IF EXISTS api_keys_audit_trigger ON api_keys;
DROP TRIGGER IF EXISTS environment_variables_audit_trigger ON environment_variables;

-- Drop legacy triggers (from migration history)
DROP TRIGGER IF EXISTS create_default_folders_trigger ON auth.users;
DROP TRIGGER IF EXISTS assign_default_role_trigger ON auth.users;

-- ============================================================================
-- DROP VIEWS
-- ============================================================================

DROP VIEW IF EXISTS audit_log_summary CASCADE;

-- ============================================================================
-- DROP FUNCTIONS
-- ============================================================================

-- Drop functions
DROP FUNCTION IF EXISTS increment_access_count(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_items() CASCADE;
DROP FUNCTION IF EXISTS create_default_projects(UUID) CASCADE;
DROP FUNCTION IF EXISTS delete_user_data(UUID) CASCADE;
DROP FUNCTION IF EXISTS sanitize_for_audit(JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;

-- ============================================================================
-- DROP POLICIES
-- ============================================================================

-- Drop projects policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;



-- Drop secrets policies
DROP POLICY IF EXISTS "Users can view their own secrets" ON secrets;
DROP POLICY IF EXISTS "Users can insert their own secrets" ON secrets;
DROP POLICY IF EXISTS "Users can update their own secrets" ON secrets;
DROP POLICY IF EXISTS "Users can delete their own secrets" ON secrets;

-- Drop API keys policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;

-- Drop environment variables policies
DROP POLICY IF EXISTS "Users can view their own environment variables" ON environment_variables;
DROP POLICY IF EXISTS "Users can insert their own environment variables" ON environment_variables;
DROP POLICY IF EXISTS "Users can update their own environment variables" ON environment_variables;
DROP POLICY IF EXISTS "Users can delete their own environment variables" ON environment_variables;

-- Drop access logs policies
DROP POLICY IF EXISTS "Users can view their own access logs" ON access_logs;
DROP POLICY IF EXISTS "Users can insert their own access logs" ON access_logs;

-- Drop audit logs policies
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON audit_logs;



-- ============================================================================
-- DROP INDEXES
-- ============================================================================

-- Drop projects indexes
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_projects_parent_id;



-- Drop secrets indexes
DROP INDEX IF EXISTS idx_secrets_user_id;
DROP INDEX IF EXISTS idx_secrets_project_id;
DROP INDEX IF EXISTS idx_secrets_expires_at;

-- Drop API keys indexes
DROP INDEX IF EXISTS idx_api_keys_user_id;
DROP INDEX IF EXISTS idx_api_keys_project_id;
DROP INDEX IF EXISTS idx_api_keys_expires_at;

-- Drop environment variables indexes
DROP INDEX IF EXISTS idx_environment_variables_user_id;
DROP INDEX IF EXISTS idx_environment_variables_project_id;

-- Drop access logs indexes
DROP INDEX IF EXISTS idx_access_logs_user_id;
DROP INDEX IF EXISTS idx_access_logs_created_at;

-- Drop audit logs indexes
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_resource_type;
DROP INDEX IF EXISTS idx_audit_logs_resource_id;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_user_resource;



-- ============================================================================
-- REVOKE PERMISSIONS
-- ============================================================================

-- Revoke permissions from authenticated users
REVOKE ALL ON secrets FROM authenticated;
REVOKE ALL ON projects FROM authenticated;
REVOKE ALL ON api_keys FROM authenticated;
REVOKE ALL ON environment_variables FROM authenticated;
REVOKE ALL ON access_logs FROM authenticated;
REVOKE ALL ON audit_logs FROM authenticated;
REVOKE ALL ON audit_log_summary FROM authenticated;

-- Revoke permissions from anon users
REVOKE ALL ON secrets FROM anon;
REVOKE ALL ON projects FROM anon;
REVOKE ALL ON api_keys FROM anon;
REVOKE ALL ON environment_variables FROM anon;
REVOKE ALL ON access_logs FROM anon;

-- Revoke function permissions
REVOKE EXECUTE ON FUNCTION increment_access_count(TEXT, UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_expired_items() FROM authenticated;
REVOKE EXECUTE ON FUNCTION create_default_projects(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION delete_user_data(UUID) FROM authenticated;

-- ============================================================================
-- DROP TABLES
-- ============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS environment_variables CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS secrets CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- ============================================================================
-- CLEANUP EXTENSIONS (if any were created specifically for this app)
-- ============================================================================

-- Note: We don't drop standard PostgreSQL extensions like uuid-ossp or pgcrypto
-- as they might be used by other parts of the system

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment the following queries to verify the cleanup was successful:

-- Check for remaining tables
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%secret%' OR tablename LIKE '%api_key%' OR tablename LIKE '%environment%' OR tablename LIKE '%project%' OR tablename LIKE '%audit%' OR tablename LIKE '%access%');

-- Check for remaining functions
-- SELECT proname FROM pg_proc WHERE proname LIKE '%secret%' OR proname LIKE '%project%' OR proname LIKE '%audit%';

-- Check for remaining views
-- SELECT viewname FROM pg_views WHERE schemaname = 'public' AND (viewname LIKE '%secret%' OR viewname LIKE '%audit%' OR viewname LIKE '%project%');