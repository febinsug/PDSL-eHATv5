-- Drop existing department tables if they exist
DROP TABLE IF EXISTS department_users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Add department and designation to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS designation text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation);