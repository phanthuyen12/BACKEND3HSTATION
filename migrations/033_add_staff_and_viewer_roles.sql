-- Add staff and viewer roles to users ENUM
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'staff', 'viewer') NOT NULL DEFAULT 'user';
