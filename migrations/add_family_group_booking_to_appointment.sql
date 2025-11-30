-- Migration: Add family group booking fields to appointment table
-- This allows tracking who booked the appointment (the family group owner)
-- and for which patient in the family group the appointment is for

-- Add column to track the patient who booked the appointment (family group owner)
ALTER TABLE appointment 
ADD COLUMN IF NOT EXISTS booked_by_patient_id VARCHAR(255);

-- Add comment to explain the field
COMMENT ON COLUMN appointment.booked_by_patient_id IS 'ID del paciente que reservó la cita (dueño del grupo familiar). Si es null, la cita fue reservada por el mismo paciente (patient_id)';

-- Add foreign key constraint if the column doesn't have one
-- Note: This assumes the Patient table exists and has an id column
-- DO NOT add this if it causes issues with existing data
-- ALTER TABLE appointment 
-- ADD CONSTRAINT fk_appointment_booked_by_patient 
-- FOREIGN KEY (booked_by_patient_id) REFERENCES Patient(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointment_booked_by_patient_id 
ON appointment(booked_by_patient_id);

-- Update existing appointments to set booked_by_patient_id = patient_id
-- This ensures backward compatibility
UPDATE appointment 
SET booked_by_patient_id = patient_id 
WHERE booked_by_patient_id IS NULL;

