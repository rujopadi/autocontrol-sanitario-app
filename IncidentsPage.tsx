import React, { useState, useMemo, useEffect } from 'react';
import { exportToPDF, exportToExcel } from './exportUtils';
import { User, Incident, IncidentFormData, IncidentSeverity, IncidentStatus, CorrectiveAction, CorrectiveActionFormData, CorrectiveActionStatus, EstablishmentInfo } from './App';
import { useNotifications } from './NotificationContext';
import UserSelector from './components/UserSelector';
import { getCompanyUsers } from './utils/dataMigration';

interface IncidentsPageProps {
    users: User[];
    incidents: Incident[];
    onAddIncident: (incident: IncidentFormData) => void;
    onUpdateIncident: (id: string, updates: Partial<Incident>) => void;
    onDeleteIncident: (id: string) => void;
    onAddCorrectiveAction: (action: CorrectiveActionFormData) => void;
    onUpdateCorrectiveAction: (id: string, updates: Partial<CorrectiveAction>) => void;
    onDeleteCorrectiveAction: (id: string) => void;
    establishmentInfo: EstablishmentInfo;
    currentUser: User;
}

const IncidentsPage: React.FC<IncidentsPageProps> = ({
    users, incidents, onAddIncident, onUpdateIncident, onDeleteIncident, 
    onAddCorrectiveAction, onUpdateCorrectiveAction, onDeleteCorrectiveAction,
    establishmentInfo, currentUser
}) => {
    const { warning, success } = useNotifications();
    
    // UI State
    const [isIncidentFormOpen, setIsIncidentFormOpen] = useState(true);
    const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);
    const [showCorrectiveActionForm, setShowCorrectiveActionForm] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('');
    const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | ''>('');
    const [areaFilter, setAreaFilter] = useState('');
    const [searchText, setSearchText] = useState('');
    const [debouncedSearchText, setDebouncedSearchText] = useState('');
    
    // Form state: New Incident
    const [incidentTitle, setIncidentTitle] = useState('');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
    const [incidentArea, setIncidentArea] = useState('');
    const [incidentSeverity, setIncidentSeverity] = useState<IncidentSeverity>('Media');
    
    // Estados para trazabilidad
    const [registeredById, setRegisteredById] = useState('');
    const [registeredBy, setRegisteredBy] = useState('');
    
    // Obtener usuarios de la empresa
    const companyUsers = useMemo(() => getCompanyUsers(currentUser), [currentUser]);
    
    // Estados para resolución de incidencias
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [incidentToResolve, setIncidentToResolve] = useState<string | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');

    // Form state: New Corrective Action
    const [actionDescription, setActionDescription] = useState('');
    const [actionDate, setActionDate] = useState(new Date().toISOString().slice(0, 10));
    const [actionResponsible, setActionResponsible] = useState(currentUser.id);
    const [actionStatus, setActionStatus] = useState<CorrectiveActionStatus>('Pendiente');

    // Derived data for display
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    // Debouncing para búsqueda de texto
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchText]);

    const filteredIncidents = useMemo(() => {
        return incidents.filter(incident => {
            // Filtro por fechas
            if (startDate && new Date(incident.detectionDate) < new Date(startDate)) return false;
            if (endDate && new Date(incident.detectionDate) > new Date(endDate)) return false;
            
            // Filtro por estado
            if (statusFilter && incident.status !== statusFilter) return false;
            
            // Filtro por gravedad
            if (severityFilter && incident.severity !== severityFilter) return false;
            
            // Filtro por área
            if (areaFilter && !incident.affectedArea.toLowerCase().includes(areaFilter.toLowerCase())) return false;
            
            // Filtro por búsqueda de texto (título y descripción)
            if (debouncedSearchText) {
                const searchLower = debouncedSearchText.toLowerCase();
                const titleMatch = incident.title.toLowerCase().includes(searchLower);
                const descriptionMatch = incident.description.toLowerCase().includes(searchLower);
                const areaMatch = incident.affectedArea.toLowerCase().includes(searchLower);
                
                if (!titleMatch && !descriptionMatch && !areaMatch) return false;
            }
            
            return true;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [incidents, startDate, endDate, statusFilter, severityFilter, areaFilter, debouncedSearchText]);

    // Handler: Add Incident
    const handleAddIncident = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!incidentTitle.trim() || !incidentDescription.trim() || !incidentArea.trim() || !registeredBy) {
            warning('Campos requeridos', 'Por favor, complete todos los campos de la incidencia incluyendo quién la registra.');
            return;
        }

        const incidentData: IncidentFormData = {
            title: incidentTitle.trim(),
            description: incidentDescription.trim(),
            detectionDate: incidentDate,
            affectedArea: incidentArea.trim(),
            severity: incidentSeverity,
            status: 'Abierta',
            reportedBy: currentUser.id,
            registeredBy,
            registeredById,
            registeredAt: new Date().toISOString()
        };

        try {
            onAddIncident(incidentData);
            // Reset form
            setIncidentTitle('');
            setIncidentDescription('');
            setIncidentArea('');
            setIncidentSeverity('Media');
            setRegisteredBy('');
            setRegisteredById('');
            success('Incidencia registrada', 'La incidencia se ha registrado correctamente.');
        } catch (error) {
            console.error('Error al guardar incidencia:', error);
            warning('Error', 'No se pudo guardar la incidencia.');
        }
    };

    const handleDeleteIncident = (id: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar esta incidencia? Esta acción no se puede deshacer.')) {
            onDeleteIncident(id);
        }
    };

    // Handler: Add Corrective Action
    const handleAddCorrectiveAction = (e: React.FormEvent, incidentId: string) => {
        e.preventDefault();
        
        if (!actionDescription.trim()) {
            warning('Campo requerido', 'Por favor, describa la acción correctiva.');
            return;
        }

        const actionData: CorrectiveActionFormData = {
            incidentId,
            description: actionDescription.trim(),
            implementationDate: actionDate,
            responsibleUser: actionResponsible,
            status: actionStatus
        };

        try {
            onAddCorrectiveAction(actionData);
            // Reset form
            setActionDescription('');
            setActionDate(new Date().toISOString().slice(0, 10));
            setActionStatus('Pendiente');
            setShowCorrectiveActionForm(null);
            
            // Si todas las acciones están completadas, cambiar estado de incidencia
            const incident = incidents.find(i => i.id === incidentId);
            if (incident) {
                const allActionsCompleted = incident.correctiveActions.every(action => action.status === 'Completada');
                if (allActionsCompleted && actionStatus === 'Completada') {
                    onUpdateIncident(incidentId, { status: 'Resuelta' });
                } else if (incident.status === 'Abierta') {
                    onUpdateIncident(incidentId, { status: 'En Proceso' });
                }
            }
            
            success('Acción registrada', 'La acción correctiva se ha registrado correctamente.');
        } catch (error) {
            console.error('Error al guardar acción correctiva:', error);
            warning('Error', 'No se pudo guardar la acción correctiva.');
        }
    };

    const handleUpdateCorrectiveActionStatus = (actionId: string, newStatus: CorrectiveActionStatus, incidentId: string) => {
        onUpdateCorrectiveAction(actionId, { status: newStatus });
        
        // Verificar si todas las acciones están completadas para cambiar estado de incidencia
        const incident = incidents.find(i => i.id === incidentId);
        if (incident) {
            const updatedActions = incident.correctiveActions.map(action => 
                action.id === actionId ? { ...action, status: newStatus } : action
            );
            const allActionsCompleted = updatedActions.every(action => action.status === 'Completada');
            
            if (allActionsCompleted) {
                onUpdateIncident(incidentId, { status: 'Resuelta' });
                success('Incidencia resuelta', 'Todas las acciones correctivas han sido completadas.');
            } else if (incident.status === 'Resuelta' && newStatus !== 'Completada') {
                onUpdateIncident(incidentId, { status: 'En Proceso' });
            }
        }
    };

    const handleDeleteCorrectiveAction = (actionId: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar esta acción correctiva?')) {
            onDeleteCorrectiveAction(actionId);
        }
    };

    // Funciones para resolución de incidencias
    const handleResolveIncident = (incidentId: string) => {
        setIncidentToResolve(incidentId);
        setShowResolveDialog(true);
    };

    const confirmResolveIncident = () => {
        if (incidentToResolve) {
            onUpdateIncident(incidentToResolve, {
                status: 'Resuelta',
                resolutionNotes: resolutionNotes.trim(),
                resolvedAt: new Date().toISOString(),
                resolvedBy: currentUser.name
            });
            success('Incidencia resuelta', 'La incidencia se ha marcado como resuelta.');
        }
        setShowResolveDialog(false);
        setIncidentToResolve(null);
        setResolutionNotes('');
    };

    const cancelResolveIncident = () => {
        setShowResolveDialog(false);
        setIncidentToResolve(null);
        setResolutionNotes('');
    };

    // Función para limpiar todos los filtros
    const clearAllFilters = () => {
        setStartDate('');
        setEndDate('');
        setStatusFilter('');
        setSeverityFilter('');
        setAreaFilter('');
        setSearchText('');
        setDebouncedSearchText('');
    };

    // Estadísticas de filtros
    const filterStats = useMemo(() => {
        const total = incidents.length;
        const filtered = filteredIncidents.length;
        const open = filteredIncidents.filter(i => i.status === 'Abierta').length;
        const inProgress = filteredIncidents.filter(i => i.status === 'En Proceso').length;
        const resolved = filteredIncidents.filter(i => i.status === 'Resuelta').length;
        const critical = filteredIncidents.filter(i => i.severity === 'Crítica').length;
        
        return { total, filtered, open, inProgress, resolved, critical };
    }, [incidents, filteredIncidents]);

    const getSeverityClass = (severity: IncidentSeverity): string => {
        switch (severity) {
            case 'Crítica': return 'severity-critical';
            case 'Alta': return 'severity-high';
            case 'Media': return 'severity-medium';
            case 'Baja': return 'severity-low';
            default: return '';
        }
    };

    const getStatusClass = (status: IncidentStatus): string => {
        switch (status) {
            case 'Abierta': return 'status-open';
            case 'En Proceso': return 'status-in-progress';
            case 'Resuelta': return 'status-resolved';
            default: return '';
        }
    };

    const getActionStatusClass = (status: CorrectiveActionStatus): string => {
        switch (status) {
            case 'Pendiente': return 'action-pending';
            case 'En Progreso': return 'action-in-progress';
            case 'Completada': return 'action-completed';
            default: return '';
        }
    };

    const handleExportPDF = () => {
        const headers = ["Fecha", "Título", "Área", "Gravedad", "Estado", "Registrado por"];
        const data = filteredIncidents.map(incident => [
            new Date(incident.detectionDate).toLocaleDateString('es-ES'),
            incident.title,
            incident.affectedArea,
            incident.severity,
            incident.status,
            incident.registeredBy || usersMap.get(incident.reportedBy) || 'N/A'
        ]);
        exportToPDF("Registro de Incidencias", headers, data, "registro_incidencias", establishmentInfo);
    };

    const handleExportExcel = () => {
        const data = filteredIncidents.map(incident => ({
            "Fecha de Detección": new Date(incident.detectionDate).toLocaleDateString('es-ES'),
            "Título": incident.title,
            "Descripción": incident.description,
            "Área Afectada": incident.affectedArea,
            "Gravedad": incident.severity,
            "Estado": incident.status,
            "Registrado por": incident.registeredBy || usersMap.get(incident.reportedBy) || 'N/A',
            "Acciones Correctivas": incident.correctiveActions.length,
            "Fecha de Creación": new Date(incident.createdAt).toLocaleDateString('es-ES')
        }));
        exportToExcel(data, "registro_incidencias");
    };

    return (
        <>
            <h1>Gestión de Incidencias</h1>
            
            {/* Formulario de nueva incidencia */}
            <div className="card">
                <h2 
                    className="collapsible-header" 
                    onClick={() => setIsIncidentFormOpen(!isIncidentFormOpen)}
                    role="button"
                    aria-expanded={isIncidentFormOpen}
                >
                    Registrar Nueva Incidencia
                    <span className={`chevron ${isIncidentFormOpen ? 'open' : ''}`}>&#9660;</span>
                </h2>
                <div className={`collapsible-content ${isIncidentFormOpen ? 'open' : ''}`}>
                    <div className="collapsible-content-inner">
                        <form onSubmit={handleAddIncident}>
                            <div className="form-group">
                                <label htmlFor="incident-title">Título de la Incidencia</label>
                                <input 
                                    type="text" 
                                    id="incident-title" 
                                    value={incidentTitle} 
                                    onChange={e => setIncidentTitle(e.target.value)} 
                                    placeholder="Ej: Temperatura fuera de rango en cámara frigorífica"
                                    maxLength={100}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="incident-description">Descripción Detallada</label>
                                <textarea 
                                    id="incident-description" 
                                    value={incidentDescription} 
                                    onChange={e => setIncidentDescription(e.target.value)} 
                                    placeholder="Describa detalladamente la incidencia detectada..."
                                    rows={4}
                                    maxLength={1000}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="incident-date">Fecha de Detección</label>
                                <input 
                                    type="date" 
                                    id="incident-date" 
                                    value={incidentDate} 
                                    onChange={e => setIncidentDate(e.target.value)} 
                                    max={new Date().toISOString().slice(0, 10)}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="incident-area">Área Afectada</label>
                                <input 
                                    type="text" 
                                    id="incident-area" 
                                    value={incidentArea} 
                                    onChange={e => setIncidentArea(e.target.value)} 
                                    placeholder="Ej: Cocina, Almacén, Cámara frigorífica"
                                    maxLength={50}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="incident-severity">Nivel de Gravedad</label>
                                <select 
                                    id="incident-severity" 
                                    value={incidentSeverity} 
                                    onChange={e => setIncidentSeverity(e.target.value as IncidentSeverity)}
                                    required
                                >
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Crítica">Crítica</option>
                                </select>
                            </div>
                            
                            <UserSelector
                                users={companyUsers}
                                selectedUserId={registeredById}
                                selectedUserName={registeredBy}
                                onUserSelect={(userId, userName) => {
                                    setRegisteredById(userId);
                                    setRegisteredBy(userName);
                                }}
                                required={true}
                                label="Registrado por"
                            />
                            
                            <button type="submit" className="btn-submit">
                                Registrar Incidencia
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Filtros y búsqueda */}
            <div className="card">
                <h2>Filtros y Búsqueda</h2>
                
                {/* Estadísticas de filtros */}
                <div className="filter-stats">
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{filterStats.filtered}</span>
                            <span className="stat-label">Mostradas</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{filterStats.total}</span>
                            <span className="stat-label">Total</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value critical">{filterStats.critical}</span>
                            <span className="stat-label">Críticas</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value open">{filterStats.open}</span>
                            <span className="stat-label">Abiertas</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value in-progress">{filterStats.inProgress}</span>
                            <span className="stat-label">En Proceso</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value resolved">{filterStats.resolved}</span>
                            <span className="stat-label">Resueltas</span>
                        </div>
                    </div>
                </div>

                <div className="export-controls-container">
                    {/* Búsqueda por texto */}
                    <div className="search-section">
                        <div className="form-group search-group">
                            <label htmlFor="search-text">Búsqueda</label>
                            <div className="search-input-container">
                                <input 
                                    type="text" 
                                    id="search-text" 
                                    value={searchText} 
                                    onChange={e => setSearchText(e.target.value)} 
                                    placeholder="Buscar en título, descripción o área..."
                                    className="search-input"
                                />
                                {searchText && (
                                    <button 
                                        type="button" 
                                        className="clear-search-btn"
                                        onClick={() => setSearchText('')}
                                        title="Limpiar búsqueda"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Filtros por categorías */}
                    <div className="export-controls-row">
                        <div className="form-group">
                            <label htmlFor="status-filter">Estado</label>
                            <select 
                                id="status-filter" 
                                value={statusFilter} 
                                onChange={e => setStatusFilter(e.target.value as IncidentStatus | '')}
                            >
                                <option value="">Todos los estados</option>
                                <option value="Abierta">Abierta</option>
                                <option value="En Proceso">En Proceso</option>
                                <option value="Resuelta">Resuelta</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="severity-filter">Gravedad</label>
                            <select 
                                id="severity-filter" 
                                value={severityFilter} 
                                onChange={e => setSeverityFilter(e.target.value as IncidentSeverity | '')}
                            >
                                <option value="">Todas las gravedades</option>
                                <option value="Baja">Baja</option>
                                <option value="Media">Media</option>
                                <option value="Alta">Alta</option>
                                <option value="Crítica">Crítica</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="area-filter">Área</label>
                            <input 
                                type="text" 
                                id="area-filter" 
                                value={areaFilter} 
                                onChange={e => setAreaFilter(e.target.value)} 
                                placeholder="Filtrar por área..."
                            />
                        </div>
                    </div>

                    {/* Filtros por fechas */}
                    <div className="export-controls-row">
                        <div className="form-group">
                            <label htmlFor="start-date">Fecha de Inicio</label>
                            <input 
                                type="date" 
                                id="start-date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="end-date">Fecha de Fin</label>
                            <input 
                                type="date" 
                                id="end-date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>
                        <div className="filter-actions">
                            <button 
                                type="button"
                                className="btn-secondary"
                                onClick={clearAllFilters}
                                title="Limpiar todos los filtros"
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    {/* Botones de exportación */}
                    <div className="export-section">
                        <h3>Exportar Resultados</h3>
                        <div className="export-buttons">
                            <button 
                                className="btn-export btn-pdf" 
                                onClick={handleExportPDF} 
                                disabled={filteredIncidents.length === 0}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                                PDF ({filteredIncidents.length})
                            </button>
                            <button 
                                className="btn-export btn-excel" 
                                onClick={handleExportExcel} 
                                disabled={filteredIncidents.length === 0}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                                Excel ({filteredIncidents.length})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de incidencias */}
            <div className="card">
                <h2>Registro de Incidencias ({filteredIncidents.length})</h2>
                {filteredIncidents.length > 0 ? (
                    <div style={{overflowX: 'auto'}}>
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Título</th>
                                    <th>Área</th>
                                    <th>Gravedad</th>
                                    <th>Estado</th>
                                    <th>Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIncidents.map(incident => {
                                    const isExpanded = expandedIncidentId === incident.id;
                                    const reportedByName = incident.registeredBy || usersMap.get(incident.reportedBy) || 'N/A';
                                    const formattedDate = new Date(incident.detectionDate).toLocaleDateString('es-ES');
                                    
                                    return (
                                        <React.Fragment key={incident.id}>
                                            <tr 
                                                className="summary-row" 
                                                onClick={() => setExpandedIncidentId(isExpanded ? null : incident.id)}
                                                aria-expanded={isExpanded}
                                            >
                                                <td data-label="Fecha">{formattedDate}</td>
                                                <td data-label="Título">{incident.title}</td>
                                                <td data-label="Área">{incident.affectedArea}</td>
                                                <td data-label="Gravedad">
                                                    <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                                                        {incident.severity}
                                                    </span>
                                                </td>
                                                <td data-label="Estado">
                                                    <span className={`status-badge ${getStatusClass(incident.status)}`}>
                                                        {incident.status}
                                                    </span>
                                                </td>
                                                <td data-label="Detalles" className="expand-cell">
                                                    <span className="expand-indicator">{isExpanded ? 'Ocultar' : 'Ver'}</span>
                                                    <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="detail-row">
                                                    <td colSpan={6}>
                                                        <div className="incident-details">
                                                            <div className="record-details">
                                                                <div><strong>Descripción</strong><span>{incident.description}</span></div>
                                                                <div><strong>Registrado por</strong><span>{reportedByName}</span></div>
                                                                <div><strong>Fecha de registro</strong><span>{new Date(incident.createdAt).toLocaleDateString('es-ES')}</span></div>
                                                                <div><strong>Acciones correctivas</strong><span>{incident.correctiveActions.length} registradas</span></div>
                                                                {incident.status === 'Resuelta' && incident.resolvedAt && (
                                                                    <>
                                                                        <div><strong>Resuelta el</strong><span>{new Date(incident.resolvedAt).toLocaleDateString('es-ES')}</span></div>
                                                                        {incident.resolvedBy && <div><strong>Resuelta por</strong><span>{incident.resolvedBy}</span></div>}
                                                                        {incident.resolutionNotes && (
                                                                            <div><strong>Notas de resolución</strong><span>{incident.resolutionNotes}</span></div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Acciones Correctivas */}
                                                            <div className="corrective-actions-section">
                                                                <div className="section-header">
                                                                    <h4>Acciones Correctivas</h4>
                                                                    <div className="action-buttons">
                                                                        <button 
                                                                            className="btn-secondary btn-small" 
                                                                            onClick={() => setShowCorrectiveActionForm(
                                                                                showCorrectiveActionForm === incident.id ? null : incident.id
                                                                            )}
                                                                        >
                                                                            {showCorrectiveActionForm === incident.id ? 'Cancelar' : 'Añadir Acción'}
                                                                        </button>
                                                                        {incident.status !== 'Resuelta' && (
                                                                            <button 
                                                                                className="btn-success btn-small" 
                                                                                onClick={() => handleResolveIncident(incident.id)}
                                                                            >
                                                                                Marcar como Resuelta
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Formulario de nueva acción correctiva */}
                                                                {showCorrectiveActionForm === incident.id && (
                                                                    <div className="corrective-action-form">
                                                                        <form onSubmit={(e) => handleAddCorrectiveAction(e, incident.id)}>
                                                                            <div className="form-row">
                                                                                <div className="form-group">
                                                                                    <label htmlFor={`action-desc-${incident.id}`}>Descripción de la acción</label>
                                                                                    <textarea 
                                                                                        id={`action-desc-${incident.id}`}
                                                                                        value={actionDescription} 
                                                                                        onChange={e => setActionDescription(e.target.value)} 
                                                                                        placeholder="Describa la acción correctiva implementada..."
                                                                                        rows={3}
                                                                                        required 
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="form-row">
                                                                                <div className="form-group">
                                                                                    <label htmlFor={`action-date-${incident.id}`}>Fecha de implementación</label>
                                                                                    <input 
                                                                                        type="date" 
                                                                                        id={`action-date-${incident.id}`}
                                                                                        value={actionDate} 
                                                                                        onChange={e => setActionDate(e.target.value)} 
                                                                                        required 
                                                                                    />
                                                                                </div>
                                                                                <div className="form-group">
                                                                                    <label htmlFor={`action-responsible-${incident.id}`}>Responsable</label>
                                                                                    <select 
                                                                                        id={`action-responsible-${incident.id}`}
                                                                                        value={actionResponsible} 
                                                                                        onChange={e => setActionResponsible(e.target.value)}
                                                                                        required
                                                                                    >
                                                                                        {users.map(user => (
                                                                                            <option key={user.id} value={user.id}>{user.name}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>
                                                                                <div className="form-group">
                                                                                    <label htmlFor={`action-status-${incident.id}`}>Estado</label>
                                                                                    <select 
                                                                                        id={`action-status-${incident.id}`}
                                                                                        value={actionStatus} 
                                                                                        onChange={e => setActionStatus(e.target.value as CorrectiveActionStatus)}
                                                                                        required
                                                                                    >
                                                                                        <option value="Pendiente">Pendiente</option>
                                                                                        <option value="En Progreso">En Progreso</option>
                                                                                        <option value="Completada">Completada</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>
                                                                            <div className="form-actions">
                                                                                <button type="submit" className="btn-submit btn-small">
                                                                                    Guardar Acción
                                                                                </button>
                                                                            </div>
                                                                        </form>
                                                                    </div>
                                                                )}

                                                                {/* Lista de acciones correctivas */}
                                                                <div className="corrective-actions-list">
                                                                    {incident.correctiveActions.length > 0 ? (
                                                                        incident.correctiveActions.map(action => (
                                                                            <div key={action.id} className="corrective-action-item">
                                                                                <div className="action-header">
                                                                                    <span className={`action-status-badge ${getActionStatusClass(action.status)}`}>
                                                                                        {action.status}
                                                                                    </span>
                                                                                    <span className="action-date">
                                                                                        {new Date(action.implementationDate).toLocaleDateString('es-ES')}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="action-description">
                                                                                    {action.description}
                                                                                </div>
                                                                                <div className="action-footer">
                                                                                    <span className="action-responsible">
                                                                                        Responsable: {usersMap.get(action.responsibleUser) || 'N/A'}
                                                                                    </span>
                                                                                    <div className="action-controls">
                                                                                        {action.status !== 'Completada' && (
                                                                                            <select 
                                                                                                value={action.status}
                                                                                                onChange={e => handleUpdateCorrectiveActionStatus(
                                                                                                    action.id, 
                                                                                                    e.target.value as CorrectiveActionStatus,
                                                                                                    incident.id
                                                                                                )}
                                                                                                className="status-select"
                                                                                            >
                                                                                                <option value="Pendiente">Pendiente</option>
                                                                                                <option value="En Progreso">En Progreso</option>
                                                                                                <option value="Completada">Completada</option>
                                                                                            </select>
                                                                                        )}
                                                                                        <button 
                                                                                            className="btn-delete btn-small"
                                                                                            onClick={() => handleDeleteCorrectiveAction(action.id)}
                                                                                        >
                                                                                            Eliminar
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <p className="no-actions">No hay acciones correctivas registradas.</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="detail-actions">
                                                                <strong>Acciones de Incidencia</strong>
                                                                <div>
                                                                    <button className="btn-delete" onClick={() => handleDeleteIncident(incident.id)}>
                                                                        Eliminar Incidencia
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
                ) : (
                    <p>No hay incidencias registradas para los filtros seleccionados.</p>
                )}
            </div>
            
            {/* Diálogo de resolución de incidencia */}
            {showResolveDialog && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Resolver Incidencia</h3>
                            <button className="modal-close" onClick={cancelResolveIncident}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="resolution-form">
                                <label htmlFor="resolution-notes">Notas de resolución (opcional):</label>
                                <textarea
                                    id="resolution-notes"
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Describe cómo se resolvió la incidencia, qué medidas se tomaron, etc."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={cancelResolveIncident}>
                                Cancelar
                            </button>
                            <button className="btn-success" onClick={confirmResolveIncident}>
                                Marcar como Resuelta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default IncidentsPage;