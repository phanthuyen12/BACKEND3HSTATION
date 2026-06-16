SET @dbname = DATABASE();
SET @tablename = 'videos';
SET @columnname = 'banner_url';

SET @preparedStatement = (
  SELECT IF(
    (
      SELECT COUNT(*)
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = @dbname
        AND table_name = @tablename
        AND column_name = @columnname
    ) > 0,
    'SELECT 1',
    CONCAT(
      'ALTER TABLE ',
      @tablename,
      ' ADD COLUMN ',
      @columnname,
      ' VARCHAR(500) NULL AFTER preview'
    )
  )
);

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
