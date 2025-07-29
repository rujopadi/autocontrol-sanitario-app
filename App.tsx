
import React, { useState, useEffect, useCallback } from 'react';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import { NotificationProvider, useNotifications } from './NotificationContext';
import NotificationContainer from './NotificationContainer';
import { migrateExistingData, isMigrationNeeded } from './utils/dataMigration';

// --- INTERFACES ---

// Base interface para campos de trazabilidad
export interface BaseRecord {
  registeredBy: string; // Nombre del usuario que registró
  registeredById: string; // ID del usuario que registró
  registeredAt: string; // Fecha y hora del registro
}
export interface EstablishmentInfo {
    name: string; 
    address: string; 
    city: string; 
    postalCode: string; 
    phone: string;
    email: string;
    cif: string;
    sanitaryRegistry: string;
    technicalResponsible: string;
    updatedAt?: string;
}
export interface User {
  id: string; // Mongo usa strings para los IDs
  name: string; 
  email: string; 
  password?: string; 
  role: 'Administrador' | 'Usuario' | 'Solo Lectura';
  isActive: boolean;
  isAdmin?: boolean; // Mantener compatibilidad
  companyId: string; // Nuevo campo para asociar usuarios a empresa
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string; // ID del usuario que creó este usuario
}
export interface Supplier {
  id: string; name: string;
}
export interface ProductType {
  id: string; name: string; optimalTemp: number;
}
export interface DeliveryRecord extends BaseRecord {
  id: string; // Mongo usa strings para los IDs
  supplierId: string; productTypeId: string; temperature: string; receptionDate: string; docsOk: boolean; userId: string; albaranImage?: string;
}
// ... resto de interfaces
export interface StorageUnit { id: string; name: string; type: 'Cámara Frigorífica' | 'Cámara Expositora' | 'Cámara de secado'; minTemp?: number; maxTemp?: number; }
export interface StorageRecord extends BaseRecord { id: string; unitId: string; dateTime: string; temperature: string; humidity?: string; rotationCheck: boolean; mincingCheck: boolean; userId: string; }
export interface DailySurface { id: string; name: string; }
export interface DailyCleaningRecord extends BaseRecord { id: string; surfaceId: string; dateTime: string; userId: string; }
export interface FrequentArea { id: string; name: string; frequencyDays: number; lastCleaned: string | null; }
export interface CostingPart { id: string; name: string; weight: number; saleType: 'weight' | 'unit'; quantity?: number; }
export interface Costing { id: string; productName: string; totalWeight: number; purchasePrice: number; parts: CostingPart[]; salePrices: { [partId: string]: string }; }
export interface OutgoingRecord extends BaseRecord { id: string; productName: string; quantity: string; lotIdentifier: string; destinationType: 'sucursal' | 'consumidor'; destination: string; date: string; userId: string; }
export interface ElaboratedRecord extends BaseRecord { id: string; productName: string; elaborationDate: string; productLot: string; ingredients: { name: string; supplier: string; lot: string; quantity: string; }[]; destination: string; quantitySent: string; userId: string; }
export interface TechnicalSheet extends BaseRecord { id: string; productName: string; ingredients: Omit<Ingredient, 'id'>[]; elaboration: string; presentation: string; shelfLife: string; labeling: string; }
export interface Ingredient { id: string; name: string; lot: string; isAllergen: boolean; }

// --- NUEVAS INTERFACES PARA INCIDENCIAS ---
export interface Incident extends BaseRecord {
  id: string;
  title: string;
  description: string;
  detectionDate: string; // ISO string
  affectedArea: string;
  severity: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  status: 'Abierta' | 'En Proceso' | 'Resuelta';
  reportedBy: string; // User ID
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  correctiveActions: CorrectiveAction[];
  resolutionNotes?: string; // Notas de resolución
  resolvedAt?: string; // Fecha de resolución
  resolvedBy?: string; // Usuario que resolvió
}

export interface CorrectiveAction {
  id: string;
  incidentId: string;
  description: string;
  implementationDate: string; // ISO string
  responsibleUser: string; // User ID
  status: 'Pendiente' | 'En Progreso' | 'Completada';
  createdAt: string; // ISO string
}

