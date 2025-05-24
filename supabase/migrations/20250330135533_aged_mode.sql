/*
  # Add renewal support for loans

  1. Changes
    - Add renewal_history column to store previous loan details
    - Add renewal_date column to track when loan was renewed
    - Add renewal_amount column to store renewal settlement amount

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE entries
ADD COLUMN renewal_history jsonb[],
ADD COLUMN renewal_date date,
ADD COLUMN renewal_amount numeric;

-- Add constraint to ensure renewal details are valid
ALTER TABLE entries
ADD CONSTRAINT renewal_details_check
CHECK (
  (renewal_date IS NOT NULL AND renewal_amount IS NOT NULL) OR
  (renewal_date IS NULL AND renewal_amount IS NULL)
);