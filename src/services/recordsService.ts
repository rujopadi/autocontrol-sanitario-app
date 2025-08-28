// Servicio para registros (delivery, storage, etc.)
import { apiService, ApiResponse } from './api';
import { DeliveryRecord, StorageRecord, TechnicalSheet } from '../types';

export interface RecordsFilters {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  supplier?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}

export interface RecordsListResponse<T> {
  records: T[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface StatsResponse {
  totalDeliveries?: number;
  acceptedDeliveries?: number;
  rejectedDeliveries?: number;
  acceptanceRate?: number;
  uniqueCategories?: number;
  totalReadings?: number;
  outOfRangeCount?: number;
  avgTemp?: number;
  minTemp?: number;
  maxTemp?: number;
}

export class RecordsService {
  // Delivery Records
  async getDeliveryRecords(filters?: RecordsFilters): Promise<ApiResponse<RecordsListResponse<DeliveryRecord>>> {
    return apiService.get<RecordsListResponse<DeliveryRecord>>('/api/records/delivery', filters);
  }

  async getDeliveryRecord(id: string): Promise<ApiResponse<DeliveryRecord>> {
    return apiService.get<DeliveryRecord>(`/api/records/delivery/${id}`);
  }

  async createDeliveryRecord(data: Omit<DeliveryRecord, 'id' | 'userId'>): Promise<ApiResponse<DeliveryRecord>> {
    return apiService.post<DeliveryRecord>('/api/records/delivery', data);
  }

  async updateDeliveryRecord(id: string, data: Partial<DeliveryRecord>): Promise<ApiResponse<DeliveryRecord>> {
    return apiService.put<DeliveryRecord>(`/api/records/delivery/${id}`, data);
  }

  async deleteDeliveryRecord(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/api/records/delivery/${id}`);
  }

  async getDeliveryStats(filters?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<StatsResponse>> {
    return apiService.get<StatsResponse>('/api/records/delivery/stats/summary', filters);
  }

  // Storage Records
  async getStorageRecords(filters?: RecordsFilters): Promise<ApiResponse<RecordsListResponse<StorageRecord>>> {
    return apiService.get<RecordsListResponse<StorageRecord>>('/api/records/storage', filters);
  }

  async getStorageRecord(id: string): Promise<ApiResponse<StorageRecord>> {
    return apiService.get<StorageRecord>(`/api/records/storage/${id}`);
  }

  async createStorageRecord(data: Omit<StorageRecord, 'id' | 'userId'>): Promise<ApiResponse<StorageRecord>> {
    return apiService.post<StorageRecord>('/api/records/storage', data);
  }

  async updateStorageRecord(id: string, data: Partial<StorageRecord>): Promise<ApiResponse<StorageRecord>> {
    return apiService.put<StorageRecord>(`/api/records/storage/${id}`, data);
  }

  async deleteStorageRecord(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/api/records/storage/${id}`);
  }

  async getStorageStats(filters?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<StatsResponse[]>> {
    return apiService.get<StatsResponse[]>('/api/records/storage/stats/temperature', filters);
  }

  // Technical Sheets
  async getTechnicalSheets(filters?: RecordsFilters): Promise<ApiResponse<RecordsListResponse<TechnicalSheet>>> {
    return apiService.get<RecordsListResponse<TechnicalSheet>>('/api/technical-sheets', filters);
  }

  async getTechnicalSheet(id: string): Promise<ApiResponse<TechnicalSheet>> {
    return apiService.get<TechnicalSheet>(`/api/technical-sheets/${id}`);
  }

  async createTechnicalSheet(data: Omit<TechnicalSheet, 'id'>): Promise<ApiResponse<TechnicalSheet>> {
    return apiService.post<TechnicalSheet>('/api/technical-sheets', data);
  }

  async updateTechnicalSheet(id: string, data: Partial<TechnicalSheet>): Promise<ApiResponse<TechnicalSheet>> {
    return apiService.put<TechnicalSheet>(`/api/technical-sheets/${id}`, data);
  }

  async deleteTechnicalSheet(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/api/technical-sheets/${id}`);
  }

  // Exportar registros
  async exportRecords(
    type: 'delivery' | 'storage' | 'technical-sheets',
    format: 'json' | 'csv' | 'excel' = 'csv',
    filters?: RecordsFilters
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    const params = { ...filters, format };
    return apiService.get<{ downloadUrl: string }>(`/api/records/${type}/export`, params);
  }

  // Importar registros
  async importRecords(
    type: 'delivery' | 'storage' | 'technical-sheets',
    file: File
  ): Promise<ApiResponse<{ imported: number; errors: any[] }>> {
    return apiService.upload<{ imported: number; errors: any[] }>(`/api/records/${type}/import`, file);
  }

  // Búsqueda avanzada
  async searchRecords(
    type: 'delivery' | 'storage' | 'technical-sheets',
    query: string,
    filters?: RecordsFilters
  ): Promise<ApiResponse<RecordsListResponse<any>>> {
    const params = { ...filters, q: query };
    return apiService.get<RecordsListResponse<any>>(`/api/records/${type}/search`, params);
  }
}

export const recordsService = new RecordsService();