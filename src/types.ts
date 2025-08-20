import type { Project as BaseProject, User, ProjectStatus as BaseProjectStatus } from './types/models';

export type Project = BaseProject;
export type ProjectStatus = BaseProjectStatus;

export interface ProjectWithUtilization extends Project {
  totalHours: number;
  utilization: number;
  color: string;
}

export interface MonthEntry {
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
}

export interface Timesheet {
  id: string;
  user_id: string;
  project_id: string;
  week_number: number;
  year: number;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  total_hours: number;
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  month_hours?: Record<string, MonthEntry> | null;
  is_split_week?: boolean | null;
  project:any;
}

export interface TimesheetWithDetails extends Timesheet {
  user: User;
  project: Project;
  approver?: User;
}

export interface TimesheetWithProject extends Timesheet {
  project: Project;
}

export interface UserHours {
  user: User;
  totalHours: number;
  projectHours: {
    project: Project;
    hours: number;
  }[];
  weeklyHours: {
    weekNumber: number;
    hours: number;
  }[];
  timesheets: TimesheetWithDetails[];
}

export interface ProjectUtilizationDetails {
  project: Project & {
    totalHours: number;
    utilization: number;
  };
  users: {
    id: string;
    name: string;
    hours: number;
    monthlyHours: number;
    designation: string | undefined;
  }[];
  timesheets: Timesheet[];
  totalHoursUsed: number;
  hoursRemaining: number;
}

export interface ProjectDistributionData {
  name: string;
  hours: number;
  color: string;
}

export type { User }; 