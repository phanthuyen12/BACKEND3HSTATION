-- Migration: Update orders type enum to include tool_key and tool_key_renewal
-- This migration updates the type ENUM column in the orders table

ALTER TABLE orders 
MODIFY COLUMN type ENUM('course', 'workflow', 'vps', 'nodeverse_vps', 'tool_key', 'tool_key_renewal') NOT NULL DEFAULT 'course';
