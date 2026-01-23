-- Migration: Allow multiple users with same email but different roles
-- This migration removes the unique constraint on email and creates a composite unique constraint on (email, role)
-- This allows the same email to have multiple user records with different roles (e.g., DOCTOR and PATIENT)

-- Step 1: Drop the existing unique constraint on email
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "User_email_key";

-- Step 2: Create a composite unique constraint on (email, role)
-- This ensures that the same email can have multiple records, but only one per role
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_role_unique" ON "user" ("email", "role");

-- Note: If you need to handle case-insensitive email matching, you might want to use:
-- CREATE UNIQUE INDEX IF NOT EXISTS "user_email_role_unique" ON "user" (LOWER("email"), "role");

