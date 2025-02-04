-- First, delete dependent records
DELETE FROM public.project_users;

-- Delete timesheets except admin's
DELETE FROM public.timesheets 
WHERE user_id != '4130ad64-cee8-4d50-8ca6-4a7dc580b35e';

-- Delete timesheet approvals except admin's
DELETE FROM public.timesheet_approvals 
WHERE approved_by != '4130ad64-cee8-4d50-8ca6-4a7dc580b35e';

-- Delete projects
DELETE FROM public.projects;

-- Delete clients
DELETE FROM public.clients;

-- Delete users except admin
DELETE FROM public.users 
WHERE id != '4130ad64-cee8-4d50-8ca6-4a7dc580b35e';