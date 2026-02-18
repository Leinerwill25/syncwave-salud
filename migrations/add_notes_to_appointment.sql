-- Add notes column to appointment table
ALTER TABLE public.appointment
ADD COLUMN IF NOT EXISTS notes TEXT;
