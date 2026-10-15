-- Migration: add img_banner column to videos table
ALTER TABLE videos
ADD COLUMN img_banner VARCHAR(500) NULL AFTER url;
