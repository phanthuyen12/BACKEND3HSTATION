-- Migration: Update VPS instances status enum to include new statuses
-- Add: dang-cho-xu-ly, dang-tao, tao-thanh-cong

SET @dbname = DATABASE();
SET @tablename = 'vps_instances';
SET @columnname = 'status';

-- First, update existing data
UPDATE vps_instances SET status = 'pending' WHERE status NOT IN ('pending', 'active', 'suspended', 'expired', 'cancelled', 'dang-cho-xu-ly', 'dang-tao', 'tao-thanh-cong');

-- Alter table to add new status values
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
      AND (column_type LIKE '%dang-cho-xu-ly%')
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' ENUM(\'pending\', \'dang-cho-xu-ly\', \'dang-tao\', \'tao-thanh-cong\', \'active\', \'suspended\', \'expired\', \'cancelled\') DEFAULT \'dang-cho-xu-ly\'')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

