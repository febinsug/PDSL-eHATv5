-- Drop existing department policies
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- Create simplified policies for departments
CREATE POLICY "Department access policy"
  ON departments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;