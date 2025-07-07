import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://omzrvobipzawytgnfyhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tenJ2b2JpcHphd3l0Z25meWhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODI5MDI1NCwiZXhwIjoyMDUzODY2MjU0fQ.yoqfMfVcamWmMvcGXOBR-IjBWojFiBHu1rjwsoKGMu4'; // Use a secure key for admin access
const supabase = createClient(supabaseUrl, supabaseKey);

const JUNE_KEY = '2025-07';

async function checkJuneTimesheets() {
  // Fetch all timesheets for June 2024
  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select('*')
    .eq('year', 2025);

  if (error) {
    console.error('Error fetching timesheets:', error);
    return;
  }

  const issues = [];

  for (const ts of timesheets) {
    // Check if month_hours exists and has the June key
    const monthHours = ts.month_hours || {};
    const juneEntry = monthHours[JUNE_KEY];

    if (!juneEntry) {
      issues.push({
        id: ts.id,
        user_id: ts.user_id,
        project_id: ts.project_id,
        reason: 'Missing 2025-06 entry in month_hours',
      });
      continue;
    }

    // Check if all hours are zero
    const totalJuneHours =
      (juneEntry.monday_hours || 0) +
      (juneEntry.tuesday_hours || 0) +
      (juneEntry.wednesday_hours || 0) +
      (juneEntry.thursday_hours || 0) +
      (juneEntry.friday_hours || 0);

    if (totalJuneHours === 0) {
      issues.push({
        id: ts.id,
        user_id: ts.user_id,
        project_id: ts.project_id,
        reason: '2025-06 entry exists but all hours are zero',
      });
    }
  }

  if (issues.length === 0) {
    console.log('All June timesheets have valid month_hours entries.');
  } else {
    console.log('Issues found with June timesheets:');
    console.table(issues);
  }
}

checkJuneTimesheets();