export interface ModuleResponse {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  active: boolean;
  sortOrder: number;
}

export interface UserModuleAccessResponse {
  id: string;
  userId: string;
  moduleId: string;
  moduleName: string;
  accessLevel: 'VIEWER' | 'EDITOR' | 'MANAGER' | string;
  departmentId?: string;
  moduleActive: boolean;
}
