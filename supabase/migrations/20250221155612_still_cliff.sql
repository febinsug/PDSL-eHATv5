/*
  # Update User Table Structure
  
  1. Changes
    - Add department column to users table
    - Add designation column to users table
    - Create indexes for better query performance
  
  2. Notes
    - Removes existing department-related tables
    - Simplifies the data model by using a direct department field
*/

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