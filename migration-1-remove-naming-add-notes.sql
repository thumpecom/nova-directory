-- Migration 1: remove naming conventions tables, add notes column to pages.
-- Run once in Neon's SQL Editor.

DROP TABLE IF EXISTS naming_convention_rows;
DROP TABLE IF EXISTS naming_convention_format;

ALTER TABLE pages ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
