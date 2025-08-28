import { 
  DeliveryRecord, 
  StorageRecord, 
  TechnicalSheet, 
  Supplier, 
  ProductType, 
  StorageUnit,
  EstablishmentInfo 
} from '../types';

// Tipos para los datos del localStorage
interface LocalStorageData {
  deliveryRecords?: DeliveryRecord[];
  storageRecords?: StorageRecord[];
  technicalSheets?: TechnicalSheet[];
  suppliers?: Supplier[];
  productTypes?: ProductType[];
  storageUnits?: StorageUnit[];
  establishmentInfo?: EstablishmentInfo;
  users?: any[];
  dailySurfaces?: any[];
  dailyCleaningRecords?: any[];
  frequentAreas?: any[];
  costings?: any[];
  outgoingRecords?: any[];
  elaboratedRecords?: any[];
}

// Resultado de la migración
export interface MigrationResult {
  success: boolean;
  message: string;
  migratedData?: {
    deliveryRecords: number;
    storageRecords: number;
    technicalSheets: number;
    suppliers: number;
    productTypes: number;
    storageUnits: number;
    establishmentInfo: boolean;
    otherRecords: number;
  };
  errors?: string[];
}

// Función para detectar si hay datos en localStorage
export const hasLocalStorageData = (): boolean => {
  try {
    const keys = [
      'deliveryRecords',
      'storageRecords', 
      'technicalSheets',
      'suppliers',
      'productTypes',
      'storageUnits',
      'establishmentInfo'
    ];
    
    return keys.some(key => {
      const data = localStorage.getItem(key);
      return data && data !== 'null' && data !== '[]' && data !== '{}';
    });
  } catch (error) {
    console.error('Error checking localStorage:', error);
    return false;
  }
};

// Función para obtener todos los datos del localStorage
export const getLocalStorageData = (): LocalStorageData => {
  const data: LocalStorageData = {};
  
  try {
    // Obtener cada tipo de dato del localStorage
    const keys = [
      'deliveryRecords',
      'storageRecords',
      'technicalSheets', 
      'suppliers',
      'productTypes',
      'storageUnits',
      'establishmentInfo',
      'users',
      'dailySurfaces',
      'dailyCleaningRecords',
      'frequentAreas',
      'costings',
      'outgoingRecords',
      'elaboratedRecords'
    ];
    
    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item && item !== 'null') {
        try {
          data[key as keyof LocalStorageData] = JSON.parse(item);
        } catch (parseError) {
          console.warn(`Error parsing ${key} from localStorage:`, parseError);
        }
      }
    });
    
    return data;
  } catch (error) {
    console.error('Error getting localStorage data:', error);
    return {};
  }
};

