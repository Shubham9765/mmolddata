/*
  # Fix RLS policies for entries table

  1. Changes
    - Drop existing policies
    - Create new policies with proper permissions
    - Enable RLS
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON entries;

-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users" ON entries
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON entries
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable update for authenticated users" ON entries
  FOR UPDATE 
  TO authenticated 
  USING (true);