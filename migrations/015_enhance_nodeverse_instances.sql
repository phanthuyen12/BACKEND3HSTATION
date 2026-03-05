-- Migration: Make nodeverse_vps_instances more flexible for hybrid orders
-- 1. Change plan_id to VARCHAR(50) to support standard plan IDs (e.g., 'vps-standard-1')
-- 2. Add configuration JSON column to store hardware specs and metadata

ALTER TABLE nodeverse_vps_instances MODIFY COLUMN plan_id VARCHAR(50) NOT NULL;

SET @dbname = DATABASE();
SET @tablename = 'nodeverse_vps_instances';
SET @columnname = 'configuration';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' JSON NULL AFTER notes')
));
PREPARE addColumnIfNotExists FROM @preparedStatement;
EXECUTE addColumnIfNotExists;
DEALLOCATE PREPARE addColumnIfNotExists;
