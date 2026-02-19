-- Add sede_count to organization table
ALTER TABLE organization 
ADD COLUMN IF NOT EXISTS sede_count INTEGER NOT NULL DEFAULT 1;

-- Add PENDING_QUOTE to subscription_status enum
-- We use a DO block to handle potential "type does not exist" or "value already exists" gracefully if needed,
-- but standard ADD VALUE IF NOT EXISTS is supported in modern Postgres (v12+).
-- Assuming the type name is 'subscription_status' based on convention and prompt.
ALTER TYPE "subscription_status" ADD VALUE IF NOT EXISTS 'PENDING_QUOTE';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_organization_sede_count ON organization(sede_count);
