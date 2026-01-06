import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService, { type AuthUser } from '../services/authService';
import permissionService, { type UserPermissions } from '../services/permissionService';

interface AuthContextType {
  user: AuthUser | null;
  permissions: UserPermissions | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  clearError: () => void;
  checkPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    return authService.getUserData();
  });

  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          // Only fetch fresh user data if we don't have complete user info
          const currentUser = authService.getUserData();
          if (!currentUser?.name || !currentUser?.role) {
            const response = await authService.getCurrentUser();
            if (response.success && response.data) {
              setUser(response.data);
            }
          }

          // Always load permissions
          const userPermissions = await permissionService.getCurrentUserPermissions();
          setPermissions(userPermissions);
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Don't clear user data on initialization errors
          // authService.clearStoredData();
          // setUser(null);
          // setPermissions(null);
        }
      }
    };

    initAuth();
  }, []);

  const isAuthenticated = !!user && authService.isAuthenticated();

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });

      if (response.success && response.data) {
        setUser(response.data.user);
        return true;
      } else {
        setError(response.error || 'Login failed');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      authService.clearStoredData();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async (): Promise<boolean> => {
    try {
      const response = await authService.refreshToken();

      if (response.success) {
        // Get updated user data
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      authService.clearStoredData();
      setUser(null);
      return false;
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const checkPermission = (permission: string): boolean => {
    if (!user || !permissions) {
      return false;
    }

    // Try API check first, fallback to client-side check
    return permissionService.hasPermissionClientSide(user.role, permission);
  };

  const value = {
    user,
    permissions,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshAuth,
    clearError,
    checkPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
