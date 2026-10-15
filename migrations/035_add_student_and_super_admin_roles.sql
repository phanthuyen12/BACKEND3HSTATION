-- Add 'student' and 'super_admin' roles to users ENUM
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'staff', 'viewer', 'student', 'super_admin') NOT NULL DEFAULT 'user';
