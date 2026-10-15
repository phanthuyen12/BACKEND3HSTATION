-- Migration: Update orders status enum to include new statuses
-- Add new status values: processing, completed, dang-cho-xu-ly, dang-tao, tao-thanh-cong

-- Note: MySQL doesn't support ALTER ENUM directly, so we need to:
-- 1. Add a temporary column with new ENUM
-- 2. Copy data
-- 3. Drop old column
-- 4. Rename new column

-- Step 1: Add temporary column with new ENUM values
ALTER TABLE orders 
ADD COLUMN status_new ENUM(
  'pending', 
  'paid', 
  'failed', 
  'cancelled',
  'processing',
  'completed',
  'dang-cho-xu-ly',
  'dang-tao',
  'tao-thanh-cong'
) DEFAULT 'pending' AFTER status;

-- Step 2: Copy data from old column to new column
UPDATE orders SET status_new = status;

-- Step 3: Drop old column
ALTER TABLE orders DROP COLUMN status;

-- Step 4: Rename new column to status
ALTER TABLE orders CHANGE COLUMN status_new status ENUM(
  'pending', 
  'paid', 
  'failed', 
  'cancelled',
  'processing',
  'completed',
  'dang-cho-xu-ly',
  'dang-tao',
  'tao-thanh-cong'
) DEFAULT 'pending';






