import React, { useState, useMemo } from 'react';
import { exportToPDF, exportToExcel } from './exportUtils';
import { User, StorageUnit, StorageRecord, EstablishmentInfo } from './types';


interface StoragePageProps {
    users: User[];
    units: StorageUnit[];
    records: StorageRecord[];
    onAddUnit: (unit: Omit<StorageUnit, 'id'>) => void;
    onDeleteUnit: (id: string) => void;
    onAddRecord: (record: Omit<StorageRecord, 'id' | 'userId'>) => void;
    onDeleteRecord: (id: string) => void;
    establishmentInfo: EstablishmentInfo;
}


const StoragePage: React.FC<StoragePageProps> = ({ users, units, records, onAddUnit, onDeleteUnit, onAddRecord, onDeleteRecord, establishmentInfo }) => {
    // Collapsible sections state
    const [isRecordFormOpen, setIsRecordFormOpen] = useState(true);
    const [isUnitManagementOpen, setIsUnitManagementOpen] = useState(false);
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

    // Form state for new unit
    const [newUnitName, setNewUnitName] = useState('');
    const [newUnitType, setNewUnitType] = useState<StorageUnit['type']>('Cámara Frigorífica');
    const [newUnitMinTemp, setNewUnitMinTemp] = useState('');
    const [newUnitMaxTemp, setNewUnitMaxTemp] = useState('');


    // Form state for new record
    const [recordUnit, setRecordUnit] = useState<string>(units.length > 0 ? String(units[0].id) : '');
    const [recordDateTime, setRecordDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [recordTemp, setRecordTemp] = useState('');
    const [recordHumidity, setRecordHumidity] = useState('');
    const [recordRotation, setRecordRotation] = useState(false);
    const [recordMincing, setRecordMincing] = useState(false);
    
    // State for filtering
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Derived data for display
    const unitsMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const selectedUnitForRecord = useMemo(() => units.find(u => u.id === recordUnit), [units, recordUnit]);

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            if (!startDate && !endDate) return true;
            const recordDate = new Date(record.dateTime);
            if (startDate && new Date(startDate) > recordDate) return false;
            if (endDate && new Date(endDate).setHours(23, 59, 59, 999) < recordDate.getTime()) return false;
            return true;
        }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [records, startDate, endDate]);


    // Handlers
    const handleAddUnit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName.trim()) {
            alert('El nombre de la cámara no puede estar vacío.');
            return;
        }
        onAddUnit({
            name: newUnitName.trim(),
            type: newUnitType,
            minTemp: newUnitMinTemp !== '' ? parseFloat(newUnitMinTemp) : undefined,
            maxTemp: newUnitMaxTemp !== '' ? parseFloat(newUnitMaxTemp) : undefined,
        });
        setNewUnitName('');
        setNewUnitMinTemp('');
        setNewUnitMaxTemp('');
    };

    const handleDeleteUnit = (unitId: string) => {
        if (window.confirm('¿Eliminar esta cámara? También se eliminarán todos sus registros.')) {
            onDeleteUnit(unitId);
        }
    };

    const handleAddRecord = (e: React.FormEvent) => {
        e.preventDefault();
        if (!recordUnit || !recordTemp.trim()) {
            alert('Por favor, complete todos los campos del registro.');
            return;
        }
        if (selectedUnitForRecord?.type === 'Cámara de secado' && !recordHumidity.trim()){
            alert('Por favor, introduzca el valor de la humedad para la cámara de secado.');
            return;
        }
        onAddRecord({
            unitId: recordUnit,
            dateTime: new Date(recordDateTime).toISOString(),
            temperature: recordTemp,
            rotationCheck: recordRotation,
            mincingCheck: recordMincing,
            ...(selectedUnitForRecord?.type === 'Cámara de secado' && { humidity: recordHumidity })
        });

        // Reset form
        setRecordTemp('');
        setRecordHumidity('');
        setRecordRotation(false);
        setRecordMincing(false);
        setRecordDateTime(new Date().toISOString().slice(0, 16));
    };
    
    const handleDeleteRecord = (recordId: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este registro?')) {
            onDeleteRecord(recordId);
        }
    };

    const handleExportPDF = () => {
        const headers = ["Fecha y Hora", "Cámara", "Temp (°C)", "Humedad (%)", "Rotación OK", "Picado OK", "Usuario"];
        const data = filteredRecords.map(r => [
            new Date(r.dateTime).toLocaleString('es-ES'),
            unitsMap.get(r.unitId)?.name || 'N/A',
            r.temperature,
            r.humidity || 'N/A',
            r.rotationCheck ? 'Sí' : 'No',
            r.mincingCheck ? 'Sí' : 'No',
            usersMap.get(r.userId) || 'N/A'
        ]);
        exportToPDF("Historial de Controles de Almacenamiento", headers, data, "historial_almacenamiento", establishmentInfo);
    };

    const handleExportExcel = () => {
        const data = filteredRecords.map(r => ({
            "Fecha y Hora": new Date(r.dateTime).toLocaleString('es-ES'),
            "Cámara": unitsMap.get(r.unitId)?.name || 'N/A',
            "Temperatura (°C)": r.temperature,
            "Humedad (%)": r.humidity || 'N/A',
            "Rotación OK": r.rotationCheck ? 'Sí' : 'No',
            "Instrucciones Picado OK": r.mincingCheck ? 'Sí' : 'No',
            "Usuario": usersMap.get(r.userId) || 'N/A'
        }));
        exportToExcel(data, "historial_almacenamiento");
    };


    return (
        <>
            <h1>Gestión de Almacenamiento</h1>
            <div className="storage-grid">
                <div className="card">
                     <h2 
                        className="collapsible-header" 
                        onClick={() => setIsRecordFormOpen(!isRecordFormOpen)}
                        role="button"
                        aria-expanded={isRecordFormOpen}
                    >
                        Registrar Control
                        <span className={`chevron ${isRecordFormOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isRecordFormOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner">
                            <form onSubmit={handleAddRecord}>
                                <div className="form-group">
                                    <label htmlFor="record-unit">Cámara</label>
                                    <select id="record-unit" value={recordUnit} onChange={e => setRecordUnit(e.target.value)} required disabled={units.length === 0}>
                                        {units.length === 0 ? <option>Cree una cámara primero</option> : units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="record-datetime">Fecha y Hora</label>
                                    <input type="datetime-local" id="record-datetime" value={recordDateTime} onChange={e => setRecordDateTime(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="record-temp">Temperatura (°C)</label>
                                    <input type="number" step="0.1" id="record-temp" value={recordTemp} onChange={e => setRecordTemp(e.target.value)} placeholder="Ej: 3.5" required />
                                </div>
                                {selectedUnitForRecord?.type === 'Cámara de secado' && (
                                     <div className="form-group">
                                        <label htmlFor="record-humidity">Humedad (%)</label>
                                        <input type="number" step="0.1" id="record-humidity" value={recordHumidity} onChange={e => setRecordHumidity(e.target.value)} placeholder="Ej: 85" required />
                                    </div>
                                )}
                                <div className="form-group-checkbox">
                                    <input type="checkbox" id="record-rotation" checked={recordRotation} onChange={e => setRecordRotation(e.target.checked)} />
                                    <label htmlFor="record-rotation">Orden y rotación de alimentos OK</label>
                                </div>
                                <div className="form-group-checkbox">
                                    <input type="checkbox" id="record-mincing" checked={recordMincing} onChange={e => setRecordMincing(e.target.checked)} />
                                    <label htmlFor="record-mincing">Instrucciones de picado de carne OK</label>
                                </div>
                                <button type="submit" className="btn-submit" disabled={units.length === 0}>
                                    Guardar Registro
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <h2 
                        className="collapsible-header" 
                        onClick={() => setIsUnitManagementOpen(!isUnitManagementOpen)}
                        role="button"
                        aria-expanded={isUnitManagementOpen}
                    >
                        Gestionar Cámaras
                        <span className={`chevron ${isUnitManagementOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isUnitManagementOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner">
                            <form onSubmit={handleAddUnit}>
                                <div className="form-group">
                                    <label htmlFor="new-unit-name">Nombre de la cámara</label>
                                    <input type="text" id="new-unit-name" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} placeholder="Ej: Cámara Frutas" required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="new-unit-type">Tipo</label>
                                    <select id="new-unit-type" value={newUnitType} onChange={e => setNewUnitType(e.target.value as any)}>
                                        <option value="Cámara Frigorífica">Cámara Frigorífica</option>
                                        <option value="Cámara Expositora">Cámara Expositora</option>
                                        <option value="Cámara de secado">Cámara de secado</option>
                                    </select>
                                </div>
                                 <div className="costing-form-grid">
                                    <div className="form-group">
                                        <label htmlFor="new-unit-min-temp">Temp. Mínima Óptima (°C)</label>
                                        <input type="number" step="0.1" id="new-unit-min-temp" value={newUnitMinTemp} onChange={e => setNewUnitMinTemp(e.target.value)} placeholder="Ej: 0" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="new-unit-max-temp">Temp. Máxima Óptima (°C)</label>
                                        <input type="number" step="0.1" id="new-unit-max-temp" value={newUnitMaxTemp} onChange={e => setNewUnitMaxTemp(e.target.value)} placeholder="Ej: 4" />
                                    </div>
                                </div>
                                <button type="submit" className="btn-submit">Añadir Cámara</button>
                            </form>
                            <div className="units-list">
                                <h3>Cámaras Existentes</h3>
                                {units.length > 0 ? (
                                    units.map(unit => (
                                    <div key={unit.id} className="units-list-item">
                                        <div>
                                            <span>{unit.name}</span>
                                            <span className="unit-type">{unit.type}</span>
                                            {(unit.minTemp !== undefined && unit.maxTemp !== undefined) && <span className="unit-type">({unit.minTemp}°C - {unit.maxTemp}°C)</span>}
                                        </div>
                                        <button className="btn-delete" onClick={() => handleDeleteUnit(unit.id)}>Eliminar</button>
                                    </div>
                                    ))
                                ) : <p>No hay cámaras registradas.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card">
                <h2>Historial de Controles</h2>
                <div className="export-controls-container">
                     <h3>Exportar Registros</h3>
                     <div className="export-controls-row">
                        <div className="form-group">
                            <label htmlFor="start-date">Fecha de Inicio</label>
                            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                         <div className="form-group">
                            <label htmlFor="end-date">Fecha de Fin</label>
                            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className="export-buttons">
                            <button className="btn-export btn-pdf" onClick={handleExportPDF} disabled={filteredRecords.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                PDF
                            </button>
                            <button className="btn-export btn-excel" onClick={handleExportExcel} disabled={filteredRecords.length === 0}>
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                Excel
                            </button>
                        </div>
                     </div>
                </div>
                {filteredRecords.length > 0 ? (
                    <div style={{overflowX: 'auto'}}>
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Cámara</th>
                                    <th>Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map(record => {
                                    const isExpanded = expandedRecordId === record.id;
                                    const unit = unitsMap.get(record.unitId);
                                    const unitName = unit?.name || 'N/A';
                                    const userName = usersMap.get(record.userId) || 'N/A';
                                    const formattedDate = new Date(record.dateTime).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                    
                                    const temp = parseFloat(record.temperature);
                                    let tempClass = '';
                                    if(unit && unit.minTemp !== undefined && unit.maxTemp !== undefined) {
                                        if (temp < unit.minTemp || temp > unit.maxTemp) tempClass = 'danger';
                                    }


                                    return (
                                        <React.Fragment key={record.id}>
                                            <tr 
                                                className="summary-row" 
                                                onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                                                aria-expanded={isExpanded}
                                            >
                                                <td data-label="Fecha y Hora">{formattedDate}</td>
                                                <td data-label="Cámara" className={tempClass}>{unitName}</td>
                                                <td data-label="Detalles" className="expand-cell">
                                                     <span className="expand-indicator">{isExpanded ? 'Ocultar' : 'Ver'}</span>
                                                     <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                 <tr className="detail-row">
                                                    <td colSpan={3}>
                                                        <div className="record-details">
                                                            <div><strong>Temperatura</strong><span className={tempClass}>{record.temperature}°C</span></div>
                                                            {record.humidity && <div><strong>Humedad</strong><span>{record.humidity}%</span></div>}
                                                            <div><strong>Rotación OK</strong><span className={record.rotationCheck ? 'check-icon' : 'cross-icon'}>{record.rotationCheck ? '✓' : '✗'}</span></div>
                                                            <div><strong>Picado OK</strong><span className={record.mincingCheck ? 'check-icon' : 'cross-icon'}>{record.mincingCheck ? '✓' : '✗'}</span></div>
                                                            <div><strong>Usuario</strong><span>{userName}</span></div>
                                                            <div className="detail-actions">
                                                                <strong>Acciones</strong>
                                                                <div>
                                                                    <button
                                                                        className="btn-delete"
                                                                        onClick={() => handleDeleteRecord(record.id)}
                                                                        aria-label={`Eliminar registro de ${unitName}`}>
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <p>No hay registros para el rango de fechas seleccionado.</p>}
            </div>
        </>
    );
};

export default StoragePage;
