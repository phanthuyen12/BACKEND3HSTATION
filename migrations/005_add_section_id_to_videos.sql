-- Migration: Add section_id to videos table
-- Videos should belong to course_sections instead of directly to courses

-- Add section_id column to videos table
ALTER TABLE videos 
ADD COLUMN section_id INT NULL AFTER course_id,
ADD INDEX idx_videos_section (section_id),
ADD CONSTRAINT fk_videos_section 
  FOREIGN KEY (section_id) REFERENCES course_sections(id) 
  ON DELETE CASCADE;

-- Note: section_id is nullable initially to allow migration of existing data
-- After migration, you may want to make it NOT NULL and remove course_id if not needed






