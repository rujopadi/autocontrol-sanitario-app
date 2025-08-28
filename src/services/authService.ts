// Servicio de autenticación
import { apiService, ApiResponse } from './api';
import { User, Organization, RegisterData } from '../contexts/AuthContext';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export class AuthService {
  // Login
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return apiService.post<LoginResponse>('/api/auth/login', credentials);
  }

  // Registro
  async register(userData: RegisterData): Promise<ApiResponse<RegisterResponse>> {
    return apiService.post<RegisterResponse>('/api/auth/register', userData);
  }

  // Obtener usuario actual
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return apiService.get<{ user: User }>('/api/auth/me');
  }

  // Verificar email
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/api/auth/verify-email', { token });
  }

  // Reenviar verificación de email
  async resendEmailVerification(): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/api/auth/resend-verification');
  }

  // Solicitar reset de contraseña
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/api/auth/forgot-password', { email });
  }

  // Resetear contraseña
  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/api/auth/reset-password', { token, password });
  }

  // Actualizar perfil
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return apiService.put<{ user: User }>('/api/auth/profile', userData);
  }

  // Cambiar contraseña
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.put<{ message: string }>('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string }>> {
    return apiService.post<{ token: string }>('/api/auth/refresh', { refreshToken });
  }

  // Logout
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/api/auth/logout');
  }
}

export const authService = new AuthService();