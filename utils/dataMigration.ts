import { User, BaseRecord } from '../App';

// Función para migrar datos existentes al nuevo formato
export function migrateExistingData(): void {
  try {
    // Migrar usuarios existentes
    migrateUsers();
    
    // Migrar todos los registros existentes
    migrateRecords();
    
    console.log('Migración de datos completada exitosamente');
  } catch (error) {
    console.error('Error durante la migración de datos:', error);
  }
}

function migrateUsers(): void {
  const usersData = localStorage.getItem('users');
  if (!usersData) return;
  
  const users: User[] = JSON.parse(usersData);
  const currentUserData = localStorage.getItem('currentUser');
  
  if (!currentUserData) return;
  
  const currentUser = JSON.parse(currentUserData);
  
  // Asignar companyId a usuarios existentes
  const updatedUsers = users.map(user => {
    if (!user.companyId) {
      // Usar el ID del primer usuario como companyId para todos
      user.companyId = users[0]?.id || currentUser.id;
    }
    return user;
  });
  
  localStorage.setItem('users', JSON.stringify(updatedUsers));
  
  // Actualizar usuario actual si es necesario
  if (!currentUser.companyId) {
    currentUser.companyId = users[0]?.id || currentUser.id;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }
}

function migrateRecords(): void {
  const currentUserData = localStorage.getItem('currentUser');
  if (!currentUserData) return;
  
  const currentUser = JSON.parse(currentUserData);
  
  // Lista de tipos de registros a migrar
  const recordTypes = [
    'deliveryRecords',
    'storageRecords',
    'dailyCleaningRecords',
    'outgoingRecords',
    'elaboratedRecords',
    'technicalSheets',
    'incidents'
  ];
  
  recordTypes.forEach(recordType => {
    migrateRecordType(recordType, currentUser);
  });
}

function migrateRecordType(recordType: string, currentUser: any): void {
  const recordsData = localStorage.getItem(recordType);
  if (!recordsData) return;
  
  const records = JSON.parse(recordsData);
  
  const updatedRecords = records.map((record: any) => {
    // Solo migrar si no tiene campos de trazabilidad
    if (!record.registeredBy) {
      const baseRecord: BaseRecord = {
        registeredBy: currentUser.name,
        registeredById: currentUser.id,
        registeredAt: record.date || record.dateTime || record.createdAt || new Date().toISOString()
      };
      
      return { ...record, ...baseRecord };
    }
    return record;
  });
  
  localStorage.setItem(recordType, JSON.stringify(updatedRecords));
}

// Función para verificar si la migración es necesaria
export function isMigrationNeeded(): boolean {
  const currentUserData = localStorage.getItem('currentUser');
  if (!currentUserData) return false;
  
  const currentUser = JSON.parse(currentUserData);
  
  // Verificar si el usuario actual tiene companyId
  if (!currentUser.companyId) return true;
  
  // Verificar si algún registro no tiene campos de trazabilidad
  const recordTypes = ['deliveryRecords', 'storageRecords', 'incidents'];
  
  for (const recordType of recordTypes) {
    const recordsData = localStorage.getItem(recordType);
    if (recordsData) {
      const records = JSON.parse(recordsData);
      if (records.length > 0 && !records[0].registeredBy) {
        return true;
      }
    }
  }
  
  return false;
}

// Función para obtener usuarios de la misma empresa
export function getCompanyUsers(currentUser: User): User[] {
  const usersData = localStorage.getItem('users');
  if (!usersData) return [];
  
  const users: User[] = JSON.parse(usersData);
  return users.filter(user => 
    user.companyId === currentUser.companyId && user.isActive
  );
}

// Función para crear usuario colaborador
export function createCollaboratorUser(
  collaboratorData: {
    name: string;
    email: string;
    password: string;
  },
  currentUser: User
): User {
  const newUser: User = {
    id: Date.now().toString(),
    name: collaboratorData.name,
    email: collaboratorData.email,
    password: collaboratorData.password,
    role: 'Usuario',
    isActive: true,
    companyId: currentUser.companyId,
    createdAt: new Date().toISOString(),
    createdBy: currentUser.id
  };
  
  // Obtener usuarios existentes
  const usersData = localStorage.getItem('users');
  const users: User[] = usersData ? JSON.parse(usersData) : [];
  
  // Verificar que el email no exista
  const emailExists = users.some(user => user.email === collaboratorData.email);
  if (emailExists) {
    throw new Error('Este email ya está registrado en el sistema');
  }
  
  // Añadir nuevo usuario
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  
  return newUser;
}