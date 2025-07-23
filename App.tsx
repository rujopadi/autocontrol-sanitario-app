
import React, { useState, useEffect, useCallback } from 'react';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import { NotificationProvider, useNotifications } from './NotificationContext';
import NotificationContainer from './NotificationContainer';

// --- INTERFACES (Sin cambios) ---
export interface EstablishmentInfo {
    name: string; address: string; city: string; postalCode: string; sanitaryRegistry: string;
}
export interface User {
  id: string; // Mongo usa strings para los IDs
  name: string; email: string; password?: string; 
  isAdmin?: boolean;
}
export interface Supplier {
  id: string; name: string;
}
export interface ProductType {
  id: string; name: string; optimalTemp: number;
}
export interface DeliveryRecord {
  id: string; // Mongo usa strings para los IDs
  supplierId: string; productTypeId: string; temperature: string; receptionDate: string; docsOk: boolean; userId: string; albaranImage?: string;
}
// ... resto de interfaces
export interface StorageUnit { id: string; name: string; type: 'Cámara Frigorífica' | 'Cámara Expositora' | 'Cámara de secado'; minTemp?: number; maxTemp?: number; }
export interface StorageRecord { id: string; unitId: string; dateTime: string; temperature: string; humidity?: string; rotationCheck: boolean; mincingCheck: boolean; userId: string; }
export interface DailySurface { id: string; name: string; }
export interface DailyCleaningRecord { id: string; surfaceId: string; dateTime: string; userId: string; }
export interface FrequentArea { id: string; name: string; frequencyDays: number; lastCleaned: string | null; }
export interface CostingPart { id: string; name: string; weight: number; saleType: 'weight' | 'unit'; quantity?: number; }
export interface Costing { id: string; productName: string; totalWeight: number; purchasePrice: number; parts: CostingPart[]; salePrices: { [partId: string]: string }; }
export interface OutgoingRecord { id: string; productName: string; quantity: string; lotIdentifier: string; destinationType: 'sucursal' | 'consumidor'; destination: string; date: string; userId: string; }
export interface ElaboratedRecord { id: string; productName: string; elaborationDate: string; productLot: string; ingredients: { name: string; supplier: string; lot: string; quantity: string; }[]; destination: string; quantitySent: string; userId: string; }
export interface TechnicalSheet { id: string; productName: string; ingredients: Omit<Ingredient, 'id'>[]; elaboration: string; presentation: string; shelfLife: string; labeling: string; }
export interface Ingredient { id: string; name: string; lot: string; isAllergen: boolean; }

// Se leerá desde las variables de entorno que configuraremos en Dokploy
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AppContent: React.FC = () => {
  const { success, error } = useNotifications();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADOS DE DATOS ---
  const [users, setUsers] = useState<User[]>([]);
  const [establishmentInfo, setEstablishmentInfo] = useState<EstablishmentInfo | null>(null);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  // ... resto de estados
  const [suppliers] = useState<Supplier[]>([]);
  const [productTypes] = useState<ProductType[]>([]);
  const [storageUnits] = useState<StorageUnit[]>([]);
  const [storageRecords] = useState<StorageRecord[]>([]);
  const [dailySurfaces] = useState<DailySurface[]>([]);
  const [dailyCleaningRecords] = useState<DailyCleaningRecord[]>([]);
  const [frequentAreas] = useState<FrequentArea[]>([]);
  const [costings, setCostings] = useState<Costing[]>([]);
  const [outgoingRecords] = useState<OutgoingRecord[]>([]);
  const [elaboratedRecords] = useState<ElaboratedRecord[]>([]);
  const [technicalSheets] = useState<TechnicalSheet[]>([]);
  

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
    try {
        const response = await apiFetch(`/api/records/delivery`, {
            method: 'POST',
            body: JSON.stringify(record)
        });
        const newRecord = await response.json();
         if (!response.ok) throw new Error(newRecord.message || 'Error al guardar el registro.');
        setDeliveryRecords(prev => [newRecord, ...prev]);
        success('Registro añadido', 'El registro de recepción se ha guardado correctamente.');
    } catch (error: any) {
        error('Error al guardar', error.message);
    }
  };

  const handleDeleteDeliveryRecord = async (id: string) => {
    try {
        const response = await apiFetch(`/api/records/delivery/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar el registro.');
        setDeliveryRecords(prev => prev.filter(r => r.id !== id));
        success('Registro eliminado', 'El registro de recepción se ha eliminado correctamente.');
    } catch (error: any) {
        error('Error al eliminar', error.message);
    }
  };
  
  const handleAddUser = async (details: Omit<User, 'id'>) => {
    try {
        const response = await apiFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(details)
        });
        const newUser = await response.json();
        if (!response.ok) throw new Error(newUser.message || 'Error al crear usuario.');
        setUsers(prev => [...prev, newUser]);
        success('Usuario creado', `El usuario ${details.name} se ha creado correctamente.`);
    } catch (error: any) {
        error('Error al crear usuario', error.message);
    }
  };

  const handleUpdateUser = async (id: string, details: { name: string; email: string }) => {
    try {
        const response = await apiFetch(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(details)
        });
        const updatedUser = await response.json();
        if (!response.ok) throw new Error(updatedUser.message || 'Error al actualizar el usuario.');
        setUsers(prev => prev.map(u => (u.id === id ? updatedUser : u)));
        success('Usuario actualizado', `Los datos de ${details.name} se han actualizado correctamente.`);
    } catch (error: any) {
        error('Error al actualizar usuario', error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
      try {
        const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar el usuario.');
        setUsers(prev => prev.filter(u => u.id !== id));
        success('Usuario eliminado', 'El usuario se ha eliminado correctamente.');
    } catch (error: any) {
        error('Error al eliminar usuario', error.message);
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

  if (isLoading) {
      return <div className="login-container"><h1>Cargando...</h1></div>;
  }

  return (
    <>
      {!currentUser ? (
        authView === 'login' ? (
          <Login onLoginSuccess={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <Register onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />
        )
      ) : (
        <Dashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          users={users}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onUpdateUser={handleUpdateUser}
          deliveryRecords={deliveryRecords}
          onAddDeliveryRecord={handleAddDeliveryRecord}
          onDeleteDeliveryRecord={handleDeleteDeliveryRecord}
          establishmentInfo={establishmentInfo!} // Usamos ! porque asumimos que el dashboard no se renderiza sin esto
          onUpdateEstablishmentInfo={handleUpdateEstablishmentInfo}
          // Pasa el resto de props y handlers necesarios...
          suppliers={suppliers}
          onAddSupplier={() => {}}
          onDeleteSupplier={() => {}}
          productTypes={productTypes}
          onAddProductType={() => {}}
          onDeleteProductType={() => {}}
          storageUnits={storageUnits}
          onAddStorageUnit={() => {}}
          onDeleteStorageUnit={() => {}}
          storageRecords={storageRecords}
          onAddStorageRecord={() => {}}
          onDeleteStorageRecord={() => {}}
          dailySurfaces={dailySurfaces}
          onAddDailySurface={() => {}}
          onDeleteDailySurface={() => {}}
          dailyCleaningRecords={dailyCleaningRecords}
          onAddDailyCleaningRecord={() => {}}
          onDeleteDailyCleaningRecord={() => {}}
          frequentAreas={frequentAreas}
          onAddFrequentArea={() => {}}
          onDeleteFrequentArea={() => {}}
          onCleanFrequentArea={() => {}}
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
