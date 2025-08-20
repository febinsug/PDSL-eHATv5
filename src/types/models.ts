export type UserRole = 'user' | 'manager' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  manager_id: string | null;
  department_id: string | null;
  designation: string | null;
  password_hash: string | null;
  department: any;
  manager?: any;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Client {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  allocated_hours: number;
  created_by: string;
  status: ProjectStatus;
  client_id: string;
  client?: Client;
  completed_at?: string | null;
}