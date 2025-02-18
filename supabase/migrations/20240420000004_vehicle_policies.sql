-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admins to insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow admins to update vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow everyone to view vehicles" ON vehicles;

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow admins to insert vehicles"
  ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Allow everyone to view vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (true);
