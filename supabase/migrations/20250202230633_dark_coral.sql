/*
  # Add month-specific hours tracking to timesheets

  1. Changes
    - Add month_hours column to store hours split by month
    - Add is_split_week column to track weeks that span across months
    - Add rejection_reason column for rejected timesheets
*/

-- Add month_hours column to timesheets
ALTER TABLE timesheets
ADD COLUMN month_hours JSONB,
ADD COLUMN is_split_week BOOLEAN DEFAULT FALSE,
ADD COLUMN rejection_reason text;

-- Create index for better query performance when filtering by split weeks
CREATE INDEX idx_timesheets_split_week ON timesheets(is_split_week)
WHERE is_split_week = true;

-- Create index for better query performance when filtering by rejection reason
CREATE INDEX idx_timesheets_rejection_reason ON timesheets(rejection_reason)
WHERE rejection_reason IS NOT NULL;