// Servicio para datos de configuración (suppliers, product types, etc.)
import { apiService, ApiResponse } from './api';
import { Supplier, ProductType, StorageUnit, EstablishmentInfo } from '../types';

export class ConfigService {
  // Suppliers
  async getSuppliers(): Promise<ApiResponse<Supplier[]>> {
    return apiService.get<Supplier[]>('/api/suppliers');
  }

  async createSupplier(data: Omit<Supplier, 'id'>): Promise<ApiResponse<Supplier>> {
    return apiService.post<Supplier>('/api/suppliers', data);
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    return apiService.put<Supplier>(`/api/suppliers/${id}`, data);
  }

  async deleteSupplier(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/api/suppliers/${id}`);
  }

  // Product Types
  async getProductTypes(): Promise<ApiResponse<ProductType[]>> {
    return apiService.get<ProductType[]>('/api/product-types');
  }

  async createProductType(data: Omit<ProductType, 'id'>): Promise<ApiResponse<ProductType>> {
    return apiService.post<ProductType>('/api/product-types', data);
  }

  async updateProductType(id: string, data: Partial<ProductType>): Promise<ApiResponse<ProductType>> {
    return apiService.put<ProductType>(`/api/product-types/${id}`, data);
  }

  async deleteProductType(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/api/product-types/${id}`);
  }

  // Storage Units
  async getStorageUnits(): Promise<ApiResponse<StorageUnit[]>> {
    return apiService.get<StorageUnit[]>('/api/storage-units');
  }

  async createStorageUnit(data: Omit<StorageUnit, 'id'>): Promise<ApiResponse<StorageUnit>> {
    return apiService.post<StorageUnit>('/api/storage-units', data);
  }

  async updateStorageUnit(id: string, data: Partial<StorageUnit>): Promise<ApiResponse<StorageUnit>> {
    return apiService.put<StorageUnit>(`/api/storage-units/${id}`, data);
  }

  async deleteStorageUnit(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/api/storage-units/${id}`);
  }

  // Establishment Info
  async getEstablishmentInfo(): Promise<ApiResponse<EstablishmentInfo>> {
    return apiService.get<EstablishmentInfo>('/api/establishment');
  }

  async updateEstablishmentInfo(data: EstablishmentInfo): Promise<ApiResponse<EstablishmentInfo>> {
    return apiService.post<EstablishmentInfo>('/api/establishment', data);
  }

  // Categorías predefinidas
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiService.get<string[]>('/api/config/categories');
  }

  async getUnits(): Promise<ApiResponse<string[]>> {
    return apiService.get<string[]>('/api/config/units');
  }

  async getStorageTypes(): Promise<ApiResponse<string[]>> {
    return apiService.get<string[]>('/api/config/storage-types');
  }

  async getTransportConditions(): Promise<ApiResponse<string[]>> {
    return apiService.get<string[]>('/api/config/transport-conditions');
  }
}

export const configService = new ConfigService();