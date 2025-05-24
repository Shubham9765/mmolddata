/*
  # Update entries table schema and constraints

  1. Changes
    - Ensure table exists with all required columns
    - Update constraints for settlement and renewal
    - Refresh RLS policies
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON entries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON entries;

-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS entries
DROP CONSTRAINT IF EXISTS settlement_details_required,
DROP CONSTRAINT IF EXISTS renewal_details_check;

-- Add or modify columns
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'renewal_history') THEN
    ALTER TABLE entries ADD COLUMN renewal_history jsonb[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'renewal_date') THEN
    ALTER TABLE entries ADD COLUMN renewal_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'renewal_amount') THEN
    ALTER TABLE entries ADD COLUMN renewal_amount numeric;
  END IF;
END $$;

-- Add or update constraints
ALTER TABLE entries
ADD CONSTRAINT settlement_details_required 
CHECK (
  (status = 'settled' AND settled_amount IS NOT NULL AND settled_date IS NOT NULL) OR
  (status = 'active' AND settled_amount IS NULL AND settled_date IS NULL)
);

ALTER TABLE entries
ADD CONSTRAINT renewal_details_check
CHECK (
  (renewal_date IS NOT NULL AND renewal_amount IS NOT NULL) OR
  (renewal_date IS NULL AND renewal_amount IS NULL)
);

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create policies
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