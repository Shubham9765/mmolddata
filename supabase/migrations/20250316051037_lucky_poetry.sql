/*
  # Add settlement support to entries table

  1. Changes
    - Add settlement related columns to entries table
    - Add status column to track entry state
    - Add settlement amount and date columns

  2. Security
    - Update RLS policies to include new columns
*/

-- Add new columns for settlement tracking
ALTER TABLE entries
ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled')),
ADD COLUMN settled_amount numeric,
ADD COLUMN settled_date date,
ADD COLUMN settlement_notes text;

-- Add constraint to ensure settled entries have settlement details
ALTER TABLE entries
ADD CONSTRAINT settlement_details_required 
CHECK (
  (status = 'settled' AND settled_amount IS NOT NULL AND settled_date IS NOT NULL) OR
  (status = 'active' AND settled_amount IS NULL AND settled_date IS NULL)
);