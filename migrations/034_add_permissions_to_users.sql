-- Add permissions JSON column to users table
ALTER TABLE users ADD COLUMN permissions JSON NULL;
