-- Migration: Rename credential_folders to projects
-- This migration renames the credential_folders table to projects
-- and updates all foreign key references accordingly

BEGIN;

-- Step 1: Drop existing foreign key constraints
ALTER TABLE secrets DROP CONSTRAINT IF EXISTS secrets_folder_id_fkey;
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_folder_id_fkey;
ALTER TABLE environment_variables DROP CONSTRAINT IF EXISTS environment_variables_folder_id_fkey;
ALTER TABLE credential_folders DROP CONSTRAINT IF EXISTS credential_folders_parent_id_fkey;

-- Step 2: Rename the table
ALTER TABLE credential_folders RENAME TO projects;

-- Step 3: Rename the folder_id columns to project_id in all referencing tables
ALTER TABLE secrets RENAME COLUMN folder_id TO project_id;
ALTER TABLE api_keys RENAME COLUMN folder_id TO project_id;
ALTER TABLE environment_variables RENAME COLUMN folder_id TO project_id;

-- Step 4: Recreate foreign key constraints with new names
ALTER TABLE secrets 
  ADD CONSTRAINT secrets_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE api_keys 
  ADD CONSTRAINT api_keys_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE environment_variables 
  ADD CONSTRAINT environment_variables_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE projects 
  ADD CONSTRAINT projects_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Step 5: Update any indexes that reference the old column names
DROP INDEX IF EXISTS idx_secrets_folder_id;
DROP INDEX IF EXISTS idx_api_keys_folder_id;
DROP INDEX IF EXISTS idx_environment_variables_folder_id;

CREATE INDEX IF NOT EXISTS idx_secrets_project_id ON secrets(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_environment_variables_project_id ON environment_variables(project_id);

-- Step 6: Update RLS policies if they exist
-- Note: This assumes RLS policies exist with folder-related names
DROP POLICY IF EXISTS "Users can view their own credential folders" ON projects;
DROP POLICY IF EXISTS "Users can create credential folders" ON projects;
DROP POLICY IF EXISTS "Users can update their own credential folders" ON projects;
DROP POLICY IF EXISTS "Users can delete their own credential folders" ON projects;

-- Recreate RLS policies with project terminology
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;