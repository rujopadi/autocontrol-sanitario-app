import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { recordsService, configService } from '../services';

// Importar tipos existentes (mantenemos compatibilidad)
import { 
  DeliveryRecord, 
  StorageRecord, 
  TechnicalSheet,
  Supplier,
  ProductType,
  StorageUnit,
  DailySurface,
  DailyCleaningRecord,
  FrequentArea,
  Costing,
  OutgoingRecord,
  ElaboratedRecord,
  EstablishmentInfo
} from '../types';

// Estado de la aplicación
export interface AppDataState {
  // Datos principales
  deliveryRecords: DeliveryRecord[];
  storageRecords: StorageRecord[];
  technicalSheets: TechnicalSheet[];
  
  // Datos de configuración
  suppliers: Supplier[];
  productTypes: ProductType[];
  storageUnits: StorageUnit[];
  
  // Datos de limpieza
  dailySurfaces: DailySurface[];
  dailyCleaningRecords: DailyCleaningRecord[];
  frequentAreas: FrequentArea[];
  
  // Datos de costos y producción
  costings: Costing[];
  outgoingRecords: OutgoingRecord[];
  elaboratedRecords: ElaboratedRecord[];
  
  // Información del establecimiento
  establishmentInfo: EstablishmentInfo | null;
  
  // Estado de carga
  isLoading: boolean;
  error: string | null;
  
  // Estado de sincronización
  lastSync: Date | null;
  hasUnsavedChanges: boolean;
}

// Tipos de acciones para el reducer
type AppDataAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LAST_SYNC'; payload: Date }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  
  // Delivery Records
  | { type: 'SET_DELIVERY_RECORDS'; payload: DeliveryRecord[] }
  | { type: 'ADD_DELIVERY_RECORD'; payload: DeliveryRecord }
  | { type: 'UPDATE_DELIVERY_RECORD'; payload: { id: string; data: Partial<DeliveryRecord> } }
  | { type: 'REMOVE_DELIVERY_RECORD'; payload: string }
  
  // Storage Records
  | { type: 'SET_STORAGE_RECORDS'; payload: StorageRecord[] }
  | { type: 'ADD_STORAGE_RECORD'; payload: StorageRecord }
  | { type: 'UPDATE_STORAGE_RECORD'; payload: { id: string; data: Partial<StorageRecord> } }
  | { type: 'REMOVE_STORAGE_RECORD'; payload: string }
  
  // Technical Sheets
  | { type: 'SET_TECHNICAL_SHEETS'; payload: TechnicalSheet[] }
  | { type: 'ADD_TECHNICAL_SHEET'; payload: TechnicalSheet }
  | { type: 'UPDATE_TECHNICAL_SHEET'; payload: { id: string; data: Partial<TechnicalSheet> } }
  | { type: 'REMOVE_TECHNICAL_SHEET'; payload: string }
  
  // Configuration data
  | { type: 'SET_SUPPLIERS'; payload: Supplier[] }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'REMOVE_SUPPLIER'; payload: string }
  
  | { type: 'SET_PRODUCT_TYPES'; payload: ProductType[] }
  | { type: 'ADD_PRODUCT_TYPE'; payload: ProductType }
  | { type: 'REMOVE_PRODUCT_TYPE'; payload: string }
  
  | { type: 'SET_STORAGE_UNITS'; payload: StorageUnit[] }
  | { type: 'ADD_STORAGE_UNIT'; payload: StorageUnit }
  | { type: 'REMOVE_STORAGE_UNIT'; payload: string }
  
  // Cleaning data
  | { type: 'SET_DAILY_SURFACES'; payload: DailySurface[] }
  | { type: 'ADD_DAILY_SURFACE'; payload: DailySurface }
  | { type: 'REMOVE_DAILY_SURFACE'; payload: string }
  
  | { type: 'SET_DAILY_CLEANING_RECORDS'; payload: DailyCleaningRecord[] }
  | { type: 'ADD_DAILY_CLEANING_RECORD'; payload: DailyCleaningRecord }
  | { type: 'REMOVE_DAILY_CLEANING_RECORD'; payload: string }
  
  | { type: 'SET_FREQUENT_AREAS'; payload: FrequentArea[] }
  | { type: 'ADD_FREQUENT_AREA'; payload: FrequentArea }
  | { type: 'REMOVE_FREQUENT_AREA'; payload: string }
  | { type: 'CLEAN_FREQUENT_AREA'; payload: string }
  
  // Production data
  | { type: 'SET_COSTINGS'; payload: Costing[] }
  | { type: 'SET_OUTGOING_RECORDS'; payload: OutgoingRecord[] }
  | { type: 'ADD_OUTGOING_RECORD'; payload: OutgoingRecord }
  | { type: 'REMOVE_OUTGOING_RECORD'; payload: string }
  
  | { type: 'SET_ELABORATED_RECORDS'; payload: ElaboratedRecord[] }
  | { type: 'ADD_ELABORATED_RECORD'; payload: ElaboratedRecord }
  | { type: 'REMOVE_ELABORATED_RECORD'; payload: string }
  
  // Establishment info
  | { type: 'SET_ESTABLISHMENT_INFO'; payload: EstablishmentInfo };

// Estado inicial
const initialState: AppDataState = {
  deliveryRecords: [],
  storageRecords: [],
  technicalSheets: [],
  suppliers: [],
  productTypes: [],
  storageUnits: [],
  dailySurfaces: [],
  dailyCleaningRecords: [],
  frequentAreas: [],
  costings: [],
  outgoingRecords: [],
  elaboratedRecords: [],
  establishmentInfo: null,
  isLoading: false,
  error: null,
  lastSync: null,
  hasUnsavedChanges: false,
};

// Reducer para manejar el estado de los datos
const appDataReducer = (state: AppDataState, action: AppDataAction): AppDataState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };

    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };

    // Delivery Records
    case 'SET_DELIVERY_RECORDS':
      return { ...state, deliveryRecords: action.payload };

    case 'ADD_DELIVERY_RECORD':
      return { 
        ...state, 
        deliveryRecords: [action.payload, ...state.deliveryRecords],
        hasUnsavedChanges: true 
      };

    case 'UPDATE_DELIVERY_RECORD':
      return {
        ...state,
        deliveryRecords: state.deliveryRecords.map(record =>
          record.id === action.payload.id
            ? { ...record, ...action.payload.data }
            : record
        ),
        hasUnsavedChanges: true,
      };

    case 'REMOVE_DELIVERY_RECORD':
      return {
        ...state,
        deliveryRecords: state.deliveryRecords.filter(record => record.id !== action.payload),
        hasUnsavedChanges: true,
      };

    // Storage Records
    case 'SET_STORAGE_RECORDS':
      return { ...state, storageRecords: action.payload };

    case 'ADD_STORAGE_RECORD':
      return { 
        ...state, 
        storageRecords: [action.payload, ...state.storageRecords],
        hasUnsavedChanges: true 
      };

    case 'UPDATE_STORAGE_RECORD':
      return {
        ...state,
        storageRecords: state.storageRecords.map(record =>
          record.id === action.payload.id
            ? { ...record, ...action.payload.data }
            : record
        ),
        hasUnsavedChanges: true,
      };

    case 'REMOVE_STORAGE_RECORD':
      return {
        ...state,
        storageRecords: state.storageRecords.filter(record => record.id !== action.payload),
        hasUnsavedChanges: true,
      };

    // Technical Sheets
    case 'SET_TECHNICAL_SHEETS':
      return { ...state, technicalSheets: action.payload };

    case 'ADD_TECHNICAL_SHEET':
      return { 
        ...state, 
        technicalSheets: [action.payload, ...state.technicalSheets],
        hasUnsavedChanges: true 
      };

    case 'UPDATE_TECHNICAL_SHEET':
      return {
        ...state,
        technicalSheets: state.technicalSheets.map(sheet =>
          sheet.id === action.payload.id
            ? { ...sheet, ...action.payload.data }
            : sheet
        ),
        hasUnsavedChanges: true,
      };

    case 'REMOVE_TECHNICAL_SHEET':
      return {
        ...state,
        technicalSheets: state.technicalSheets.filter(sheet => sheet.id !== action.payload),
        hasUnsavedChanges: true,
      };

    // Suppliers
    case 'SET_SUPPLIERS':
      return { ...state, suppliers: action.payload };

    case 'ADD_SUPPLIER':
      return { 
        ...state, 
        suppliers: [...state.suppliers, action.payload],
        hasUnsavedChanges: true 
      };

    case 'REMOVE_SUPPLIER':
      return {
        ...state,
        suppliers: state.suppliers.filter(supplier => supplier.id !== action.payload),
        hasUnsavedChanges: true,
      };

    // Product Types
    case 'SET_PRODUCT_TYPES':
      return { ...state, productTypes: action.payload };

    case 'ADD_PRODUCT_TYPE':
      return { 
        ...state, 
        productTypes: [...state.productTypes, action.payload],
        hasUnsavedChanges: true 
      };

    case 'REMOVE_PRODUCT_TYPE':
      return {
        ...state,
        productTypes: state.productTypes.filter(type => type.id !== action.payload),
        hasUnsavedChanges: true,
      };

    // Storage Units
    case 'SET_STORAGE_UNITS':
      return { ...state, storageUnits: action.payload };

    case 'ADD_STORAGE_UNIT':
      return { 
        ...state, 
        storageUnits: [...state.storageUnits, action.payload],
        hasUnsavedChanges: true 
      };

    case 'REMOVE_STORAGE_UNIT':
      return {
        ...state,
        storageUnits: state.storageUnits.filter(unit => unit.id !== action.payload),
        hasUnsavedChanges: true,
      };

    // Establishment Info
    case 'SET_ESTABLISHMENT_INFO':
      return { ...state, establishmentInfo: action.payload };

    // ... Agregar más casos según sea necesario

    default:
      return state;
  }
};

