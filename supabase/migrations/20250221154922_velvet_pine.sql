-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Add department_id to users
ALTER TABLE users
ADD COLUMN department_id uuid REFERENCES departments(id);

-- Add designation to users
ALTER TABLE users
ADD COLUMN designation text;

-- Create indexes
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_users_designation ON users(designation);
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