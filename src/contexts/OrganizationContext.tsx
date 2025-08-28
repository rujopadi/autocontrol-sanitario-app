import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Tipos para el contexto de organización
export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'User';
  isActive: boolean;
  lastLogin?: Date;
  invitedAt?: Date;
  invitedBy?: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: 'Admin' | 'Manager' | 'User';
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

export interface OrganizationStats {
  totalUsers: number;
  activeUsers: number;
  totalRecords: number;
  recordsThisMonth: number;
  storageUsed: number;
  lastActivity?: Date;
}

export interface OrganizationState {
  users: OrganizationUser[];
  invitations: OrganizationInvitation[];
  stats: OrganizationStats | null;
  isLoading: boolean;
  error: string | null;
}

// Tipos de acciones para el reducer
type OrganizationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_USERS'; payload: OrganizationUser[] }
  | { type: 'ADD_USER'; payload: OrganizationUser }
  | { type: 'UPDATE_USER'; payload: { id: string; data: Partial<OrganizationUser> } }
  | { type: 'REMOVE_USER'; payload: string }
  | { type: 'SET_INVITATIONS'; payload: OrganizationInvitation[] }
  | { type: 'ADD_INVITATION'; payload: OrganizationInvitation }
  | { type: 'UPDATE_INVITATION'; payload: { id: string; data: Partial<OrganizationInvitation> } }
  | { type: 'REMOVE_INVITATION'; payload: string }
  | { type: 'SET_STATS'; payload: OrganizationStats };

// Estado inicial
const initialState: OrganizationState = {
  users: [],
  invitations: [],
  stats: null,
  isLoading: false,
  error: null,
};

// Reducer para manejar el estado de la organización
const organizationReducer = (state: OrganizationState, action: OrganizationAction): OrganizationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_USERS':
      return { ...state, users: action.payload };

    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };

    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id
            ? { ...user, ...action.payload.data }
            : user
        ),
      };

    case 'REMOVE_USER':
      return {
        ...state,
        users: state.users.filter(user => user.id !== action.payload),
      };

    case 'SET_INVITATIONS':
      return { ...state, invitations: action.payload };

    case 'ADD_INVITATION':
      return { ...state, invitations: [...state.invitations, action.payload] };

    case 'UPDATE_INVITATION':
      return {
        ...state,
        invitations: state.invitations.map(invitation =>
          invitation.id === action.payload.id
            ? { ...invitation, ...action.payload.data }
            : invitation
        ),
      };

    case 'REMOVE_INVITATION':
      return {
        ...state,
        invitations: state.invitations.filter(invitation => invitation.id !== action.payload),
      };

    case 'SET_STATS':
      return { ...state, stats: action.payload };

    default:
      return state;
  }
};

// Interfaz del contexto
interface OrganizationContextType extends OrganizationState {
  // Gestión de usuarios
  loadUsers: () => Promise<void>;
  inviteUser: (email: string, role: 'Admin' | 'Manager' | 'User') => Promise<void>;
  updateUserRole: (userId: string, role: 'Admin' | 'Manager' | 'User') => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  
  // Gestión de invitaciones
  loadInvitations: () => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;
  
  // Estadísticas
  loadStats: () => Promise<void>;
  
  // Utilidades
  clearError: () => void;
}

// Crear el contexto
const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Hook para usar el contexto
export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization debe ser usado dentro de un OrganizationProvider');
  }
  return context;
};

// URL de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Provider del contexto
export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(organizationReducer, initialState);
  const { token, isAuthenticated, user } = useAuth();

  // Función para hacer peticiones autenticadas
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-auth-token': token,
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    return response;
  };

  // Cargar usuarios de la organización
  const loadUsers = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await authenticatedFetch('/api/organization/users');
      const data = await response.json();
      
      dispatch({ type: 'SET_USERS', payload: data.data || [] });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Invitar usuario
  const inviteUser = async (email: string, role: 'Admin' | 'Manager' | 'User') => {
    try {
      const response = await authenticatedFetch('/api/organization/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      
      const data = await response.json();
      
      dispatch({ type: 'ADD_INVITATION', payload: data.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Actualizar rol de usuario
  const updateUserRole = async (userId: string, role: 'Admin' | 'Manager' | 'User') => {
    try {
      const response = await authenticatedFetch(`/api/organization/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      
      const data = await response.json();
      
      dispatch({
        type: 'UPDATE_USER',
        payload: { id: userId, data: { role } },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Desactivar usuario
  const deactivateUser = async (userId: string) => {
    try {
      await authenticatedFetch(`/api/organization/users/${userId}/deactivate`, {
        method: 'PUT',
      });
      
      dispatch({
        type: 'UPDATE_USER',
        payload: { id: userId, data: { isActive: false } },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Reactivar usuario
  const reactivateUser = async (userId: string) => {
    try {
      await authenticatedFetch(`/api/organization/users/${userId}/reactivate`, {
        method: 'PUT',
      });
      
      dispatch({
        type: 'UPDATE_USER',
        payload: { id: userId, data: { isActive: true } },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Eliminar usuario
  const removeUser = async (userId: string) => {
    try {
      await authenticatedFetch(`/api/organization/users/${userId}`, {
        method: 'DELETE',
      });
      
      dispatch({ type: 'REMOVE_USER', payload: userId });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Cargar invitaciones
  const loadInvitations = async () => {
    try {
      const response = await authenticatedFetch('/api/organization/invitations');
      const data = await response.json();
      
      dispatch({ type: 'SET_INVITATIONS', payload: data.data || [] });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Cancelar invitación
  const cancelInvitation = async (invitationId: string) => {
    try {
      await authenticatedFetch(`/api/organization/invitations/${invitationId}/cancel`, {
        method: 'PUT',
      });
      
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: { id: invitationId, data: { status: 'cancelled' } },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Reenviar invitación
  const resendInvitation = async (invitationId: string) => {
    try {
      await authenticatedFetch(`/api/organization/invitations/${invitationId}/resend`, {
        method: 'POST',
      });
      
      // Actualizar la fecha de expiración
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 días desde ahora
      
      dispatch({
        type: 'UPDATE_INVITATION',
        payload: { id: invitationId, data: { expiresAt: newExpiresAt } },
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      const response = await authenticatedFetch('/api/organization/stats');
      const data = await response.json();
      
      dispatch({ type: 'SET_STATS', payload: data.data });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  // Limpiar error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Cargar datos iniciales cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'Admin' || user.isAdmin)) {
      loadUsers();
      loadInvitations();
      loadStats();
    }
  }, [isAuthenticated, user]);

  const value: OrganizationContextType = {
    ...state,
    loadUsers,
    inviteUser,
    updateUserRole,
    deactivateUser,
    reactivateUser,
    removeUser,
    loadInvitations,
    cancelInvitation,
    resendInvitation,
    loadStats,
    clearError,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};