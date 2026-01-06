// Enhanced TypeScript interfaces for Roles & Permissions Management

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
  permissions: Permission[];
  user_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description: string;
  level?: number;
  permission_ids: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permission_ids?: number[];
  is_active?: boolean;
}

export interface RoleFormData {
  name: string;
  description: string;
  selectedPermissions: number[];
}

export interface RoleFormErrors {
  name?: string;
  description?: string;
  selectedPermissions?: string;
  general?: string;
}

export interface PermissionGroup {
  category: string;
  permissions: Permission[];
}

export interface RoleTableColumn {
  key: keyof Role | 'actions';
  label: string;
  sortable: boolean;
  width?: string;
}

export interface RoleTableSort {
  column: keyof Role;
  direction: 'asc' | 'desc';
}

export interface RoleTableFilters {
  search: string;
  isSystem: 'all' | 'system' | 'custom';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface RoleDeleteValidation {
  can_delete: boolean;
  user_count: number;
  warnings: string[];
}

export interface BulkRoleAction {
  action: 'activate' | 'deactivate' | 'delete';
  role_ids: number[];
}

export interface RoleActivity {
  id: number;
  role_id: number;
  action: string;
  user_id: number;
  user_name: string;
  details: Record<string, any>;
  created_at: string;
}

export interface LoadingState {
  roles: boolean;
  permissions: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  validating: boolean;
  modal: boolean;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Type constants for better type safety
export const RoleStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;
export type RoleStatus = typeof RoleStatus[keyof typeof RoleStatus];

export const RoleType = {
  SYSTEM: 'system',
  CUSTOM: 'custom'
} as const;
export type RoleType = typeof RoleType[keyof typeof RoleType];

export const PermissionCategory = {
  USER_MANAGEMENT: 'user_management',
  ROLE_MANAGEMENT: 'role_management',
  SYSTEM_SETTINGS: 'system_settings',
  CONTENT_MANAGEMENT: 'content_management',
  ANALYTICS: 'analytics',
  REPORTING: 'reporting'
} as const;
export type PermissionCategory = typeof PermissionCategory[keyof typeof PermissionCategory];

export const SortDirection = {
  ASC: 'asc',
  DESC: 'desc'
} as const;
export type SortDirection = typeof SortDirection[keyof typeof SortDirection];

// Utility types
export type RoleFormMode = 'create' | 'edit';
export type ModalState = 'closed' | 'create' | 'edit' | 'delete' | 'view';