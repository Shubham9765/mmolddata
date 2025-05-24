/*
  # Fix RLS policies for entries table

  1. Changes
    - Drop existing policies
    - Create new policies with proper WITH CHECK conditions
    - Ensure RLS is enabled
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON entries;

-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper WITH CHECK conditions
CREATE POLICY "Enable insert for authenticated users" ON entries
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON entries
  FOR SELECT 
  TO authenticated 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON entries
  FOR UPDATE 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');