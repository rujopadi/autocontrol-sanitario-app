
import React, { useState, useMemo } from 'react';
import { exportToPDF, exportToExcel } from './exportUtils';
import { User, DailySurface, DailyCleaningRecord, FrequentArea, EstablishmentInfo } from './App';

interface CleaningPageProps {
    users: User[];
    surfaces: DailySurface[];
    dailyRecords: DailyCleaningRecord[];
    areas: FrequentArea[];
    onAddSurface: (name: string) => void;
    onDeleteSurface: (id: string) => void;
    onCleanSurface: (record: Omit<DailyCleaningRecord, 'id'>) => void;
    onDeleteRecord: (id: string) => void;
    onAddArea: (area: Omit<FrequentArea, 'id'>) => void;
    onDeleteArea: (id: string) => void;
    onCleanArea: (id: string) => void;
    establishmentInfo: EstablishmentInfo;
}


// Helper para calcular la próxima fecha de vencimiento
const calculateNextDueDate = (lastCleaned: string | null, frequencyDays: number): Date | null => {
    if (!lastCleaned) return new Date();
    const lastCleanedDate = new Date(lastCleaned);
    const nextDueDate = new Date(lastCleanedDate);
    nextDueDate.setDate(lastCleanedDate.getDate() + frequencyDays);
    return nextDueDate;
};

