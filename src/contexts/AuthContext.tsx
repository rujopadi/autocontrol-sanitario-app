import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

// Importar tipos de autenticación
import { AuthUser as User, AuthOrganization as Organization } from '../types/auth';

// Re-exportar para compatibilidad
export type { User, Organization };

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  emailVerificationSent: boolean;
  passwordResetSent: boolean;
}

// Tipos de acciones para el reducer
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string; refreshToken?: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'UPDATE_ORGANIZATION'; payload: Partial<Organization> }
  | { type: 'SET_EMAIL_VERIFICATION_SENT'; payload: boolean }
  | { type: 'SET_PASSWORD_RESET_SENT'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Estado inicial
const initialState: AuthState = {
  user: null,
  organization: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: true,
  isAuthenticated: false,
  error: null,
  emailVerificationSent: false,
  passwordResetSent: false,
};

// Reducer para manejar el estado de autenticación
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        organization: action.payload.user.organization,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken || state.refreshToken,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };

    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        organization: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        token: null,
        refreshToken: null,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case 'UPDATE_ORGANIZATION':
      return {
        ...state,
        organization: state.organization ? { ...state.organization, ...action.payload } : null,
        user: state.user ? {
          ...state.user,
          organization: state.user.organization ? { ...state.user.organization, ...action.payload } : state.user.organization
        } : null,
      };

    case 'SET_EMAIL_VERIFICATION_SENT':
      return {
        ...state,
        emailVerificationSent: action.payload,
      };

    case 'SET_PASSWORD_RESET_SENT':
      return {
        ...state,
        passwordResetSent: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    default:
      return state;
  }
};

// Interfaz del contexto
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  updateOrganization: (orgData: Partial<Organization>) => Promise<void>;
  refreshAuthToken: () => Promise<void>;
  clearError: () => void;
}

// Datos para registro
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  organizationSubdomain?: string;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// URL de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Provider del contexto
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Función para hacer peticiones autenticadas
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(state.token && { 'x-auth-token': state.token }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });

    // Si el token ha expirado, intentar renovarlo
    if (response.status === 401 && state.refreshToken) {
      try {
        await refreshAuthToken();
        // Reintentar la petición original con el nuevo token
        const newHeaders = {
          ...headers,
          'x-auth-token': localStorage.getItem('token') || '',
        };
        return fetch(`${API_URL}${url}`, {
          ...options,
          headers: newHeaders,
        });
      } catch (error) {
        logout();
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    }

    return response;
  };

  // Función de login
  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar tokens en localStorage y configurar API service
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Configurar el servicio API con el nuevo token
      apiService.setToken(data.token, data.refreshToken);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Función de registro
  const register = async (userData: RegisterData) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrarse');
      }

      // Guardar tokens en localStorage y configurar API service
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Configurar el servicio API con el nuevo token
      apiService.setToken(data.token, data.refreshToken);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
        },
      });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.message });
      throw error;
    }
  };

  // Función de logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    apiService.clearTokens();
    dispatch({ type: 'LOGOUT' });
  };

  // Verificar email
  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al verificar email');
      }

      // Actualizar el usuario con emailVerified: true
      dispatch({
        type: 'UPDATE_USER',
        payload: { emailVerified: true },
      });
    } catch (error: any) {
      throw error;
    }
  };

  // Reenviar verificación de email
  const resendEmailVerification = async () => {
    try {
      const response = await authenticatedFetch('/api/auth/resend-verification', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al reenviar verificación');
      }

      dispatch({ type: 'SET_EMAIL_VERIFICATION_SENT', payload: true });
    } catch (error: any) {
      throw error;
    }
  };

  // Solicitar reset de contraseña
  const requestPasswordReset = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al solicitar reset de contraseña');
      }

      dispatch({ type: 'SET_PASSWORD_RESET_SENT', payload: true });
    } catch (error: any) {
      throw error;
    }
  };

  // Reset de contraseña
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al resetear contraseña');
      }
    } catch (error: any) {
      throw error;
    }
  };

  // Actualizar perfil
  const updateProfile = async (userData: Partial<User>) => {
    try {
      const response = await authenticatedFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al actualizar perfil');
      }

      dispatch({ type: 'UPDATE_USER', payload: data.user });
    } catch (error: any) {
      throw error;
    }
  };

  // Actualizar organización
  const updateOrganization = async (orgData: Partial<Organization>) => {
    try {
      const response = await authenticatedFetch('/api/organization', {
        method: 'PUT',
        body: JSON.stringify(orgData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al actualizar organización');
      }

      dispatch({ type: 'UPDATE_ORGANIZATION', payload: data.organization });
    } catch (error: any) {
      throw error;
    }
  };

  // Renovar token
  const refreshAuthToken = async () => {
    if (!state.refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al renovar token');
      }

      localStorage.setItem('token', data.token);
      apiService.setToken(data.token, state.refreshToken || undefined);
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: state.user!,
          token: data.token,
          refreshToken: state.refreshToken,
        },
      });
    } catch (error: any) {
      logout();
      throw error;
    }
  };

  // Limpiar error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'x-auth-token': token },
        });

        const data = await response.json();

        if (response.ok) {
          // Configurar el servicio API con el token existente
          apiService.setToken(token, localStorage.getItem('refreshToken') || undefined);
          
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: data.user,
              token,
              refreshToken: localStorage.getItem('refreshToken') || undefined,
            },
          });
        } else {
          // Token inválido
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          apiService.clearTokens();
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        apiService.clearTokens();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    verifyEmail,
    resendEmailVerification,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    updateOrganization,
    refreshAuthToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};