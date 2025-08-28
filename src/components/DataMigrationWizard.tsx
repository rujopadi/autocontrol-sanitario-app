import React, { useState, useEffect } from 'react';
import { 
  hasLocalStorageData, 
  getMigrationStats, 
  getLocalStorageData,
  validateMigrationData,
  prepareMigrationData,
  createLocalStorageBackup,
  clearLocalStorageData,
  downloadBackup,
  isMigrationCompleted,
  createRestorePoint,
  restoreFromBackup,
  validateMigrationIntegrity,
  markMigrationCompleted,
  getRestorePointInfo,
  MigrationResult
} from '../utils/dataMigration';
import { useAppData } from '../contexts';

interface DataMigrationWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

type MigrationStep = 'detect' | 'review' | 'backup' | 'migrate' | 'complete' | 'error';

const DataMigrationWizard: React.FC<DataMigrationWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<MigrationStep>('detect');
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [backupCreated, setBackupCreated] = useState(false);
  const [restorePointCreated, setRestorePointCreated] = useState(false);
  const [canRollback, setCanRollback] = useState(false);
  const [originalStats, setOriginalStats] = useState<any>(null);
  
  const { 
    addDeliveryRecord,
    addStorageRecord,
    addTechnicalSheet,
    addSupplier,
    addProductType,
    addStorageUnit,
    updateEstablishmentInfo
  } = useAppData();

  // Detectar datos al montar el componente
  useEffect(() => {
    if (isMigrationCompleted()) {
      onComplete();
      return;
    }
    
    if (hasLocalStorageData()) {
      const stats = getMigrationStats();
      setMigrationStats(stats);
      setCurrentStep('review');
    } else {
      // No hay datos para migrar
      onComplete();
    }
  }, [onComplete]);

  const handleReviewData = () => {
    setCurrentStep('backup');
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      downloadBackup();
      setBackupCreated(true);
      setCurrentStep('migrate');
    } catch (err: any) {
      setError(err.message || 'Error al crear el backup');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBackup = () => {
    setCurrentStep('migrate');
  };

  const handleRollback = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = restoreFromBackup();
      if (success) {
        setCurrentStep('review');
        setCanRollback(false);
        setRestorePointCreated(false);
        setMigrationResult(null);
      } else {
        setError('No se pudo restaurar los datos desde el punto de restauración');
      }
    } catch (err: any) {
      setError(err.message || 'Error durante el rollback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrateData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Crear punto de restauración antes de la migración
      if (!restorePointCreated) {
        createRestorePoint();
        setRestorePointCreated(true);
        setCanRollback(true);
      }
      
      // Obtener estadísticas originales para validación
      const stats = getMigrationStats();
      setOriginalStats(stats);
      
      // Obtener y validar datos
      const rawData = getLocalStorageData();
      const validation = validateMigrationData(rawData);
      
      if (!validation.isValid) {
        throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      }
      
      // Preparar datos limpios
      const cleanData = prepareMigrationData(rawData);
      
      // Contadores para el resultado
      let migratedCounts = {
        deliveryRecords: 0,
        storageRecords: 0,
        technicalSheets: 0,
        suppliers: 0,
        productTypes: 0,
        storageUnits: 0,
        establishmentInfo: false,
        otherRecords: 0
      };
      
      const errors: string[] = [];
      
      // Migrar suppliers primero (dependencia)
      if (cleanData.suppliers && cleanData.suppliers.length > 0) {
        for (const supplier of cleanData.suppliers) {
          try {
            await addSupplier(supplier.name);
            migratedCounts.suppliers++;
          } catch (err: any) {
            errors.push(`Error migrando proveedor ${supplier.name}: ${err.message}`);
          }
        }
      }
      
      // Migrar productTypes (dependencia)
      if (cleanData.productTypes && cleanData.productTypes.length > 0) {
        for (const productType of cleanData.productTypes) {
          try {
            await addProductType(productType.name, productType.optimalTemp);
            migratedCounts.productTypes++;
          } catch (err: any) {
            errors.push(`Error migrando tipo de producto ${productType.name}: ${err.message}`);
          }
        }
      }
      
      // Migrar storageUnits (dependencia)
      if (cleanData.storageUnits && cleanData.storageUnits.length > 0) {
        for (const unit of cleanData.storageUnits) {
          try {
            await addStorageUnit({
              name: unit.name,
              minTemp: unit.minTemp,
              maxTemp: unit.maxTemp
            });
            migratedCounts.storageUnits++;
          } catch (err: any) {
            errors.push(`Error migrando unidad de almacenamiento ${unit.name}: ${err.message}`);
          }
        }
      }
      
      // Migrar deliveryRecords
      if (cleanData.deliveryRecords && cleanData.deliveryRecords.length > 0) {
        for (const record of cleanData.deliveryRecords) {
          try {
            await addDeliveryRecord({
              supplier: record.supplier,
              productType: record.productType,
              receptionDate: record.receptionDate,
              temperature: record.temperature,
              documentsOk: record.documentsOk,
              albaranImage: record.albaranImage
            });
            migratedCounts.deliveryRecords++;
          } catch (err: any) {
            errors.push(`Error migrando registro de recepción: ${err.message}`);
          }
        }
      }
      
      // Migrar storageRecords
      if (cleanData.storageRecords && cleanData.storageRecords.length > 0) {
        for (const record of cleanData.storageRecords) {
          try {
            await addStorageRecord({
              unitId: record.unitId,
              temperature: record.temperature,
              dateTime: record.dateTime
            });
            migratedCounts.storageRecords++;
          } catch (err: any) {
            errors.push(`Error migrando registro de almacenamiento: ${err.message}`);
          }
        }
      }
      
      // Migrar technicalSheets
      if (cleanData.technicalSheets && cleanData.technicalSheets.length > 0) {
        for (const sheet of cleanData.technicalSheets) {
          try {
            await addTechnicalSheet({
              productName: sheet.productName,
              ingredients: sheet.ingredients,
              allergens: sheet.allergens,
              nutritionalInfo: sheet.nutritionalInfo,
              storageConditions: sheet.storageConditions,
              shelfLife: sheet.shelfLife
            });
            migratedCounts.technicalSheets++;
          } catch (err: any) {
            errors.push(`Error migrando ficha técnica ${sheet.productName}: ${err.message}`);
          }
        }
      }
      
      // Migrar establishmentInfo
      if (cleanData.establishmentInfo && cleanData.establishmentInfo.name) {
        try {
          await updateEstablishmentInfo(cleanData.establishmentInfo);
          migratedCounts.establishmentInfo = true;
        } catch (err: any) {
          errors.push(`Error migrando información del establecimiento: ${err.message}`);
        }
      }
      
      // Validar integridad de la migración
      const integrityCheck = await validateMigrationIntegrity(stats, migratedCounts);
      if (!integrityCheck.isValid) {
        errors.push(...integrityCheck.issues);
      }
      
      // Crear resultado
      const result: MigrationResult = {
        success: errors.length === 0,
        message: errors.length === 0 
          ? 'Migración completada exitosamente'
          : `Migración completada con ${errors.length} errores`,
        migratedData: migratedCounts,
        errors: errors.length > 0 ? errors : undefined
      };
      
      setMigrationResult(result);
      
      if (result.success) {
        // Marcar migración como completada y limpiar localStorage
        markMigrationCompleted();
        clearLocalStorageData();
        setCanRollback(false);
        setCurrentStep('complete');
      } else {
        setCurrentStep('error');
      }
      
    } catch (err: any) {
      setError(err.message || 'Error durante la migración');
      setCurrentStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'detect':
        return (
          <div className="migration-step">
            <div className="step-icon loading">🔍</div>
            <h2>Detectando datos existentes...</h2>
            <div className="loading-spinner"></div>
          </div>
        );
      
      case 'review':
        return (
          <div className="migration-step">
            <div className="step-icon">📊</div>
            <h2>Datos encontrados para migrar</h2>
            <p>Se han encontrado datos de tu aplicación anterior. Aquí tienes un resumen:</p>
            
            <div className="migration-stats">
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-number">{migrationStats?.deliveryRecords || 0}</span>
                  <span className="stat-label">Registros de Recepción</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{migrationStats?.storageRecords || 0}</span>
                  <span className="stat-label">Registros de Almacenamiento</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{migrationStats?.technicalSheets || 0}</span>
                  <span className="stat-label">Fichas Técnicas</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{migrationStats?.suppliers || 0}</span>
                  <span className="stat-label">Proveedores</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{migrationStats?.productTypes || 0}</span>
                  <span className="stat-label">Tipos de Producto</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{migrationStats?.storageUnits || 0}</span>
                  <span className="stat-label">Unidades de Almacenamiento</span>
                </div>
              </div>
              
              {migrationStats?.hasEstablishmentInfo && (
                <div className="establishment-info">
                  <span className="info-icon">🏢</span>
                  <span>Información del establecimiento disponible</span>
                </div>
              )}
              
              {migrationStats?.otherRecords > 0 && (
                <div className="other-records">
                  <span className="info-icon">📋</span>
                  <span>{migrationStats.otherRecords} registros adicionales (limpieza, trazabilidad, etc.)</span>
                </div>
              )}
            </div>
            
            <div className="step-actions">
              <button className="btn-secondary" onClick={onSkip}>
                Omitir Migración
              </button>
              <button className="btn-primary" onClick={handleReviewData}>
                Continuar con Migración
              </button>
            </div>
          </div>
        );
      
      case 'backup':
        return (
          <div className="migration-step">
            <div className="step-icon">💾</div>
            <h2>Crear Backup de Seguridad</h2>
            <p>Recomendamos crear un backup de tus datos antes de la migración por seguridad.</p>
            
            <div className="backup-info">
              <div className="info-box">
                <span className="info-icon">ℹ️</span>
                <div>
                  <strong>¿Por qué crear un backup?</strong>
                  <p>El backup te permitirá recuperar tus datos en caso de que algo salga mal durante la migración.</p>
                </div>
              </div>
            </div>
            
            <div className="step-actions">
              <button className="btn-secondary" onClick={handleSkipBackup}>
                Omitir Backup
              </button>
              <button 
                className={`btn-primary ${isLoading ? 'loading' : ''}`}
                onClick={handleCreateBackup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Creando Backup...
                  </>
                ) : (
                  'Crear y Descargar Backup'
                )}
              </button>
            </div>
          </div>
        );
      
      case 'migrate':
        return (
          <div className="migration-step">
            <div className="step-icon">{isLoading ? '⏳' : '🚀'}</div>
            <h2>{isLoading ? 'Migrando datos...' : 'Listo para migrar'}</h2>
            
            {isLoading ? (
              <div className="migration-progress">
                <div className="loading-spinner large"></div>
                <p>Transfiriendo tus datos al nuevo sistema...</p>
                <small>Esto puede tomar unos minutos dependiendo de la cantidad de datos.</small>
              </div>
            ) : (
              <>
                <p>Todo está listo para transferir tus datos al nuevo sistema multi-organización.</p>
                
                {backupCreated && (
                  <div className="success-message">
                    <span className="success-icon">✅</span>
                    Backup creado y descargado exitosamente
                  </div>
                )}
                
                <div className="migration-warning">
                  <span className="warning-icon">⚠️</span>
                  <div>
                    <strong>Importante:</strong>
                    <p>Una vez completada la migración, los datos locales serán eliminados para evitar duplicados.</p>
                  </div>
                </div>
                
                <div className="step-actions">
                  <button className="btn-secondary" onClick={onSkip}>
                    Cancelar
                  </button>
                  <button className="btn-primary" onClick={handleMigrateData}>
                    Iniciar Migración
                  </button>
                </div>
              </>
            )}
          </div>
        );
      
      case 'complete':
        return (
          <div className="migration-step">
            <div className="step-icon success">🎉</div>
            <h2>¡Migración Completada!</h2>
            <p>Tus datos han sido transferidos exitosamente al nuevo sistema.</p>
            
            {migrationResult && (
              <div className="migration-summary">
                <h3>Resumen de la migración:</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-number">{migrationResult.migratedData?.deliveryRecords || 0}</span>
                    <span className="summary-label">Registros de Recepción</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-number">{migrationResult.migratedData?.storageRecords || 0}</span>
                    <span className="summary-label">Registros de Almacenamiento</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-number">{migrationResult.migratedData?.technicalSheets || 0}</span>
                    <span className="summary-label">Fichas Técnicas</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-number">{migrationResult.migratedData?.suppliers || 0}</span>
                    <span className="summary-label">Proveedores</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-number">{migrationResult.migratedData?.productTypes || 0}</span>
                    <span className="summary-label">Tipos de Producto</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-number">{migrationResult.migratedData?.storageUnits || 0}</span>
                    <span className="summary-label">Unidades de Almacenamiento</span>
                  </div>
                </div>
                
                {migrationResult.migratedData?.establishmentInfo && (
                  <div className="establishment-migrated">
                    <span className="success-icon">✅</span>
                    <span>Información del establecimiento migrada</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="step-actions">
              <button className="btn-primary" onClick={onComplete}>
                Continuar a la Aplicación
              </button>
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="migration-step">
            <div className="step-icon error">❌</div>
            <h2>Error en la Migración</h2>
            <p>Se produjo un error durante el proceso de migración.</p>
            
            {error && (
              <div className="error-details">
                <strong>Error:</strong>
                <p>{error}</p>
              </div>
            )}
            
            {migrationResult?.errors && (
              <div className="error-list">
                <strong>Errores específicos:</strong>
                <ul>
                  {migrationResult.errors.map((err, index) => (
                    <li key={index}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="step-actions">
              <button className="btn-secondary" onClick={onSkip}>
                Continuar sin Migración
              </button>
              {canRollback && (
                <button 
                  className="btn-warning" 
                  onClick={handleRollback}
                  disabled={isLoading}
                >
                  {isLoading ? 'Restaurando...' : 'Restaurar Datos'}
                </button>
              )}
              <button className="btn-primary" onClick={() => setCurrentStep('review')}>
                Intentar de Nuevo
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="migration-wizard">
      <div className="wizard-container">
        <div className="wizard-header">
          <h1>Migración de Datos</h1>
          <div className="progress-indicator">
            <div className={`progress-step ${['detect', 'review'].includes(currentStep) ? 'active' : 'completed'}`}>1</div>
            <div className={`progress-line ${['backup', 'migrate', 'complete'].includes(currentStep) ? 'completed' : ''}`}></div>
            <div className={`progress-step ${currentStep === 'backup' ? 'active' : ['migrate', 'complete'].includes(currentStep) ? 'completed' : ''}`}>2</div>
            <div className={`progress-line ${['complete'].includes(currentStep) ? 'completed' : ''}`}></div>
            <div className={`progress-step ${currentStep === 'migrate' ? 'active' : currentStep === 'complete' ? 'completed' : ''}`}>3</div>
            <div className={`progress-line ${currentStep === 'complete' ? 'completed' : ''}`}></div>
            <div className={`progress-step ${currentStep === 'complete' ? 'active completed' : ''}`}>4</div>
          </div>
        </div>
        
        <div className="wizard-content">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default DataMigrationWizard;