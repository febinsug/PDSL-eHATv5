/*
  # Add Designation and Department Features

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, references users)

    - `department_users`
      - `department_id` (uuid, references departments)
      - `user_id` (uuid, references users)
      - `assigned_at` (timestamptz)

  2. Changes
    - Add `designation` column to users table

  3. Security
    - Enable RLS on new tables
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

-- Create department_users mapping table
CREATE TABLE IF NOT EXISTS department_users (
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (department_id, user_id)
);

-- Add designation to users
ALTER TABLE users
ADD COLUMN designation text;

-- Create indexes
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_users_designation ON users(designation);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_users ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Anyone can view department assignments"
  ON department_users
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage department assignments"
  ON department_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );