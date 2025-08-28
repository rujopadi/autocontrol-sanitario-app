import React, { useState, useRef } from 'react';
import { importDataFromFile } from '../utils/dataMigration';

interface DataImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const DataImportWizard: React.FC<DataImportWizardProps> = ({ onComplete, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.name.endsWith('.json')) {
      setError('Por favor selecciona un archivo JSON válido');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fileContent = await file.text();
      const result = await importDataFromFile(fileContent);

      if (result.success) {
        setSuccess(result.message);
        setImportStats(result.stats);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.json')) {
      setError('Por favor arrastra un archivo JSON válido');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fileContent = await file.text();
      const result = await importDataFromFile(fileContent);

      if (result.success) {
        setSuccess(result.message);
        setImportStats(result.stats);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="migration-wizard">
      <div className="wizard-container">
        <div className="wizard-header">
          <h1>Importar Datos</h1>
          <p>Importa datos desde un archivo de backup JSON</p>
        </div>
        
        <div className="wizard-content">
          <div className="migration-step">
            <div className="step-icon">📁</div>
            <h2>Seleccionar Archivo</h2>
            <p>Selecciona o arrastra un archivo JSON con los datos a importar</p>

            {error && (
              <div className="error-details">
                <strong>Error:</strong>
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                {success}
              </div>
            )}

            {importStats && (
              <div className="migration-stats">
                <h3>Datos importados:</h3>
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-number">{importStats.deliveryRecords || 0}</span>
                    <span className="stat-label">Registros de Recepción</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{importStats.storageRecords || 0}</span>
                    <span className="stat-label">Registros de Almacenamiento</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{importStats.technicalSheets || 0}</span>
                    <span className="stat-label">Fichas Técnicas</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{importStats.suppliers || 0}</span>
                    <span className="stat-label">Proveedores</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{importStats.productTypes || 0}</span>
                    <span className="stat-label">Tipos de Producto</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{importStats.storageUnits || 0}</span>
                    <span className="stat-label">Unidades de Almacenamiento</span>
                  </div>
                </div>
              </div>
            )}

            <div 
              className={`file-drop-zone ${isLoading ? 'loading' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner large"></div>
                  <p>Procesando archivo...</p>
                </>
              ) : (
                <>
                  <div className="drop-icon">📄</div>
                  <p><strong>Arrastra tu archivo JSON aquí</strong></p>
                  <p>o haz clic para seleccionar</p>
                  <small>Solo archivos .json</small>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div className="migration-warning">
              <span className="warning-icon">⚠️</span>
              <div>
                <strong>Importante:</strong>
                <p>Los datos importados se agregarán a los datos existentes. Se creará un punto de restauración automáticamente.</p>
              </div>
            </div>

            <div className="step-actions">
              <button className="btn-secondary" onClick={onCancel}>
                Cancelar
              </button>
              {success && (
                <button className="btn-primary" onClick={onComplete}>
                  Continuar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportWizard;