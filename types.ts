export interface Contact {
  id: string; // Added ID for reliable CRUD operations
  ramal: string;
  nome: string;
  departamento: string;
}

export interface AppConfig {
  title: string;
  subtitle: string;
  primaryColor: string;
  logoUrl?: string;
}

export enum SortOption {
  NAME_ASC = 'NAME_ASC',
  NAME_DESC = 'NAME_DESC',
  RAMAL_ASC = 'RAMAL_ASC',
  DEPT_ASC = 'DEPT_ASC',
}