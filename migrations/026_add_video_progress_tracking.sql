-- Migration: extend course_progress to support video-based tracking

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

SET @dbname = DATABASE();
SET @tablename = 'course_progress';

-- Allow legacy lesson-based rows to coexist with new video-based rows
SET @columnname = 'lesson_id';
SET @preparedStatement = (
  SELECT IF(
    (
      SELECT IS_NULLABLE = 'YES'
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE table_schema = @dbname
        AND table_name = @tablename
        AND column_name = @columnname
      LIMIT 1
    ),
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN lesson_id INT NULL')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @columnname = 'video_id';
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
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN video_id INT NULL AFTER lesson_id')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @columnname = 'watched_seconds';
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
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN watched_seconds INT NOT NULL DEFAULT 0 AFTER video_id')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @columnname = 'duration_seconds';
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
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN duration_seconds INT NOT NULL DEFAULT 0 AFTER watched_seconds')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @columnname = 'last_position_seconds';
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
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN last_position_seconds INT NOT NULL DEFAULT 0 AFTER duration_seconds')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @columnname = 'progress_percent';
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
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER last_position_seconds')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @columnname = 'last_watched_at';
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
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN last_watched_at DATETIME NULL AFTER completed_at')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @indexname = 'idx_course_progress_video';
SET @preparedStatement = (
  SELECT IF(
    (
      SELECT COUNT(*)
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE table_schema = @dbname
        AND table_name = @tablename
        AND index_name = @indexname
    ) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD INDEX ', @indexname, ' (video_id)')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET @indexname = 'unique_user_course_video';
SET @preparedStatement = (
  SELECT IF(
    (
      SELECT COUNT(*)
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE table_schema = @dbname
        AND table_name = @tablename
        AND index_name = @indexname
    ) > 0,
    'SELECT 1',
    CONCAT('ALTER TABLE ', @tablename, ' ADD UNIQUE KEY ', @indexname, ' (user_id, course_id, video_id)')
  )
);
PREPARE alterIfNeeded FROM @preparedStatement;
EXECUTE alterIfNeeded;
DEALLOCATE PREPARE alterIfNeeded;

SET FOREIGN_KEY_CHECKS = 1;
