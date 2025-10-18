// types/notes.ts
export interface Project {
  id: number;
  name: string;
  target: string;
  status: string;
  createdAt?: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  target: string;
  category: string;
  tags: string[];
  severity: string;
  status: string;
  created_at: number;
  updated_at: number;
  project_id?: number;
}

export interface NewNote {
  title: string;
  content: string;
  target: string;
  category: string;
  tags: string[];
  severity: string;
  status: string;
}

export interface ApiResponse<T> {
  notes?: T[];
  categories?: string[];
  tags?: string[];
  note?: T;
}