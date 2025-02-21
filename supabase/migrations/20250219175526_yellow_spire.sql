/*
  # Add project status and search capabilities

  1. Changes
    - Add status enum type for projects
    - Convert is_active boolean to status enum
    - Add search index for project names
    
  2. Data Migration
    - Convert existing active/inactive projects to new status
*/

-- Create project status enum
CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'completed');

-- Add status column
ALTER TABLE projects 
ADD COLUMN status project_status;

-- Migrate existing data
UPDATE projects 
SET status = CASE 
  WHEN completed_at IS NOT NULL THEN 'completed'
  WHEN is_active = true THEN 'active'
  ELSE 'on_hold'
END;

-- Make status required
ALTER TABLE projects 
ALTER COLUMN status SET NOT NULL;

-- Drop is_active column
ALTER TABLE projects 
DROP COLUMN is_active;

-- Create index for search
CREATE INDEX idx_projects_name_search ON projects USING gin(to_tsvector('english', name));