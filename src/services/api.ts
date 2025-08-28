// Servicio API centralizado para manejo de peticiones multi-tenant

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
  pagination?: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefresh?: (newToken: string) => void;
  private onAuthError?: () => void;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  // Configurar callbacks
  setTokenRefreshCallback(callback: (newToken: string) => void) {
    this.onTokenRefresh = callback;
  }

  setAuthErrorCallback(callback: () => void) {
    this.onAuthError = callback;
  }

  // Actualizar token
  setToken(token: string, refreshToken?: string) {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  // Limpiar tokens
  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  // Obtener headers por defecto
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (this.token) {
      headers['x-auth-token'] = this.token;
    }

    return headers;
  }

  // Manejar respuesta de la API
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      throw new ApiError({
        message: 'Error parsing response',
        status: response.status,
      });
    }

    if (!response.ok) {
      // Si es error 401 y tenemos refresh token, intentar renovar
      if (response.status === 401 && this.refreshToken) {
        try {
          await this.refreshAuthToken();
          // No relanzar el error, el caller puede reintentar
          throw new ApiError({
            message: 'Token refreshed, retry request',
            status: 401,
          });
        } catch (refreshError) {
          // Si falla el refresh, limpiar tokens y notificar
          this.clearTokens();
          if (this.onAuthError) {
            this.onAuthError();
          }
          throw new ApiError({
            message: data.message || 'Authentication failed',
            status: response.status,
            errors: data.errors,
          });
        }
      }

      throw new ApiError({
        message: data.message || `HTTP ${response.status}`,
        status: response.status,
        errors: data.errors,
      });
    }

    return data;
  }

  // Renovar token de autenticación
  private async refreshAuthToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.setToken(data.token);
    
    if (this.onTokenRefresh) {
      this.onTokenRefresh(data.token);
    }
  }

  // Método genérico para hacer peticiones
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuth = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && retryOnAuth) {
        // Token fue renovado, reintentar una vez
        const retryResponse = await fetch(url, {
          ...config,
          headers: this.getHeaders(options.headers as Record<string, string>),
        });
        return await this.handleResponse<T>(retryResponse);
      }
      throw error;
    }
  }

  // Métodos HTTP
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Upload de archivos
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers = this.token ? { 'x-auth-token': this.token } : {};
    
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    });
  }
}

// Instancia singleton del servicio API
export const apiService = new ApiService();

// Helper para crear errores de API
export function createApiError(message: string, status: number = 500, errors?: Array<{ field: string; message: string }>): ApiError {
  return { message, status, errors };
}

// Helper para verificar si un error es de API
export function isApiError(error: any): error is ApiError {
  return error && typeof error.message === 'string' && typeof error.status === 'number';
}

// Helper para extraer mensaje de error
export function getErrorMessage(error: any): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error desconocido';
}

// Helper para extraer errores de validación
export function getValidationErrors(error: any): Array<{ field: string; message: string }> {
  if (isApiError(error) && error.errors) {
    return error.errors;
  }
  return [];
}