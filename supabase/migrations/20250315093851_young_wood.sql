/*
  # Create entries table for storing customer data

  1. New Tables
    - `entries`
      - `id` (bigint, primary key)
      - `type` (text) - NR, R, or Vyapari
      - `date` (date)
      - `customer_name` (text)
      - `customer_address` (text)
      - `customer_mobile` (text)
      - `items` (text)
      - `given_amount` (numeric)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE entries (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type text NOT NULL CHECK (type IN ('NR', 'R', 'Vyapari')),
  date date NOT NULL,
  customer_name text NOT NULL,
  customer_address text NOT NULL,
  customer_mobile text NOT NULL,
  items text NOT NULL,
  given_amount numeric NOT NULL CHECK (given_amount >= 0),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON entries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON entries
  FOR UPDATE TO authenticated USING (true);