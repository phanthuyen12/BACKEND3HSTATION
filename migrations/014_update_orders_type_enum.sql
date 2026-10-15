-- Migration: Update orders type enum to include new nodeverse_vps type
-- This migration updates the type ENUM column in the orders table

-- Step 1: Add new temporary column
ALTER TABLE orders 
ADD COLUMN type_new ENUM('course', 'workflow', 'vps', 'nodeverse_vps') NOT NULL DEFAULT 'course' AFTER type;

-- Step 2: Copy data to new column
UPDATE orders SET type_new = type;

-- Step 3: Wait for all updates to finish then drop old column
ALTER TABLE orders DROP COLUMN type;

-- Step 4: Rename new column to original name
ALTER TABLE orders CHANGE COLUMN type_new type ENUM('course', 'workflow', 'vps', 'nodeverse_vps') NOT NULL;
