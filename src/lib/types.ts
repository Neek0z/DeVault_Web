export type ProjectStatus = 'active' | 'paused' | 'abandoned' | 'idea';

export type JournalType = 'note' | 'idea' | 'bug' | 'decision';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  stack: string[];
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: string;
  project_id: string;
  service: string;
  login: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  project_id: string;
  type: JournalType;
  title: string | null;
  body: string;
  tags: string[];
  created_at: string;
}

export interface Todo {
  id: string;
  project_id: string;
  text: string;
  completed: boolean;
  created_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  category: string | null;
  promoted_to_project_id: string | null;
  created_at: string;
}
