
import React, { useState, useEffect, useCallback } from 'react';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';

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

// URL de nuestra API desplegada en Dokploy.
// Asegúrate de que coincida con el dominio que configures para el backend.
const API_URL = 'https://api.tu-dominio.com'; // <-- CAMBIAR ESTO

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
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
  const [outgoingRecords, setOutgoingRecords] = useState<OutgoingRecord[]>([]);
  const [elaboratedRecords, setElaboratedRecords] = useState<ElaboratedRecord[]>([]);
  const [technicalSheets, setTechnicalSheets] = useState<TechnicalSheet[]>([]);
  

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
                
            } catch (error) {
                console.error(error);
                alert('No se pudo conectar con el servidor.');
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
    } catch (error: any) {
        alert(error.message);
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
    } catch (error: any) {
        alert(error.message);
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
    } catch (error: any) {
        alert(error.message);
    }
  };

  const handleDeleteDeliveryRecord = async (id: string) => {
    try {
        const response = await apiFetch(`/api/records/delivery/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar el registro.');
        setDeliveryRecords(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
        alert(error.message);
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
    } catch (error: any) {
        alert(error.message);
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
    } catch (error: any) {
        alert(error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
      try {
        const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar el usuario.');
        setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error: any) {
        alert(error.message);
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
      } catch (error: any) {
          alert(error.message);
      }
  };

  if (isLoading) {
      return <div className="login-container"><h1>Cargando...</h1></div>;
  }

  if (!currentUser) {
    return authView === 'login' ? (
      <Login onLoginSuccess={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />
    );
  }
  
  if (!establishmentInfo) {
      // Este estado puede ocurrir si el admin no ha configurado la info todavía
      // Podemos renderizar solo la página de settings o un loader específico
      // return <div className="login-container"><h1>Configuración inicial requerida...</h1></div>;
  }


  return (
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
  );
};

export default App;