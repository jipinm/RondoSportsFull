import type { 
  Role, 
  Permission, 
  CreateRoleRequest, 
  UpdateRoleRequest, 
  ApiResponse, 
  PaginatedResponse, 
  RoleDeleteValidation,
  BulkRoleAction,
  RoleActivity
} from '../types/roles';
import { apiClient } from './api-client';

class RolesApiService {
  private readonly baseUrl = '/admin/roles-management';

  /**
   * Get all roles with optional pagination and filtering
   */
  async getRoles(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    is_system?: boolean;
    sort_by?: string;
    sort_direction?: string;
  }): Promise<ApiResponse<PaginatedResponse<Role>>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = queryParams.toString() 
        ? `${this.baseUrl}?${queryParams.toString()}`
        : this.baseUrl;

      const response = await apiClient.get<{ success: boolean; data: Role[] }>(url);
      
      // Backend returns { success: true, data: roles[] }
      // We need to format it as a paginated response for frontend compatibility
      const paginatedData: PaginatedResponse<Role> = {
        data: response.data,
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_items: response.data.length,
          items_per_page: response.data.length
        }
      };
      
      return { success: true, data: paginatedData };
    } catch (error) {
      console.error('Error fetching roles:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch roles' 
      };
    }
  }

  /**
   * Get single role by ID
   */
  async getRole(id: number): Promise<ApiResponse<Role>> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Role }>(`${this.baseUrl}/${id}`);
      
      if (!response.success || !response.data) {
        throw new Error('Invalid role response format');
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error fetching role:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch role' 
      };
    }
  }

  /**
   * Create a new role
   */
  async createRole(roleData: CreateRoleRequest): Promise<ApiResponse<Role>> {
    try {
      const response = await apiClient.post<Role>(this.baseUrl, roleData);
      return { success: true, data: response };
    } catch (error: any) {
      console.error('Error creating role:', error);
      
      if (error?.response?.data?.errors) {
        return {
          success: false,
          message: error.response.data.message || 'Validation failed',
          errors: error.response.data.errors
        };
      }
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to create role' 
      };
    }
  }

  /**
   * Update an existing role
   */
  async updateRole(id: number, roleData: UpdateRoleRequest): Promise<ApiResponse<Role>> {
    try {
      const response = await apiClient.put<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`, roleData);
      
      if (response.success) {
        // After successful update, fetch the updated role data
        const updatedRoleResponse = await this.getRole(id);
        if (updatedRoleResponse.success && updatedRoleResponse.data) {
          return { success: true, data: updatedRoleResponse.data };
        }
      }
      
      return { success: true, data: {} as Role }; // Return empty role on success but no data
    } catch (error: any) {
      console.error('Error updating role:', error);
      
      if (error?.response?.data?.errors) {
        return {
          success: false,
          message: error.response.data.message || 'Validation failed',
          errors: error.response.data.errors
        };
      }
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to update role' 
      };
    }
  }

  /**
   * Validate role deletion (check for assigned users)
   */
  async validateRoleDeletion(id: number): Promise<ApiResponse<RoleDeleteValidation>> {
    try {
      const response = await apiClient.get<{ success: boolean; data: RoleDeleteValidation }>(`${this.baseUrl}/${id}/validate-delete`);
      
      if (!response.success || !response.data) {
        throw new Error('Invalid validation response format');
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error validating role deletion:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to validate deletion' 
      };
    }
  }

  /**
   * Delete a role
   */
  async deleteRole(id: number, force = false): Promise<ApiResponse<void>> {
    try {
      const url = force ? `${this.baseUrl}/${id}?force=true` : `${this.baseUrl}/${id}`;
      await apiClient.delete(url);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting role:', error);
      
      if (error?.response?.data?.errors) {
        return {
          success: false,
          message: error.response.data.message || 'Deletion failed',
          errors: error.response.data.errors
        };
      }
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to delete role' 
      };
    }
  }

  /**
   * Perform bulk actions on multiple roles
   */
  async bulkAction(action: BulkRoleAction): Promise<ApiResponse<{ processed: number; failed: number }>> {
    try {
      const response = await apiClient.post<{ processed: number; failed: number }>(`${this.baseUrl}/bulk`, action);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error performing bulk action:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Bulk action failed' 
      };
    }
  }

  /**
   * Get role activity history
   */
  async getRoleActivity(id: number, params?: {
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<PaginatedResponse<RoleActivity>>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = queryParams.toString() 
        ? `${this.baseUrl}/${id}/activity?${queryParams.toString()}`
        : `${this.baseUrl}/${id}/activity`;

      const response = await apiClient.get<PaginatedResponse<RoleActivity>>(url);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error fetching role activity:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch activity' 
      };
    }
  }

  /**
   * Get all available permissions
   */
  async getPermissions(): Promise<ApiResponse<Permission[]>> {
    try {
      const response = await apiClient.get<{ 
        success: boolean; 
        data: { 
          permissions: Permission[]; 
          grouped: Record<string, Permission[]> 
        } 
      }>('/admin/permissions');
      
      // Check if the response has the expected structure
      if (!response.success || !response.data || !response.data.permissions || !Array.isArray(response.data.permissions)) {
        throw new Error('Invalid permissions response format');
      }
      
      return { success: true, data: response.data.permissions };
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch permissions' 
      };
    }
  }

  /**
   * Get permissions grouped by category
   */
  async getPermissionsGrouped(): Promise<ApiResponse<Record<string, Permission[]>>> {
    try {
      const response = await apiClient.get<{ 
        success: boolean; 
        data: { 
          permissions: Permission[]; 
          grouped: Record<string, Permission[]> 
        } 
      }>('/admin/permissions');
      
      // Check if the response has the expected structure
      if (!response.success || !response.data || !response.data.grouped) {
        throw new Error('Invalid permissions response format');
      }
      
      return { success: true, data: response.data.grouped };
    } catch (error) {
      console.error('Error fetching grouped permissions:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch permissions' 
      };
    }
  }

  /**
   * Check if current user has specific permission
   */
  async checkPermission(permission: string): Promise<boolean> {
    try {
      const response = await apiClient.get<{ has_permission: boolean }>(`/auth/check-permission/${permission}`);
      return response.has_permission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get current user's permissions
   */
  async getCurrentUserPermissions(): Promise<ApiResponse<string[]>> {
    try {
      const response = await apiClient.get<{ permissions: string[] }>('/auth/permissions');
      return { success: true, data: response.permissions };
    } catch (error) {
      console.error('Error fetching current user permissions:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch permissions' 
      };
    }
  }
}

// Export singleton instance
export const rolesApi = new RolesApiService();
export default rolesApi;