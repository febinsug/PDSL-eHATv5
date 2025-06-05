/*
  # Backfill month_hours and is_split_week for existing timesheets

  1. Changes
    - Create a function to calculate month_hours for a timesheet
    - Update all existing timesheets with their month_hours
    - Set is_split_week flag for weeks that span across months
*/

-- Create a function to calculate month_hours
CREATE OR REPLACE FUNCTION calculate_month_hours(
  p_year integer,
  p_week_number integer,
  p_monday_hours numeric,
  p_tuesday_hours numeric,
  p_wednesday_hours numeric,
  p_thursday_hours numeric,
  p_friday_hours numeric
) RETURNS jsonb AS $$
DECLARE
  week_start date;
  current_day date;
  month_hours jsonb := '{}'::jsonb;
  month_key text;
  day_name text;
  hours numeric;
BEGIN
  -- Calculate the start of the week (Monday)
  week_start := date_trunc('week', make_date(p_year, 1, 1) + (p_week_number - 1) * 7)::date;
  
  -- Process each day
  FOR i IN 0..4 LOOP
    current_day := week_start + i;
    month_key := to_char(current_day, 'YYYY-MM');
    
    -- Get the day name and hours
    CASE i
      WHEN 0 THEN day_name := 'monday_hours'; hours := p_monday_hours;
      WHEN 1 THEN day_name := 'tuesday_hours'; hours := p_tuesday_hours;
      WHEN 2 THEN day_name := 'wednesday_hours'; hours := p_wednesday_hours;
      WHEN 3 THEN day_name := 'thursday_hours'; hours := p_thursday_hours;
      WHEN 4 THEN day_name := 'friday_hours'; hours := p_friday_hours;
    END CASE;
    
    -- Initialize month if not exists
    IF NOT month_hours ? month_key THEN
      month_hours := jsonb_set(
        month_hours,
        ARRAY[month_key],
        '{"monday_hours":0,"tuesday_hours":0,"wednesday_hours":0,"thursday_hours":0,"friday_hours":0}'::jsonb
      );
    END IF;
    
    -- Set the hours for the day
    month_hours := jsonb_set(
      month_hours,
      ARRAY[month_key, day_name],
      to_jsonb(hours)
    );
  END LOOP;
  
  RETURN month_hours;
END;
$$ LANGUAGE plpgsql;

-- Update existing timesheets
UPDATE timesheets
SET 
  month_hours = calculate_month_hours(
    year,
    week_number,
    monday_hours,
    tuesday_hours,
    wednesday_hours,
    thursday_hours,
    friday_hours
  ),
  is_split_week = (
    SELECT COUNT(DISTINCT to_char(make_date(year, 1, 1) + (week_number - 1) * 7 + i, 'YYYY-MM')) > 1
    FROM generate_series(0, 4) i
  )
WHERE month_hours IS NULL;

-- Drop the temporary function
DROP FUNCTION calculate_month_hours; 