// --- TIPOS DE UTILIDAD ---
export type IncidentSeverity = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type IncidentStatus = 'Abierta' | 'En Proceso' | 'Resuelta';
export type CorrectiveActionStatus = 'Pendiente' | 'En Progreso' | 'Completada';
export type UserRole = 'Administrador' | 'Usuario' | 'Solo Lectura';

// --- TIPOS PARA FORMULARIOS ---
export type IncidentFormData = Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'correctiveActions'>;
export type CorrectiveActionFormData = Omit<CorrectiveAction, 'id' | 'createdAt'>;
export type UserFormData = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// --- TIPOS PARA FILTROS ---
export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  affectedArea?: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;
}

// Se leerá desde las variables de entorno que configuraremos en Dokploy
const API_URL = import.meta.env.VITE_API_URL || 'http://autocontrolsanitarioapp-backend-5plj5f-f5ea1c-31-97-193-114.traefik.me';

// Debug: Log the API URL being used
console.log('🔗 API URL:', API_URL);
console.log('🌍 Environment:', import.meta.env.MODE);

const AppContent: React.FC = () => {
  const { success, error } = useNotifications();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login');
  const [resetToken, setResetToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADOS DE DATOS ---
  const [users, setUsers] = useState<User[]>([]);
  const [establishmentInfo, setEstablishmentInfo] = useState<EstablishmentInfo | null>(null);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  // ... resto de estados
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([]);
  const [storageRecords, setStorageRecords] = useState<StorageRecord[]>([]);
  const [dailySurfaces, setDailySurfaces] = useState<DailySurface[]>([]);
  const [dailyCleaningRecords, setDailyCleaningRecords] = useState<DailyCleaningRecord[]>([]);
  const [frequentAreas, setFrequentAreas] = useState<FrequentArea[]>([]);
  const [costings, setCostings] = useState<Costing[]>([]);
  const [outgoingRecords] = useState<OutgoingRecord[]>([]);
  const [elaboratedRecords] = useState<ElaboratedRecord[]>([]);
  const [technicalSheets] = useState<TechnicalSheet[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
      const headers = {
          'Content-Type': 'application/json',
          ...(token && { 'x-auth-token': token }),
          ...options.headers,
      };
      
      const response = await fetch(`${API_URL}${url}`, { ...options, headers });
      
      if (response.status === 401) {
          // Token inválido o expirado
          handleLogout();
          throw new Error('Sesión expirada.');
      }
      
      return response;
  }, [token]);

  // Cargar datos del usuario si hay un token
  useEffect(() => {
    const loadUser = async () => {
        if (token) {
            localStorage.setItem('token', token);
            try {
                const res = await apiFetch('/api/auth');
                const userData = await res.json();
                if (res.ok) {
                    setCurrentUser(userData);
                } else {
                    handleLogout();
                }
            } catch (error) {
                console.error("Error loading user:", error);
                handleLogout();
            }
        }
        setIsLoading(false);
    };
    loadUser();
  }, [token, apiFetch]);

  // Cargar todos los datos de la aplicación una vez que el usuario está logueado
  useEffect(() => {
    const fetchData = async () => {
        if (currentUser) {
            setIsLoading(true);
            try {
                const [usersRes, establishmentRes, deliveryRes] = await Promise.all([
                    apiFetch('/api/users'),
                    apiFetch('/api/establishment'),
                    apiFetch('/api/records/delivery')
                ]);

                if (!usersRes.ok || !establishmentRes.ok || !deliveryRes.ok) {
                    throw new Error('Error al cargar datos del servidor.');
                }
                
                const usersData = await usersRes.json();
                const establishmentData = await establishmentRes.json();
                const deliveryData = await deliveryRes.json();

                setUsers(usersData);
                setEstablishmentInfo(establishmentData);
                setDeliveryRecords(deliveryData);

                // Ejecutar migración de datos si es necesario
                if (isMigrationNeeded()) {
                    migrateExistingData();
                    refreshUsers(); // Refrescar usuarios después de la migración
                }
                
            } catch (err) {
                console.error(err);
                error('Error de conexión', 'No se pudo conectar con el servidor.');
            } finally {
                setIsLoading(false);
            }
        }
    };
    fetchData();
  }, [currentUser, apiFetch]);

  const handleLogin = async (credentials: { email: string, password: string }) => {
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error al iniciar sesión.');
        }
        setToken(data.token);
        success('Inicio de sesión exitoso', `Bienvenido ${data.user?.name || ''}`);
    } catch (error: any) {
        error('Error de autenticación', error.message);
    }
  };

  const handleRegister = async (details: Omit<User, 'id'>) => {
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details)
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error al registrar.');
        }
        setToken(data.token);
        success('Registro exitoso', `Bienvenido ${details.name}`);
    } catch (error: any) {
        error('Error de registro', error.message);
    }
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('token');
    setUsers([]);
    setDeliveryRecords([]);
    setAuthView('login');
  };
  
  const handleAddDeliveryRecord = async (record: Omit<DeliveryRecord, 'id' | 'userId'>) => {
    console.log('📤 Creando registro de recepción:', {
      ...record,
      albaranImage: record.albaranImage ? `[Imagen de ${record.albaranImage.length} caracteres]` : 'Sin imagen'
    });
    
    try {
        // Intentar crear via API primero
        try {
            const response = await apiFetch(`/api/records/delivery`, {
                method: 'POST',
                body: JSON.stringify(record)
            });
            const newRecord = await response.json();
            
            console.log('📥 Respuesta del backend:', {
              ...newRecord,
              albaranImage: newRecord.albaranImage ? `[Imagen de ${newRecord.albaranImage.length} caracteres]` : 'Sin imagen'
            });
            
            if (!response.ok) throw new Error(newRecord.message || 'Error al guardar el registro via API.');
            setDeliveryRecords(prev => [newRecord, ...prev]);
            console.log('✅ Registro creado via API');
        } catch (apiError) {
            console.log('⚠️ API falló, usando localStorage:', apiError);
            
            // Fallback a localStorage - GENERAR ID ÚNICO
            const newRecord: DeliveryRecord = {
                id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID único
                userId: currentUser?.id || '1',
                ...record
            };
            
            console.log('🆔 Generando ID único:', newRecord.id);
            
            // Guardar en localStorage
            const storedRecords = localStorage.getItem('deliveryRecords');
            const records = storedRecords ? JSON.parse(storedRecords) : [];
            records.unshift(newRecord);
            localStorage.setItem('deliveryRecords', JSON.stringify(records));
            
            // Actualizar estado
            setDeliveryRecords(prev => [newRecord, ...prev]);
            console.log('✅ Registro creado en localStorage con ID:', newRecord.id);
        }
        
        success('Registro añadido', 'El registro de recepción se ha guardado correctamente.');
    } catch (error: any) {
        console.error('❌ Error en handleAddDeliveryRecord:', error);
        error('Error al guardar', error.message);
    }
  };

  const handleDeleteDeliveryRecord = async (id: string) => {
    try {
        console.log('🗑️ Eliminando registro de recepción:', id);
        console.log('📊 Registros antes de eliminar:', deliveryRecords.length);
        console.log('📋 IDs actuales:', deliveryRecords.map(r => r.id));
        
        // Intentar eliminar via API primero
        try {
            const response = await apiFetch(`/api/records/delivery/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar el registro via API.');
            console.log('✅ Eliminado via API');
        } catch (apiError) {
            console.log('⚠️ API falló, usando localStorage:', apiError);
            
            // Fallback a localStorage
            const storedRecords = localStorage.getItem('deliveryRecords');
            if (storedRecords) {
                const records = JSON.parse(storedRecords);
                console.log('📊 Registros en localStorage antes:', records.length);
                const updatedRecords = records.filter((r: any) => r.id !== id);
                console.log('📊 Registros en localStorage después:', updatedRecords.length);
                localStorage.setItem('deliveryRecords', JSON.stringify(updatedRecords));
                console.log('✅ Eliminado de localStorage');
            }
        }
        
        // Actualizar estado local
        console.log('🔄 Actualizando estado local...');
        setDeliveryRecords(prev => {
            const filtered = prev.filter(r => r.id !== id);
            console.log('📊 Registros después del filtro:', filtered.length);
            return filtered;
        });
        success('Registro eliminado', 'El registro de recepción se ha eliminado correctamente.');
        console.log('✅ Estado actualizado');
        
    } catch (err: any) {
        console.error('❌ Error al eliminar:', err);
        error('Error al eliminar', err.message);
    }
  };
  
  const handleAddUser = async (details: UserFormData) => {
    try {
        console.log('🆕 Creando usuario:', details);
        
        // Intentar crear via API primero
        try {
            const response = await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify(details)
            });
            const newUser = await response.json();
            if (!response.ok) throw new Error(newUser.message || 'Error al crear usuario via API.');
            setUsers(prev => [...prev, newUser]);
            console.log('✅ Usuario creado via API');
        } catch (apiError) {
            console.log('⚠️ API falló, usando localStorage:', apiError);
            
            // Fallback a localStorage
            const newUser: User = {
                id: String(Date.now()),
                name: details.name,
                email: details.email,
                role: details.role,
                isActive: details.isActive,
                companyId: currentUser?.companyId || '1',
                createdAt: new Date().toISOString()
            };
            
            // Guardar en localStorage
            const storedUsers = localStorage.getItem('users');
            const users = storedUsers ? JSON.parse(storedUsers) : [];
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Actualizar estado
            setUsers(prev => [...prev, newUser]);
            console.log('✅ Usuario creado en localStorage');
        }
        
        success('Usuario creado', `El usuario ${details.name} se ha creado correctamente.`);
    } catch (error: any) {
        console.error('❌ Error al crear usuario:', error);
        error('Error al crear usuario', error.message);
    }
  };

  const handleUpdateUser = async (id: string, details: Partial<User>) => {
    try {
        console.log('✏️ Actualizando usuario:', id, details);
        
        // Intentar actualizar via API primero
        try {
            const response = await apiFetch(`/api/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(details)
            });
            const updatedUser = await response.json();
            if (!response.ok) throw new Error(updatedUser.message || 'Error al actualizar el usuario via API.');
            setUsers(prev => prev.map(u => (u.id === id ? updatedUser : u)));
            console.log('✅ Usuario actualizado via API');
        } catch (apiError) {
            console.log('⚠️ API falló, usando localStorage:', apiError);
            
            // Fallback a localStorage
            const storedUsers = localStorage.getItem('users');
            if (storedUsers) {
                const users = JSON.parse(storedUsers);
                const updatedUsers = users.map((u: any) => 
                    u.id === id ? { ...u, ...details } : u
                );
                localStorage.setItem('users', JSON.stringify(updatedUsers));
                console.log('✅ Usuario actualizado en localStorage');
            }
            
            // Actualizar estado
            setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...details } : u)));
        }
        
        success('Usuario actualizado', `Los datos de ${details.name} se han actualizado correctamente.`);
    } catch (error: any) {
        console.error('❌ Error al actualizar usuario:', error);
        error('Error al actualizar usuario', error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
        console.log('🗑️ Eliminando usuario:', id);
        
        // Intentar eliminar via API primero
        try {
            const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar el usuario via API.');
            console.log('✅ Usuario eliminado via API');
        } catch (apiError) {
            console.log('⚠️ API falló, usando localStorage:', apiError);
            
            // Fallback a localStorage
            const storedUsers = localStorage.getItem('users');
            if (storedUsers) {
                const users = JSON.parse(storedUsers);
                const updatedUsers = users.filter((u: any) => u.id !== id);
                localStorage.setItem('users', JSON.stringify(updatedUsers));
                console.log('✅ Usuario eliminado de localStorage');
            }
        }
        
        // Actualizar estado
        setUsers(prev => prev.filter(u => u.id !== id));
        success('Usuario eliminado', 'El usuario se ha eliminado correctamente.');
    } catch (error: any) {
        console.error('❌ Error al eliminar usuario:', error);
        error('Error al eliminar usuario', error.message);
    }
  };

  // Función para refrescar usuarios desde localStorage
  const refreshUsers = () => {
    const usersData = localStorage.getItem('users');
    if (usersData) {
      setUsers(JSON.parse(usersData));
    }
  };
  
  const handleUpdateEstablishmentInfo = async (info: EstablishmentInfo) => {
      try {
          const response = await apiFetch('/api/establishment', {
              method: 'POST',
              body: JSON.stringify(info)
          });
          const updatedInfo = await response.json();
          if (!response.ok) throw new Error(updatedInfo.message || 'Error al actualizar la información.');
          setEstablishmentInfo(updatedInfo);
          success('Información actualizada', 'Los datos del establecimiento se han guardado correctamente.');
      } catch (error: any) {
          error('Error al actualizar', error.message);
      }
  };

  // Handlers para Suppliers
  const handleAddSupplier = (name: string) => {
    const newSupplier: Supplier = {
      id: Date.now().toString(),
      name: name.trim()
    };
    setSuppliers(prev => [...prev, newSupplier]);
    success('Proveedor añadido', `${name} se ha añadido correctamente.`);
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    success('Proveedor eliminado', 'El proveedor se ha eliminado correctamente.');
  };

  // Handlers para Product Types
  const handleAddProductType = (name: string, optimalTemp: number) => {
    const newProductType: ProductType = {
      id: Date.now().toString(),
      name: name.trim(),
      optimalTemp
    };
    setProductTypes(prev => [...prev, newProductType]);
    success('Tipo de producto añadido', `${name} se ha añadido correctamente.`);
  };

  const handleDeleteProductType = (id: string) => {
    setProductTypes(prev => prev.filter(p => p.id !== id));
    success('Tipo de producto eliminado', 'El tipo de producto se ha eliminado correctamente.');
  };

  // Handlers para Storage Units
  const handleAddStorageUnit = (unit: Omit<StorageUnit, 'id'>) => {
    const newStorageUnit: StorageUnit = {
      id: Date.now().toString(),
      ...unit
    };
    setStorageUnits(prev => [...prev, newStorageUnit]);
    success('Unidad de almacenamiento añadida', `${unit.name} se ha añadido correctamente.`);
  };

  const handleDeleteStorageUnit = (id: string) => {
    setStorageUnits(prev => prev.filter(u => u.id !== id));
    success('Unidad eliminada', 'La unidad de almacenamiento se ha eliminado correctamente.');
  };

  // Handlers para Storage Records
  const handleAddStorageRecord = (record: Omit<StorageRecord, 'id' | 'userId'>) => {
    const newRecord: StorageRecord = {
      id: `storage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID único
      userId: currentUser?.id || '',
      ...record
    };
    
    console.log('🆔 Creando registro de almacenamiento con ID:', newRecord.id);
    
    // Guardar en localStorage
    const storedRecords = localStorage.getItem('storageRecords');
    const records = storedRecords ? JSON.parse(storedRecords) : [];
    records.unshift(newRecord);
    localStorage.setItem('storageRecords', JSON.stringify(records));
    
    setStorageRecords(prev => [newRecord, ...prev]);
    success('Registro añadido', 'El registro de almacenamiento se ha guardado correctamente.');
  };

  const handleDeleteStorageRecord = (id: string) => {
    try {
        console.log('🗑️ Eliminando registro de almacenamiento:', id);
        
        // Actualizar localStorage si existe
        const storedRecords = localStorage.getItem('storageRecords');
        if (storedRecords) {
            const records = JSON.parse(storedRecords);
            const updatedRecords = records.filter((r: any) => r.id !== id);
            localStorage.setItem('storageRecords', JSON.stringify(updatedRecords));
            console.log('✅ Eliminado de localStorage');
        }
        
        // Actualizar estado local
        setStorageRecords(prev => prev.filter(r => r.id !== id));
        success('Registro eliminado', 'El registro se ha eliminado correctamente.');
        console.log('✅ Estado actualizado');
        
    } catch (error: any) {
        console.error('❌ Error al eliminar:', error);
        error('Error al eliminar', error.message || 'No se pudo eliminar el registro.');
    }
  };

  // Handlers para Daily Surfaces
  const handleAddDailySurface = (name: string) => {
    const newSurface: DailySurface = {
      id: Date.now().toString(),
      name: name.trim()
    };
    setDailySurfaces(prev => [...prev, newSurface]);
    success('Superficie añadida', `${name} se ha añadido correctamente.`);
  };

  const handleDeleteDailySurface = (id: string) => {
    setDailySurfaces(prev => prev.filter(s => s.id !== id));
    success('Superficie eliminada', 'La superficie se ha eliminado correctamente.');
  };

  // Handlers para Daily Cleaning Records
  const handleAddDailyCleaningRecord = (record: Omit<DailyCleaningRecord, 'id' | 'userId'>) => {
    const newRecord: DailyCleaningRecord = {
      id: Date.now().toString(),
      userId: currentUser?.id || '',
      ...record
    };
    setDailyCleaningRecords(prev => [newRecord, ...prev]);
    success('Registro de limpieza añadido', 'El registro se ha guardado correctamente.');
  };

  const handleDeleteDailyCleaningRecord = (id: string) => {
    setDailyCleaningRecords(prev => prev.filter(r => r.id !== id));
    success('Registro eliminado', 'El registro se ha eliminado correctamente.');
  };

  // Handlers para Frequent Areas
  const handleAddFrequentArea = (area: Omit<FrequentArea, 'id'>) => {
    const newArea: FrequentArea = {
      id: Date.now().toString(),
      ...area
    };
    setFrequentAreas(prev => [...prev, newArea]);
    success('Área añadida', `${area.name} se ha añadido correctamente.`);
  };

  const handleDeleteFrequentArea = (id: string) => {
    setFrequentAreas(prev => prev.filter(a => a.id !== id));
    success('Área eliminada', 'El área se ha eliminado correctamente.');
  };

  const handleCleanFrequentArea = (id: string) => {
    setFrequentAreas(prev => prev.map(area => 
      area.id === id 
        ? { ...area, lastCleaned: new Date().toISOString() }
        : area
    ));
    success('Limpieza registrada', 'Se ha registrado la limpieza del área.');
  };

  // Handlers para Incidencias
  const handleAddIncident = async (incident: IncidentFormData) => {
    try {
      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await apiFetch('/api/incidents', {
      //   method: 'POST',
      //   body: JSON.stringify(incident)
      // });
      // const newIncident = await response.json();
      
      // Por ahora, crear incidencia localmente
      const newIncident: Incident = {
        id: Date.now().toString(),
        ...incident,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        correctiveActions: []
      };
      
      setIncidents(prev => [newIncident, ...prev]);
      success('Incidencia registrada', 'La incidencia se ha registrado correctamente.');
    } catch (error: any) {
      error('Error al registrar', error.message || 'No se pudo registrar la incidencia.');
    }
  };

  const handleUpdateIncident = async (id: string, updates: Partial<Incident>) => {
    try {
      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await apiFetch(`/api/incidents/${id}`, {
      //   method: 'PUT',
      //   body: JSON.stringify(updates)
      // });
      
      setIncidents(prev => prev.map(incident => 
        incident.id === id 
          ? { ...incident, ...updates, updatedAt: new Date().toISOString() }
          : incident
      ));
      
      if (updates.status === 'Resuelta') {
        success('Incidencia resuelta', 'La incidencia ha sido marcada como resuelta.');
      }
    } catch (err: any) {
      error('Error al actualizar', err.message || 'No se pudo actualizar la incidencia.');
    }
  };

  const handleDeleteIncident = async (id: string) => {
    try {
      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await apiFetch(`/api/incidents/${id}`, { method: 'DELETE' });
      
      setIncidents(prev => prev.filter(incident => incident.id !== id));
      success('Incidencia eliminada', 'La incidencia se ha eliminado correctamente.');
    } catch (err: any) {
      error('Error al eliminar', err.message || 'No se pudo eliminar la incidencia.');
    }
  };

  const handleAddCorrectiveAction = async (action: CorrectiveActionFormData) => {
    try {
      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await apiFetch('/api/corrective-actions', {
      //   method: 'POST',
      //   body: JSON.stringify(action)
      // });
      
      const newAction: CorrectiveAction = {
        id: Date.now().toString(),
        ...action,
        createdAt: new Date().toISOString()
      };
      
      setIncidents(prev => prev.map(incident => 
        incident.id === action.incidentId
          ? { 
              ...incident, 
              correctiveActions: [...incident.correctiveActions, newAction],
              updatedAt: new Date().toISOString()
            }
          : incident
      ));
      
      success('Acción registrada', 'La acción correctiva se ha registrado correctamente.');
    } catch (err: any) {
      error('Error al registrar', err.message || 'No se pudo registrar la acción correctiva.');
    }
  };

  const handleUpdateCorrectiveAction = async (id: string, updates: Partial<CorrectiveAction>) => {
    try {
      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await apiFetch(`/api/corrective-actions/${id}`, {
      //   method: 'PUT',
      //   body: JSON.stringify(updates)
      // });
      
      setIncidents(prev => prev.map(incident => ({
        ...incident,
        correctiveActions: incident.correctiveActions.map(action =>
          action.id === id ? { ...action, ...updates } : action
        ),
        updatedAt: new Date().toISOString()
      })));
      
      if (updates.status === 'Completada') {
        success('Acción completada', 'La acción correctiva ha sido marcada como completada.');
      }
    } catch (err: any) {
      error('Error al actualizar', err.message || 'No se pudo actualizar la acción correctiva.');
    }
  };

  const handleDeleteCorrectiveAction = async (id: string) => {
    try {
      // TODO: Implementar llamada al backend cuando esté disponible
      // const response = await apiFetch(`/api/corrective-actions/${id}`, { method: 'DELETE' });
      
      setIncidents(prev => prev.map(incident => ({
        ...incident,
        correctiveActions: incident.correctiveActions.filter(action => action.id !== id),
        updatedAt: new Date().toISOString()
      })));
      
      success('Acción eliminada', 'La acción correctiva se ha eliminado correctamente.');
    } catch (err: any) {
      error('Error al eliminar', err.message || 'No se pudo eliminar la acción correctiva.');
    }
  };

  if (isLoading) {
      return <div className="login-container"><h1>Cargando...</h1></div>;
  }

  return (
    <>
      {!currentUser ? (
        authView === 'login' ? (
          <Login 
            onLoginSuccess={handleLogin} 
            onSwitchToRegister={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        ) : authView === 'register' ? (
          <Register onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />
        ) : authView === 'forgot-password' ? (
          <ForgotPassword onBackToLogin={() => setAuthView('login')} />
        ) : authView === 'reset-password' ? (
          <ResetPassword 
            token={resetToken} 
            onResetComplete={() => setAuthView('login')} 
          />
        ) : null
      ) : (
        <Dashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          users={users}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onUpdateUser={handleUpdateUser}
          onRefreshUsers={refreshUsers}
          deliveryRecords={deliveryRecords}
          onAddDeliveryRecord={handleAddDeliveryRecord}
          onDeleteDeliveryRecord={handleDeleteDeliveryRecord}
          establishmentInfo={establishmentInfo!} // Usamos ! porque asumimos que el dashboard no se renderiza sin esto
          onUpdateEstablishmentInfo={handleUpdateEstablishmentInfo}
          // Pasa el resto de props y handlers necesarios...
          suppliers={suppliers}
          onAddSupplier={handleAddSupplier}
          onDeleteSupplier={handleDeleteSupplier}
          productTypes={productTypes}
          onAddProductType={handleAddProductType}
          onDeleteProductType={handleDeleteProductType}
          storageUnits={storageUnits}
          onAddStorageUnit={handleAddStorageUnit}
          onDeleteStorageUnit={handleDeleteStorageUnit}
          storageRecords={storageRecords}
          onAddStorageRecord={handleAddStorageRecord}
          onDeleteStorageRecord={handleDeleteStorageRecord}
          dailySurfaces={dailySurfaces}
          onAddDailySurface={handleAddDailySurface}
          onDeleteDailySurface={handleDeleteDailySurface}
          dailyCleaningRecords={dailyCleaningRecords}
          onAddDailyCleaningRecord={handleAddDailyCleaningRecord}
          onDeleteDailyCleaningRecord={handleDeleteDailyCleaningRecord}
          frequentAreas={frequentAreas}
          onAddFrequentArea={handleAddFrequentArea}
          onDeleteFrequentArea={handleDeleteFrequentArea}
          onCleanFrequentArea={handleCleanFrequentArea}
          costings={costings}
          onSetCostings={setCostings}
          outgoingRecords={outgoingRecords}
          onAddOutgoingRecord={() => {}}
          onDeleteOutgoingRecord={() => {}}
          elaboratedRecords={elaboratedRecords}
          onAddElaboratedRecord={() => {}}
          onDeleteElaboratedRecord={() => {}}
          technicalSheets={technicalSheets}
          onAddTechnicalSheet={() => {}}
          onDeleteTechnicalSheet={() => {}}
          incidents={incidents}
          onAddIncident={handleAddIncident}
          onUpdateIncident={handleUpdateIncident}
          onDeleteIncident={handleDeleteIncident}
          onAddCorrectiveAction={handleAddCorrectiveAction}
          onUpdateCorrectiveAction={handleUpdateCorrectiveAction}
          onDeleteCorrectiveAction={handleDeleteCorrectiveAction}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <NotificationContainer />
      <AppContent />
    </NotificationProvider>
  );
};

export default App;