// Interfaz del contexto
interface AppDataContextType extends AppDataState {
  // Métodos para cargar datos
  loadAllData: () => Promise<void>;
  syncData: () => Promise<void>;
  
  // Delivery Records
  addDeliveryRecord: (record: Omit<DeliveryRecord, 'id' | 'userId'>) => Promise<void>;
  updateDeliveryRecord: (id: string, data: Partial<DeliveryRecord>) => Promise<void>;
  deleteDeliveryRecord: (id: string) => Promise<void>;
  
  // Storage Records
  addStorageRecord: (record: Omit<StorageRecord, 'id' | 'userId'>) => Promise<void>;
  updateStorageRecord: (id: string, data: Partial<StorageRecord>) => Promise<void>;
  deleteStorageRecord: (id: string) => Promise<void>;
  
  // Technical Sheets
  addTechnicalSheet: (sheet: Omit<TechnicalSheet, 'id'>) => Promise<void>;
  updateTechnicalSheet: (id: string, data: Partial<TechnicalSheet>) => Promise<void>;
  deleteTechnicalSheet: (id: string) => Promise<void>;
  
  // Configuration
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  
  addProductType: (type: Omit<ProductType, 'id'>) => Promise<void>;
  deleteProductType: (id: string) => Promise<void>;
  
  addStorageUnit: (unit: Omit<StorageUnit, 'id'>) => Promise<void>;
  deleteStorageUnit: (id: string) => Promise<void>;
  
  // Establishment
  updateEstablishmentInfo: (info: EstablishmentInfo) => Promise<void>;
  
  // Utilidades
  clearError: () => void;
  markAsSaved: () => void;
}

// Crear el contexto
const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Hook para usar el contexto
export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData debe ser usado dentro de un AppDataProvider');
  }
  return context;
};

// Los servicios manejan la URL de la API automáticamente

// Provider del contexto
export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appDataReducer, initialState);
  const { token, isAuthenticated } = useAuth();

  // Los servicios ya manejan la autenticación automáticamente

  // Cargar todos los datos
  const loadAllData = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Cargar datos principales en paralelo usando los servicios
      const [
        deliveryResponse,
        storageResponse,
        technicalSheetsResponse,
        suppliersResponse,
        establishmentResponse
      ] = await Promise.all([
        recordsService.getDeliveryRecords().catch(() => ({ success: false, data: { records: [] } })),
        recordsService.getStorageRecords().catch(() => ({ success: false, data: { records: [] } })),
        recordsService.getTechnicalSheets().catch(() => ({ success: false, data: { records: [] } })),
        configService.getSuppliers().catch(() => ({ success: false, data: [] })),
        configService.getEstablishmentInfo().catch(() => ({ success: false, data: null }))
      ]);

      // Actualizar el estado con todos los datos
      if (deliveryResponse.success && deliveryResponse.data) {
        dispatch({ type: 'SET_DELIVERY_RECORDS', payload: deliveryResponse.data.records || [] });
      }
      
      if (storageResponse.success && storageResponse.data) {
        dispatch({ type: 'SET_STORAGE_RECORDS', payload: storageResponse.data.records || [] });
      }
      
      if (technicalSheetsResponse.success && technicalSheetsResponse.data) {
        dispatch({ type: 'SET_TECHNICAL_SHEETS', payload: technicalSheetsResponse.data.records || [] });
      }
      
      if (suppliersResponse.success && suppliersResponse.data) {
        dispatch({ type: 'SET_SUPPLIERS', payload: suppliersResponse.data });
      }
      
      if (establishmentResponse.success && establishmentResponse.data) {
        dispatch({ type: 'SET_ESTABLISHMENT_INFO', payload: establishmentResponse.data });
      }
      
      dispatch({ type: 'SET_LAST_SYNC', payload: new Date() });
      
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Sincronizar datos
  const syncData = async () => {
    await loadAllData();
    dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
  };

  // Delivery Records
  const addDeliveryRecord = async (record: Omit<DeliveryRecord, 'id' | 'userId'>) => {
    try {
      const response = await recordsService.createDeliveryRecord(record);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_DELIVERY_RECORD', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateDeliveryRecord = async (id: string, recordData: Partial<DeliveryRecord>) => {
    try {
      const response = await recordsService.updateDeliveryRecord(id, recordData);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_DELIVERY_RECORD', payload: { id, data: response.data } });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteDeliveryRecord = async (id: string) => {
    try {
      const response = await recordsService.deleteDeliveryRecord(id);
      if (response.success) {
        dispatch({ type: 'REMOVE_DELIVERY_RECORD', payload: id });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Storage Records
  const addStorageRecord = async (record: Omit<StorageRecord, 'id' | 'userId'>) => {
    try {
      const response = await recordsService.createStorageRecord(record);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_STORAGE_RECORD', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateStorageRecord = async (id: string, recordData: Partial<StorageRecord>) => {
    try {
      const response = await recordsService.updateStorageRecord(id, recordData);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_STORAGE_RECORD', payload: { id, data: response.data } });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteStorageRecord = async (id: string) => {
    try {
      const response = await recordsService.deleteStorageRecord(id);
      if (response.success) {
        dispatch({ type: 'REMOVE_STORAGE_RECORD', payload: id });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Technical Sheets
  const addTechnicalSheet = async (sheet: Omit<TechnicalSheet, 'id'>) => {
    try {
      const response = await recordsService.createTechnicalSheet(sheet);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_TECHNICAL_SHEET', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateTechnicalSheet = async (id: string, sheetData: Partial<TechnicalSheet>) => {
    try {
      const response = await recordsService.updateTechnicalSheet(id, sheetData);
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_TECHNICAL_SHEET', payload: { id, data: response.data } });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteTechnicalSheet = async (id: string) => {
    try {
      const response = await recordsService.deleteTechnicalSheet(id);
      if (response.success) {
        dispatch({ type: 'REMOVE_TECHNICAL_SHEET', payload: id });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Suppliers
  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    try {
      const response = await configService.createSupplier(supplier);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_SUPPLIER', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const response = await configService.deleteSupplier(id);
      if (response.success) {
        dispatch({ type: 'REMOVE_SUPPLIER', payload: id });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Product Types
  const addProductType = async (type: Omit<ProductType, 'id'>) => {
    try {
      const response = await configService.createProductType(type);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_PRODUCT_TYPE', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteProductType = async (id: string) => {
    try {
      const response = await configService.deleteProductType(id);
      if (response.success) {
        dispatch({ type: 'REMOVE_PRODUCT_TYPE', payload: id });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Storage Units
  const addStorageUnit = async (unit: Omit<StorageUnit, 'id'>) => {
    try {
      const response = await configService.createStorageUnit(unit);
      if (response.success && response.data) {
        dispatch({ type: 'ADD_STORAGE_UNIT', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteStorageUnit = async (id: string) => {
    try {
      const response = await configService.deleteStorageUnit(id);
      if (response.success) {
        dispatch({ type: 'REMOVE_STORAGE_UNIT', payload: id });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Establishment Info
  const updateEstablishmentInfo = async (info: EstablishmentInfo) => {
    try {
      const response = await configService.updateEstablishmentInfo(info);
      if (response.success && response.data) {
        dispatch({ type: 'SET_ESTABLISHMENT_INFO', payload: response.data });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  // Utilidades
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const markAsSaved = () => {
    dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
  };

  // Cargar datos cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && token) {
      loadAllData();
    }
  }, [isAuthenticated, token]);

  const value: AppDataContextType = {
    ...state,
    loadAllData,
    syncData,
    addDeliveryRecord,
    updateDeliveryRecord,
    deleteDeliveryRecord,
    addStorageRecord,
    updateStorageRecord,
    deleteStorageRecord,
    addTechnicalSheet,
    updateTechnicalSheet,
    deleteTechnicalSheet,
    addSupplier,
    deleteSupplier,
    addProductType,
    deleteProductType,
    addStorageUnit,
    deleteStorageUnit,
    updateEstablishmentInfo,
    clearError,
    markAsSaved,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};