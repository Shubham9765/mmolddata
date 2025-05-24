/*
  # Make customer mobile number optional

  1. Changes
    - Modify `entries` table to make `customer_mobile` column nullable
*/

ALTER TABLE entries
ALTER COLUMN customer_mobile DROP NOT NULL;