// Función para validar los datos antes de la migración
export const validateMigrationData = (data: LocalStorageData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validar estructura de deliveryRecords
  if (data.deliveryRecords && Array.isArray(data.deliveryRecords)) {
    data.deliveryRecords.forEach((record, index) => {
      if (!record.id || !record.supplier || !record.productType) {
        errors.push(`Registro de recepción ${index + 1} tiene datos incompletos`);
      }
    });
  }
  
  // Validar estructura de storageRecords
  if (data.storageRecords && Array.isArray(data.storageRecords)) {
    data.storageRecords.forEach((record, index) => {
      if (!record.id || !record.unitId || record.temperature === undefined) {
        errors.push(`Registro de almacenamiento ${index + 1} tiene datos incompletos`);
      }
    });
  }
  
  // Validar estructura de suppliers
  if (data.suppliers && Array.isArray(data.suppliers)) {
    data.suppliers.forEach((supplier, index) => {
      if (!supplier.id || !supplier.name) {
        errors.push(`Proveedor ${index + 1} tiene datos incompletos`);
      }
    });
  }
  
  // Validar estructura de productTypes
  if (data.productTypes && Array.isArray(data.productTypes)) {
    data.productTypes.forEach((product, index) => {
      if (!product.id || !product.name || product.optimalTemp === undefined) {
        errors.push(`Tipo de producto ${index + 1} tiene datos incompletos`);
      }
    });
  }
  
  // Validar estructura de storageUnits
  if (data.storageUnits && Array.isArray(data.storageUnits)) {
    data.storageUnits.forEach((unit, index) => {
      if (!unit.id || !unit.name) {
        errors.push(`Unidad de almacenamiento ${index + 1} tiene datos incompletos`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Función para limpiar y preparar los datos para la migración
export const prepareMigrationData = (data: LocalStorageData): LocalStorageData => {
  const cleanedData: LocalStorageData = {};
  
  // Limpiar deliveryRecords
  if (data.deliveryRecords && Array.isArray(data.deliveryRecords)) {
    cleanedData.deliveryRecords = data.deliveryRecords
      .filter(record => record.id && record.supplier && record.productType)
      .map(record => ({
        ...record,
        // Asegurar que todos los campos requeridos estén presentes
        receptionDate: record.receptionDate || new Date().toISOString().slice(0, 10),
        temperature: record.temperature || '0',
        documentsOk: record.documentsOk !== undefined ? record.documentsOk : true,
        userId: record.userId || 'migrated-user'
      }));
  }
  
  // Limpiar storageRecords
  if (data.storageRecords && Array.isArray(data.storageRecords)) {
    cleanedData.storageRecords = data.storageRecords
      .filter(record => record.id && record.unitId && record.temperature !== undefined)
      .map(record => ({
        ...record,
        dateTime: record.dateTime || new Date().toISOString(),
        userId: record.userId || 'migrated-user'
      }));
  }
  
  // Limpiar technicalSheets
  if (data.technicalSheets && Array.isArray(data.technicalSheets)) {
    cleanedData.technicalSheets = data.technicalSheets
      .filter(sheet => sheet.id && sheet.productName)
      .map(sheet => ({
        ...sheet,
        ingredients: sheet.ingredients || [],
        allergens: sheet.allergens || [],
        nutritionalInfo: sheet.nutritionalInfo || {},
        storageConditions: sheet.storageConditions || '',
        shelfLife: sheet.shelfLife || ''
      }));
  }
  
  // Limpiar suppliers
  if (data.suppliers && Array.isArray(data.suppliers)) {
    cleanedData.suppliers = data.suppliers
      .filter(supplier => supplier.id && supplier.name)
      .map(supplier => ({
        id: supplier.id,
        name: supplier.name.trim()
      }));
  }
  
  // Limpiar productTypes
  if (data.productTypes && Array.isArray(data.productTypes)) {
    cleanedData.productTypes = data.productTypes
      .filter(product => product.id && product.name && product.optimalTemp !== undefined)
      .map(product => ({
        id: product.id,
        name: product.name.trim(),
        optimalTemp: Number(product.optimalTemp)
      }));
  }
  
  // Limpiar storageUnits
  if (data.storageUnits && Array.isArray(data.storageUnits)) {
    cleanedData.storageUnits = data.storageUnits
      .filter(unit => unit.id && unit.name)
      .map(unit => ({
        ...unit,
        name: unit.name.trim(),
        minTemp: unit.minTemp !== undefined ? Number(unit.minTemp) : undefined,
        maxTemp: unit.maxTemp !== undefined ? Number(unit.maxTemp) : undefined
      }));
  }
  
  // Limpiar establishmentInfo
  if (data.establishmentInfo && typeof data.establishmentInfo === 'object') {
    cleanedData.establishmentInfo = {
      name: data.establishmentInfo.name || '',
      address: data.establishmentInfo.address || '',
      phone: data.establishmentInfo.phone || '',
      email: data.establishmentInfo.email || '',
      manager: data.establishmentInfo.manager || '',
      activityType: data.establishmentInfo.activityType || '',
      registrationNumber: data.establishmentInfo.registrationNumber || ''
    };
  }
  
  // Copiar otros datos tal como están
  if (data.dailySurfaces) cleanedData.dailySurfaces = data.dailySurfaces;
  if (data.dailyCleaningRecords) cleanedData.dailyCleaningRecords = data.dailyCleaningRecords;
  if (data.frequentAreas) cleanedData.frequentAreas = data.frequentAreas;
  if (data.costings) cleanedData.costings = data.costings;
  if (data.outgoingRecords) cleanedData.outgoingRecords = data.outgoingRecords;
  if (data.elaboratedRecords) cleanedData.elaboratedRecords = data.elaboratedRecords;
  
  return cleanedData;
};

// Función para crear un backup de los datos del localStorage
export const createLocalStorageBackup = (): string => {
  try {
    const data = getLocalStorageData();
    const backup = {
      timestamp: new Date().toISOString(),
      data: data
    };
    return JSON.stringify(backup, null, 2);
  } catch (error) {
    console.error('Error creating backup:', error);
    throw new Error('No se pudo crear el backup de los datos');
  }
};

// Función para limpiar el localStorage después de una migración exitosa
export const clearLocalStorageData = (): void => {
  try {
    const keys = [
      'deliveryRecords',
      'storageRecords',
      'technicalSheets',
      'suppliers',
      'productTypes',
      'storageUnits',
      'establishmentInfo',
      'users',
      'dailySurfaces',
      'dailyCleaningRecords',
      'frequentAreas',
      'costings',
      'outgoingRecords',
      'elaboratedRecords'
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Marcar que la migración se completó
    localStorage.setItem('migrationCompleted', 'true');
    localStorage.setItem('migrationDate', new Date().toISOString());
    
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    throw new Error('No se pudo limpiar el localStorage');
  }
};

// Función para verificar si ya se realizó la migración
export const isMigrationCompleted = (): boolean => {
  try {
    return localStorage.getItem('migrationCompleted') === 'true';
  } catch (error) {
    return false;
  }
};

// Función para obtener estadísticas de los datos a migrar
export const getMigrationStats = (): {
  deliveryRecords: number;
  storageRecords: number;
  technicalSheets: number;
  suppliers: number;
  productTypes: number;
  storageUnits: number;
  hasEstablishmentInfo: boolean;
  otherRecords: number;
} => {
  const data = getLocalStorageData();
  
  return {
    deliveryRecords: data.deliveryRecords?.length || 0,
    storageRecords: data.storageRecords?.length || 0,
    technicalSheets: data.technicalSheets?.length || 0,
    suppliers: data.suppliers?.length || 0,
    productTypes: data.productTypes?.length || 0,
    storageUnits: data.storageUnits?.length || 0,
    hasEstablishmentInfo: !!data.establishmentInfo?.name,
    otherRecords: (data.dailySurfaces?.length || 0) + 
                  (data.dailyCleaningRecords?.length || 0) + 
                  (data.frequentAreas?.length || 0) + 
                  (data.costings?.length || 0) + 
                  (data.outgoingRecords?.length || 0) + 
                  (data.elaboratedRecords?.length || 0)
  };
};

// Función para exportar datos como JSON para descarga
export const exportMigrationData = (): { filename: string; data: string } => {
  const data = getLocalStorageData();
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    data: data
  };
  
  const filename = `autocontrol-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  const jsonData = JSON.stringify(exportData, null, 2);
  
  return { filename, data: jsonData };
};

// Función para descargar el backup como archivo
export const downloadBackup = (): void => {
  try {
    const backup = createLocalStorageBackup();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `autocontrol-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading backup:', error);
    throw new Error('No se pudo descargar el backup');
  }
};
// Funci
ón para crear un punto de restauración antes de la migración
export const createRestorePoint = (): string => {
  try {
    const restoreData = {
      timestamp: new Date().toISOString(),
      data: getLocalStorageData(),
      version: '1.0'
    };
    
    const restorePoint = JSON.stringify(restoreData, null, 2);
    localStorage.setItem('migrationRestorePoint', restorePoint);
    
    return restorePoint;
  } catch (error) {
    console.error('Error creating restore point:', error);
    throw new Error('No se pudo crear el punto de restauración');
  }
};

// Función para restaurar datos desde un punto de restauración
export const restoreFromBackup = (backupData?: string): boolean => {
  try {
    let restoreData;
    
    if (backupData) {
      // Restaurar desde datos proporcionados
      restoreData = JSON.parse(backupData);
    } else {
      // Restaurar desde punto de restauración guardado
      const savedRestorePoint = localStorage.getItem('migrationRestorePoint');
      if (!savedRestorePoint) {
        throw new Error('No hay punto de restauración disponible');
      }
      restoreData = JSON.parse(savedRestorePoint);
    }
    
    // Validar estructura del backup
    if (!restoreData.data || !restoreData.timestamp) {
      throw new Error('Formato de backup inválido');
    }
    
    // Restaurar cada tipo de dato
    const data = restoreData.data;
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    });
    
    // Marcar migración como no completada
    localStorage.removeItem('migrationCompleted');
    
    return true;
  } catch (error) {
    console.error('Error restoring from backup:', error);
    return false;
  }
};

// Función para importar datos desde un archivo JSON
export const importDataFromFile = (fileContent: string): Promise<{ success: boolean; message: string; stats?: any }> => {
  return new Promise((resolve) => {
    try {
      const importedData = JSON.parse(fileContent);
      
      // Validar estructura del archivo
      if (!importedData || typeof importedData !== 'object') {
        resolve({
          success: false,
          message: 'Formato de archivo inválido'
        });
        return;
      }
      
      // Si es un backup completo, extraer los datos
      const dataToImport = importedData.data || importedData;
      
      // Validar los datos
      const validation = validateMigrationData(dataToImport);
      if (!validation.isValid) {
        resolve({
          success: false,
          message: `Datos inválidos: ${validation.errors.join(', ')}`
        });
        return;
      }
      
      // Crear punto de restauración antes de importar
      createRestorePoint();
      
      // Importar los datos válidos
      let importedCount = 0;
      const validKeys = [
        'deliveryRecords',
        'storageRecords',
        'technicalSheets',
        'suppliers',
        'productTypes',
        'storageUnits',
        'establishmentInfo'
      ];
      
      validKeys.forEach(key => {
        if (dataToImport[key] && Array.isArray(dataToImport[key]) && dataToImport[key].length > 0) {
          localStorage.setItem(key, JSON.stringify(dataToImport[key]));
          importedCount += dataToImport[key].length;
        } else if (key === 'establishmentInfo' && dataToImport[key]) {
          localStorage.setItem(key, JSON.stringify(dataToImport[key]));
          importedCount += 1;
        }
      });
      
      // Obtener estadísticas de los datos importados
      const stats = getMigrationStats();
      
      resolve({
        success: true,
        message: `Datos importados exitosamente. ${importedCount} elementos procesados.`,
        stats
      });
      
    } catch (error) {
      console.error('Error importing data:', error);
      resolve({
        success: false,
        message: 'Error al procesar el archivo. Verifique que sea un archivo JSON válido.'
      });
    }
  });
};

// Función para validar la integridad de los datos después de la migración
export const validateMigrationIntegrity = async (
  originalStats: any,
  migratedData: any
): Promise<{ isValid: boolean; issues: string[] }> => {
  const issues: string[] = [];
  
  try {
    // Comparar contadores
    if (originalStats.deliveryRecords !== migratedData.deliveryRecords) {
      issues.push(`Registros de recepción: esperados ${originalStats.deliveryRecords}, migrados ${migratedData.deliveryRecords}`);
    }
    
    if (originalStats.storageRecords !== migratedData.storageRecords) {
      issues.push(`Registros de almacenamiento: esperados ${originalStats.storageRecords}, migrados ${migratedData.storageRecords}`);
    }
    
    if (originalStats.technicalSheets !== migratedData.technicalSheets) {
      issues.push(`Fichas técnicas: esperadas ${originalStats.technicalSheets}, migradas ${migratedData.technicalSheets}`);
    }
    
    if (originalStats.suppliers !== migratedData.suppliers) {
      issues.push(`Proveedores: esperados ${originalStats.suppliers}, migrados ${migratedData.suppliers}`);
    }
    
    if (originalStats.productTypes !== migratedData.productTypes) {
      issues.push(`Tipos de producto: esperados ${originalStats.productTypes}, migrados ${migratedData.productTypes}`);
    }
    
    if (originalStats.storageUnits !== migratedData.storageUnits) {
      issues.push(`Unidades de almacenamiento: esperadas ${originalStats.storageUnits}, migradas ${migratedData.storageUnits}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
    
  } catch (error) {
    console.error('Error validating migration integrity:', error);
    return {
      isValid: false,
      issues: ['Error al validar la integridad de la migración']
    };
  }
};

// Función para limpiar puntos de restauración antiguos
export const cleanupRestorePoints = (): void => {
  try {
    localStorage.removeItem('migrationRestorePoint');
  } catch (error) {
    console.error('Error cleaning up restore points:', error);
  }
};

// Función para obtener información del punto de restauración
export const getRestorePointInfo = (): { exists: boolean; timestamp?: string; size?: number } => {
  try {
    const restorePoint = localStorage.getItem('migrationRestorePoint');
    if (!restorePoint) {
      return { exists: false };
    }
    
    const data = JSON.parse(restorePoint);
    return {
      exists: true,
      timestamp: data.timestamp,
      size: new Blob([restorePoint]).size
    };
  } catch (error) {
    console.error('Error getting restore point info:', error);
    return { exists: false };
  }
};

// Función para marcar la migración como completada
export const markMigrationCompleted = (): void => {
  try {
    localStorage.setItem('migrationCompleted', 'true');
    // Limpiar punto de restauración después de migración exitosa
    setTimeout(() => {
      cleanupRestorePoints();
    }, 5000); // Esperar 5 segundos antes de limpiar
  } catch (error) {
    console.error('Error marking migration as completed:', error);
  }
};