const CleaningPage: React.FC<CleaningPageProps> = ({
    users, surfaces, dailyRecords, areas,
    onAddSurface, onDeleteSurface, onCleanSurface, onDeleteRecord,
    onAddArea, onDeleteArea, onCleanArea, establishmentInfo
}) => {
    // Estado de formularios y UI
    const [newSurfaceName, setNewSurfaceName] = useState('');
    const [cleaningUser, setCleaningUser] = useState<string>(users.length > 0 ? String(users[0].id) : '');
    const [isSurfaceManagementOpen, setIsSurfaceManagementOpen] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaFrequency, setNewAreaFrequency] = useState('');
    const [isAreaManagementOpen, setIsAreaManagementOpen] = useState(false);
    const [isDailyCleaningOpen, setIsDailyCleaningOpen] = useState(true);
    const [isFrequentCleaningOpen, setIsFrequentCleaningOpen] = useState(true);
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Memos para visualización
    const surfacesMap = useMemo(() => new Map(surfaces.map(s => [s.id, s.name])), [surfaces]);
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const filteredDailyRecords = useMemo(() => {
        return dailyRecords.filter(record => {
            if (!startDate && !endDate) return true;
            const recordDate = new Date(record.dateTime);
            if (startDate && new Date(startDate) > recordDate) return false;
            if (endDate && new Date(endDate).setHours(23, 59, 59, 999) < recordDate.getTime()) return false;
            return true;
        }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    }, [dailyRecords, startDate, endDate]);

    // Handlers: Limpieza Diaria
    const handleAddSurface = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSurfaceName.trim()) { alert('El nombre de la superficie no puede estar vacío.'); return; }
        onAddSurface(newSurfaceName.trim());
        setNewSurfaceName('');
    };

    const handleDeleteSurface = (id: string) => {
        if (window.confirm('¿Eliminar esta superficie? Sus registros de limpieza existentes no se eliminarán.')) {
            onDeleteSurface(id);
        }
    };

    const handleCleanSurface = (surfaceId: string) => {
        if (!cleaningUser) {
            alert('Por favor, seleccione un usuario antes de registrar una limpieza.');
            return;
        }
        onCleanSurface({
            surfaceId: surfaceId,
            dateTime: new Date().toISOString(),
            userId: cleaningUser,
        });
        alert(`Limpieza de "${surfacesMap.get(surfaceId)}" registrada.`);
    };
    
    const handleDeleteRecord = (id: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este registro de limpieza?')) {
            onDeleteRecord(id);
        }
    };

    // Handlers: Limpieza Frecuente
    const handleAddArea = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAreaName.trim() || !newAreaFrequency.trim() || parseInt(newAreaFrequency) < 1) { alert('Por favor, complete todos los campos con valores válidos.'); return; }
        onAddArea({
            name: newAreaName.trim(),
            frequencyDays: parseInt(newAreaFrequency, 10),
            lastCleaned: null
        });
        setNewAreaName('');
        setNewAreaFrequency('');
    };
    
    const handleDeleteArea = (id: string) => {
        if (window.confirm('¿Eliminar esta zona de limpieza?')) {
            onDeleteArea(id);
        }
    };

    const handleCleanArea = (areaId: string) => {
        onCleanArea(areaId);
        alert(`Limpieza de "${areas.find(a=>a.id === areaId)?.name}" registrada.`);
    };

    // Handlers: Exportación
    const handleExportPDF = () => {
        const headers = ["Fecha y Hora", "Superficie", "Usuario"];
        const data = filteredDailyRecords.map(r => [
            new Date(r.dateTime).toLocaleString('es-ES'),
            surfacesMap.get(r.surfaceId) || 'Superficie eliminada',
            usersMap.get(r.userId) || 'Usuario eliminado'
        ]);
        exportToPDF("Historial de Limpieza Diaria", headers, data, "historial_limpieza_diaria", establishmentInfo);
    };

    const handleExportExcel = () => {
        const data = filteredDailyRecords.map(r => ({
            "Fecha y Hora": new Date(r.dateTime).toLocaleString('es-ES'),
            "Superficie": surfacesMap.get(r.surfaceId) || 'Superficie eliminada',
            "Usuario": usersMap.get(r.userId) || 'Usuario eliminado'
        }));
        exportToExcel(data, "historial_limpieza_diaria");
    };

    return (
        <>
            <h1>Limpieza e Higiene</h1>
            <div className="card" style={{marginBottom: '30px'}}>
                <div className="form-group" style={{maxWidth: '400px', margin: '0'}}>
                    <label htmlFor="cleaning-user"><strong>Usuario que realiza la limpieza</strong></label>
                    <select id="cleaning-user" value={cleaningUser} onChange={e => setCleaningUser(e.target.value)} required>
                         {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="page-grid">
                {/* --- LIMPIEZA DIARIA --- */}
                <div className="card" style={{display: 'flex', flexDirection: 'column'}}>
                    <h2
                        className="collapsible-header"
                        onClick={() => setIsDailyCleaningOpen(!isDailyCleaningOpen)}
                        role="button"
                        aria-expanded={isDailyCleaningOpen}
                    >
                        Limpieza Diaria
                        <span className={`chevron ${isDailyCleaningOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isDailyCleaningOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner" style={{paddingBottom: 0}}>
                            <p style={{color: '#6c757d', marginBottom: '20px', flexShrink: 0}}>Marque una superficie para registrar su limpieza con la fecha y hora actuales.</p>
                            <div style={{flexGrow: 1, overflowY: 'auto'}}>
                                <div className="units-list">
                                    <h3>Superficies a Limpiar</h3>
                                    {surfaces.length > 0 ? surfaces.map(surface => (
                                        <div key={surface.id} className="units-list-item">
                                            <span>{surface.name}</span>
                                            <button className="btn-submit" style={{width: 'auto', padding: '8px 15px', marginTop: 0}} onClick={() => handleCleanSurface(surface.id)} disabled={!cleaningUser}>Limpiado</button>
                                        </div>
                                    )) : <p>No hay superficies creadas.</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr style={{border: 'none', borderTop: '1px solid var(--border-color)', margin: '25px 0', flexShrink: 0}} />
                    <div style={{flexShrink: 0}}>
                        <h3 
                            className="collapsible-header"
                            onClick={() => setIsSurfaceManagementOpen(!isSurfaceManagementOpen)}
                            role="button"
                            aria-expanded={isSurfaceManagementOpen}
                        >
                            Gestionar Superficies
                             <span className={`chevron ${isSurfaceManagementOpen ? 'open' : ''}`}>&#9660;</span>
                        </h3>
                         <div className={`collapsible-content ${isSurfaceManagementOpen ? 'open' : ''}`}>
                            <div className="collapsible-content-inner">
                                <form onSubmit={handleAddSurface}>
                                    <div className="form-group">
                                        <label htmlFor="new-surface-name">Añadir nueva superficie</label>
                                        <input type="text" id="new-surface-name" value={newSurfaceName} onChange={e => setNewSurfaceName(e.target.value)} placeholder="Ej: Tabla de cortar roja" required />
                                    </div>
                                    <button type="submit" className="btn-submit">Añadir</button>
                                </form>
                                 {surfaces.map(s => (
                                    <div key={s.id} className="units-list-item" style={{backgroundColor: 'transparent', padding: '10px 0'}}>
                                        <span>{s.name}</span>
                                        <button className="btn-delete" onClick={() => handleDeleteSurface(s.id)}>Eliminar</button>
                                    </div>
                                 ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LIMPIEZA FRECUENTE --- */}
                <div className="card" style={{display: 'flex', flexDirection: 'column'}}>
                    <h2
                        className="collapsible-header"
                        onClick={() => setIsFrequentCleaningOpen(!isFrequentCleaningOpen)}
                        role="button"
                        aria-expanded={isFrequentCleaningOpen}
                    >
                        Limpieza Frecuente
                        <span className={`chevron ${isFrequentCleaningOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                     <div className={`collapsible-content ${isFrequentCleaningOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner" style={{paddingBottom: 0}}>
                            <p style={{color: '#6c757d', marginBottom: '20px', flexShrink: 0}}>Marque una zona para actualizar su fecha de última limpieza.</p>
                            <div className="units-list" style={{flexGrow: 1, overflowY: 'auto'}}>
                                <h3>Zonas a Limpiar</h3>
                                {areas.length > 0 ? areas.map(area => {
                                    const nextDueDate = calculateNextDueDate(area.lastCleaned, area.frequencyDays);
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    
                                    let statusClass = '';
                                    let statusText = 'OK';
                                    
                                    if (nextDueDate) {
                                        nextDueDate.setHours(0,0,0,0);
                                        const timeDiff = nextDueDate.getTime() - today.getTime();
                                        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                                        if (!area.lastCleaned) {
                                            statusClass = 'status-due';
                                            statusText = `PENDIENTE INICIAL`;
                                        } else if (dayDiff < 0) {
                                            statusClass = 'status-overdue';
                                            statusText = `VENCIDO HACE ${Math.abs(dayDiff)} DÍA(S)`;
                                        } else if (dayDiff <= 2 && dayDiff >= 0) {
                                            statusClass = 'status-due';
                                            statusText = `VENCE EN ${dayDiff} DÍA(S)`;
                                        }
                                    }
                                    
                                    return (
                                        <div key={area.id} className={`units-list-item-stacked ${statusClass}`}>
                                            <div className="item-main-info">
                                                <span>{area.name}</span>
                                                <button className="btn-submit" style={{width: 'auto', padding: '8px 15px', marginTop: 0}} onClick={() => handleCleanArea(area.id)} disabled={!cleaningUser}>Limpiado</button>
                                            </div>
                                            <div className="item-meta-info">
                                                <span>Frecuencia: <strong>Cada {area.frequencyDays} días</strong></span>
                                                <span>Última vez: <strong>{area.lastCleaned ? new Date(area.lastCleaned).toLocaleDateString('es-ES') : 'Nunca'}</strong></span>
                                                <span className="status-text">{statusText}</span>
                                            </div>
                                        </div>
                                    )
                                }) : <p>No hay zonas creadas.</p>}
                            </div>
                        </div>
                     </div>
                     <hr style={{border: 'none', borderTop: '1px solid var(--border-color)', margin: '25px 0', flexShrink: 0}} />
                     <div style={{flexShrink: 0}}>
                        <h3 
                            className="collapsible-header"
                            onClick={() => setIsAreaManagementOpen(!isAreaManagementOpen)}
                            role="button"
                            aria-expanded={isAreaManagementOpen}
                        >
                            Gestionar Zonas
                             <span className={`chevron ${isAreaManagementOpen ? 'open' : ''}`}>&#9660;</span>
                        </h3>
                         <div className={`collapsible-content ${isAreaManagementOpen ? 'open' : ''}`}>
                            <div className="collapsible-content-inner">
                                <form onSubmit={handleAddArea}>
                                    <div className="form-group">
                                        <label htmlFor="new-area-name">Nombre de la zona</label>
                                        <input type="text" id="new-area-name" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} placeholder="Ej: Almacén seco" required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="new-area-freq">Frecuencia de limpieza (días)</label>
                                        <input type="number" min="1" id="new-area-freq" value={newAreaFrequency} onChange={e => setNewAreaFrequency(e.target.value)} placeholder="Ej: 7" required />
                                    </div>
                                    <button type="submit" className="btn-submit">Añadir</button>
                                </form>
                                {areas.map(a => (
                                    <div key={a.id} className="units-list-item" style={{backgroundColor: 'transparent', padding: '10px 0'}}>
                                        <span>{a.name} (Cada {a.frequencyDays} días)</span>
                                        <button className="btn-delete" onClick={() => handleDeleteArea(a.id)}>Eliminar</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- HISTORIAL DIARIO --- */}
            <div className="card">
                <h2>Historial de Limpieza Diaria</h2>
                <div className="export-controls-container">
                     <h3>Exportar Registros</h3>
                     <div className="export-controls-row">
                        <div className="form-group">
                            <label htmlFor="start-date-daily">Fecha de Inicio</label>
                            <input type="date" id="start-date-daily" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                         <div className="form-group">
                            <label htmlFor="end-date-daily">Fecha de Fin</label>
                            <input type="date" id="end-date-daily" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className="export-buttons">
                            <button className="btn-export btn-pdf" onClick={handleExportPDF} disabled={filteredDailyRecords.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                PDF
                            </button>
                            <button className="btn-export btn-excel" onClick={handleExportExcel} disabled={filteredDailyRecords.length === 0}>
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                Excel
                            </button>
                        </div>
                     </div>
                </div>
                {filteredDailyRecords.length > 0 ? (
                    <div style={{overflowX: 'auto'}}>
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Superficie</th>
                                    <th>Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDailyRecords.map(record => {
                                    const isExpanded = expandedRecordId === record.id;
                                    const surfaceName = surfacesMap.get(record.surfaceId) || 'Superficie eliminada';
                                    const userName = usersMap.get(record.userId) || 'Usuario eliminado';
                                    const formattedDate = new Date(record.dateTime).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <React.Fragment key={record.id}>
                                            <tr 
                                                className="summary-row" 
                                                onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                                                aria-expanded={isExpanded}
                                            >
                                                <td data-label="Fecha y Hora">{formattedDate}</td>
                                                <td data-label="Superficie">{surfaceName}</td>
                                                <td data-label="Detalles" className="expand-cell">
                                                     <span className="expand-indicator">{isExpanded ? 'Ocultar' : 'Ver'}</span>
                                                     <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                 <tr className="detail-row">
                                                    <td colSpan={3}>
                                                        <div className="record-details">
                                                            <div><strong>Usuario</strong><span>{userName}</span></div>
                                                            <div className="detail-actions">
                                                                <strong>Acciones</strong>
                                                                <div>
                                                                    <button
                                                                        className="btn-delete"
                                                                        onClick={() => handleDeleteRecord(record.id)}
                                                                        aria-label={`Eliminar registro de ${surfaceName}`}>
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
                ) : <p>No hay registros de limpieza diaria para el rango de fechas seleccionado.</p>}
            </div>
        </>
    );
};

export default CleaningPage;
