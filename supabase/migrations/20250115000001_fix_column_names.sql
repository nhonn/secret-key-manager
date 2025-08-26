-- Migration to fix column names to match TypeScript types
-- This migration renames columns to align with service layer expectations

-- Fix secrets table: value -> encrypted_value
ALTER TABLE secrets RENAME COLUMN value TO encrypted_value;

-- Fix api_keys table: key_value -> encrypted_key  
ALTER TABLE api_keys RENAME COLUMN key_value TO encrypted_key;

-- Fix environment_variables table: value -> encrypted_value
ALTER TABLE environment_variables RENAME COLUMN value TO encrypted_value;

-- Add missing columns
ALTER TABLE secrets ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;
ALTER TABLE environment_variables ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Update comments for documentation
COMMENT ON COLUMN secrets.encrypted_value IS 'AES-256-GCM encrypted secret value';
COMMENT ON COLUMN api_keys.encrypted_key IS 'AES-256-GCM encrypted API key';
COMMENT ON COLUMN environment_variables.encrypted_value IS 'AES-256-GCM encrypted environment variable value';