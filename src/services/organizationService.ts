// Servicio de organización
import { apiService, ApiResponse } from './api';
import { Organization } from '../contexts/AuthContext';
import { OrganizationUser, OrganizationInvitation, OrganizationStats } from '../contexts/OrganizationContext';

export interface InviteUserData {
  email: string;
  role: 'Admin' | 'Manager' | 'User';
}

export interface UpdateUserRoleData {
  role: 'Admin' | 'Manager' | 'User';
}

export interface OrganizationSettings {
  allowUserRegistration: boolean;
  requireEmailVerification: boolean;
  sessionTimeout: number;
}

export interface OrganizationBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export class OrganizationService {
  // Obtener información de la organización
  async getOrganization(): Promise<ApiResponse<Organization>> {
    return apiService.get<Organization>('/api/organization');
  }

  // Actualizar organización
  async updateOrganization(data: Partial<Organization>): Promise<ApiResponse<{ organization: Organization }>> {
    return apiService.put<{ organization: Organization }>('/api/organization', data);
  }

  // Actualizar configuración
  async updateSettings(settings: Partial<OrganizationSettings>): Promise<ApiResponse<{ organization: Organization }>> {
    return apiService.put<{ organization: Organization }>('/api/organization/settings', { settings });
  }

  // Actualizar branding
  async updateBranding(branding: Partial<OrganizationBranding>): Promise<ApiResponse<{ organization: Organization }>> {
    return apiService.put<{ organization: Organization }>('/api/organization/branding', { branding });
  }

  // Gestión de usuarios
  async getUsers(): Promise<ApiResponse<OrganizationUser[]>> {
    return apiService.get<OrganizationUser[]>('/api/organization/users');
  }

  async inviteUser(data: InviteUserData): Promise<ApiResponse<OrganizationInvitation>> {
    return apiService.post<OrganizationInvitation>('/api/organization/invite', data);
  }

  async updateUserRole(userId: string, data: UpdateUserRoleData): Promise<ApiResponse<{ user: OrganizationUser }>> {
    return apiService.put<{ user: OrganizationUser }>(`/api/organization/users/${userId}/role`, data);
  }

  async deactivateUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.put<{ message: string }>(`/api/organization/users/${userId}/deactivate`);
  }

  async reactivateUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.put<{ message: string }>(`/api/organization/users/${userId}/reactivate`);
  }

  async removeUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/api/organization/users/${userId}`);
  }

  // Gestión de invitaciones
  async getInvitations(): Promise<ApiResponse<OrganizationInvitation[]>> {
    return apiService.get<OrganizationInvitation[]>('/api/organization/invitations');
  }

  async cancelInvitation(invitationId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.put<{ message: string }>(`/api/organization/invitations/${invitationId}/cancel`);
  }

  async resendInvitation(invitationId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/api/organization/invitations/${invitationId}/resend`);
  }

  // Estadísticas
  async getStats(): Promise<ApiResponse<OrganizationStats>> {
    return apiService.get<OrganizationStats>('/api/organization/stats');
  }

  // Subir logo
  async uploadLogo(file: File): Promise<ApiResponse<{ logoUrl: string }>> {
    return apiService.upload<{ logoUrl: string }>('/api/organization/logo', file);
  }

  // Exportar datos
  async exportData(format: 'json' | 'csv' = 'json'): Promise<ApiResponse<{ downloadUrl: string }>> {
    return apiService.get<{ downloadUrl: string }>('/api/organization/export', { format });
  }
}

export const organizationService = new OrganizationService();