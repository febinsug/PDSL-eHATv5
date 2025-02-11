import type { User, Project, Timesheet, Client } from './models';

export interface TimesheetWithDetails extends Timesheet {
  user: User;
  project: Project;
  approver?: User;
}

export interface ProjectWithUtilization extends Project {
  totalHours: number;
  utilization: number;
  color?: string;
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
}

export interface ProjectUtilizationDetails {
  project: ProjectWithUtilization;
  users: {
    id: string;
    name: string;
    hours: number;
  }[];
}

export type { User, Project, Timesheet, Client };