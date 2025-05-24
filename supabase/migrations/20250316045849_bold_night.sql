/*
  # Fix RLS policies authentication check for entries table

  1. Changes
    - Drop existing policies
    - Create new policies with correct authentication checks using auth.uid()
    - Ensure RLS is enabled

  2. Security
    - Policies now properly check for authenticated users using auth.uid()
    - All operations (INSERT, SELECT, UPDATE) are protected
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON entries;

-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create new policies with proper authentication checks
CREATE POLICY "Enable insert for authenticated users" ON entries
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable read for authenticated users" ON entries
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users" ON entries
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);