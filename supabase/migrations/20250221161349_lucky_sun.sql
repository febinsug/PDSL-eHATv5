/*
  # Add Departments Management
  
  1. New Tables
    - departments
      - id (uuid, primary key)
      - name (text, required)
      - description (text)
      - created_at (timestamp)
      - updated_at (timestamp)
      - created_by (uuid, references users)
    
  2. Changes
    - Add department_id to users table
    - Remove old department text field
    
  3. Security
    - Enable RLS on departments table
    - Add policies for department management
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Drop old department column and add new department_id
ALTER TABLE users 
DROP COLUMN IF EXISTS department,
ADD COLUMN department_id uuid REFERENCES departments(id);

-- Create indexes
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_users_department_id ON users(department_id);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view departments"
  ON departments
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON departments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );