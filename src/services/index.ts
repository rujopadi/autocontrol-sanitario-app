// Exportar todos los servicios
export { apiService, createApiError, isApiError, getErrorMessage, getValidationErrors } from './api';
export type { ApiResponse, ApiError } from './api';

export { authService } from './authService';
export type { LoginCredentials, LoginResponse, RegisterResponse } from './authService';

export { organizationService } from './organizationService';
export type { 
  InviteUserData, 
  UpdateUserRoleData, 
  OrganizationSettings, 
  OrganizationBranding 
} from './organizationService';

export { recordsService } from './recordsService';
export type { 
  RecordsFilters, 
  RecordsListResponse, 
  StatsResponse 
} from './recordsService';

export { configService } from './configService';

// Configurar callbacks del servicio API
import { apiService } from './api';

// Esta función debe ser llamada desde el contexto de autenticación
export const configureApiService = (
  onTokenRefresh: (newToken: string) => void,
  onAuthError: () => void
) => {
  apiService.setTokenRefreshCallback(onTokenRefresh);
  apiService.setAuthErrorCallback(onAuthError);
};