-- Add department field to users if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);