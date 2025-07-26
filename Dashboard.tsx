
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import UsersPage from './UsersPage';
import StoragePage from './StoragePage';
import ReceptionPage from './ReceptionPage';
import CleaningPage from './CleaningPage';
import EscandallosPage from './EscandallosPage';
import TraceabilityPage from './TraceabilityPage';
import Hamburger from './Hamburger';
import TechnicalSheetsPage from './TechnicalSheetsPage';
import HelpButton from './HelpButton';
import HelpModal from './HelpModal';
import SettingsPage from './SettingsPage'; // Import SettingsPage
import IncidentsPage from './IncidentsPage'; // Import IncidentsPage
import { User, Supplier, ProductType, DeliveryRecord, StorageUnit, StorageRecord, DailySurface, DailyCleaningRecord, FrequentArea, Costing, OutgoingRecord, ElaboratedRecord, TechnicalSheet, EstablishmentInfo, Incident, CorrectiveAction, IncidentFormData, CorrectiveActionFormData } from './App';

// --- PROPS INTERFACE ---
interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
  users: User[];
  onAddUser: (details: Omit<User, 'id'>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (id: string, details: { name: string; email: string; }) => void;
  onRefreshUsers: () => void;
  suppliers: Supplier[];
  onAddSupplier: (name: string) => void;
  onDeleteSupplier: (id: string) => void;
  productTypes: ProductType[];
  onAddProductType: (name: string, temp: number) => void;
  onDeleteProductType: (id: string) => void;
  deliveryRecords: DeliveryRecord[];
  onAddDeliveryRecord: (record: Omit<DeliveryRecord, 'id' | 'userId'>) => void;
  onDeleteDeliveryRecord: (id: string) => void;
  storageUnits: StorageUnit[];
  onAddStorageUnit: (unit: Omit<StorageUnit, 'id'>) => void;
  onDeleteStorageUnit: (id: string) => void;
  storageRecords: StorageRecord[];
  onAddStorageRecord: (record: Omit<StorageRecord, 'id' | 'userId'>) => void;
  onDeleteStorageRecord: (id: string) => void;
  dailySurfaces: DailySurface[];
  onAddDailySurface: (name: string) => void;
  onDeleteDailySurface: (id: string) => void;
  dailyCleaningRecords: DailyCleaningRecord[];
  onAddDailyCleaningRecord: (record: Omit<DailyCleaningRecord, 'id'>) => void;
  onDeleteDailyCleaningRecord: (id: string) => void;
  frequentAreas: FrequentArea[];
  onAddFrequentArea: (area: Omit<FrequentArea, 'id'>) => void;
  onDeleteFrequentArea: (id: string) => void;
  onCleanFrequentArea: (id: string) => void;
  costings: Costing[];
  onSetCostings: (costings: Costing[] | ((prevState: Costing[]) => Costing[])) => void;
  outgoingRecords: OutgoingRecord[];
  onAddOutgoingRecord: (record: Omit<OutgoingRecord, 'id'>) => void;
  onDeleteOutgoingRecord: (id: string) => void;
  elaboratedRecords: ElaboratedRecord[];
  onAddElaboratedRecord: (record: Omit<ElaboratedRecord, 'id'>) => void;
  onDeleteElaboratedRecord: (id: string) => void;
  technicalSheets: TechnicalSheet[];
  onAddTechnicalSheet: (sheet: Omit<TechnicalSheet, 'id'>) => void;
  onDeleteTechnicalSheet: (id: string) => void;
  incidents: Incident[];
  onAddIncident: (incident: IncidentFormData) => void;
  onUpdateIncident: (id: string, updates: Partial<Incident>) => void;
  onDeleteIncident: (id: string) => void;
  onAddCorrectiveAction: (action: CorrectiveActionFormData) => void;
  onUpdateCorrectiveAction: (id: string, updates: Partial<CorrectiveAction>) => void;
  onDeleteCorrectiveAction: (id: string) => void;
  establishmentInfo: EstablishmentInfo;
  onUpdateEstablishmentInfo: (info: EstablishmentInfo) => void;
}

const calculateNextDueDate = (lastCleaned: string | null, frequencyDays: number): Date | null => {
    if (!lastCleaned) return new Date();
    const lastCleanedDate = new Date(lastCleaned);
    const nextDueDate = new Date(lastCleanedDate);
    nextDueDate.setDate(lastCleanedDate.getDate() + frequencyDays);
    return nextDueDate;
};

const Dashboard: React.FC<DashboardProps> = (props) => {
  const [activePage, setActivePage] = useState('Panel Principal');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isHelpModalOpen, setHelpModalOpen] = useState(false);

  const handleNav = (page: string) => {
    setActivePage(page);
    setSidebarOpen(false); // Close sidebar on navigation
  };

  // El primer usuario registrado es el administrador.
  const isCurrentUserAdmin = props.currentUser.isAdmin === true;

  // --- DYNAMIC WIDGET CALCULATIONS ---
  const today = new Date();
  today.setHours(0,0,0,0);

  const pendingCleanings = props.frequentAreas.filter(area => {
      const nextDueDate = calculateNextDueDate(area.lastCleaned, area.frequencyDays);
      if (!nextDueDate) return true; // Never cleaned, so it's pending
      nextDueDate.setHours(0,0,0,0);
      return nextDueDate.getTime() <= today.getTime();
  }).length;

  const tempAlerts = props.storageUnits.reduce((count, unit) => {
      if (unit.minTemp === undefined || unit.maxTemp === undefined) {
          return count;
      }
      const latestRecord = props.storageRecords
          .filter(r => r.unitId === unit.id)
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
          [0];
      if (!latestRecord) {
          return count;
      }
      const temp = parseFloat(latestRecord.temperature);
      if (temp < unit.minTemp || temp > unit.maxTemp) {
          return count + 1;
      }
      return count;
  }, 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const receptionsToday = props.deliveryRecords.filter(r => r.receptionDate === todayStr).length;

  // Cálculos para widgets de incidencias
  const openIncidents = props.incidents.filter(i => i.status === 'Abierta').length;
  const criticalIncidents = props.incidents.filter(i => i.severity === 'Crítica' && i.status !== 'Resuelta').length;
  const overdueIncidents = props.incidents.filter(incident => {
    if (incident.status === 'Resuelta') return false;
    const createdDate = new Date(incident.createdAt);
    const daysSinceCreated = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCreated > 7; // Más de 7 días sin resolver
  }).length;
  
  const incidentsThisWeek = props.incidents.filter(incident => {
    const createdDate = new Date(incident.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate >= weekAgo;
  }).length;

  const resolvedThisMonth = props.incidents.filter(incident => {
    if (incident.status !== 'Resuelta') return false;
    const updatedDate = new Date(incident.updatedAt);
    const thisMonth = new Date();
    return updatedDate.getMonth() === thisMonth.getMonth() && updatedDate.getFullYear() === thisMonth.getFullYear();
  }).length;


  const renderContent = () => {
    switch (activePage) {
      case 'Panel Principal':
        return (
          <>
            <h1>Panel Principal</h1>
            
            {/* Widgets principales */}
            <div className="widgets-grid">
              <div className="widget-card">
                <h3>Controles Pendientes Hoy</h3>
                <p className={`widget-value ${pendingCleanings > 0 ? 'warning' : 'success'}`}>{pendingCleanings}</p>
                <p className="widget-footer">Limpiezas frecuentes que vencen o están vencidas.</p>
              </div>
              <div className="widget-card">
                <h3>Alertas de Temperatura</h3>
                <p className={`widget-value ${tempAlerts > 0 ? 'danger' : 'success'}`}>{tempAlerts}</p>
                <p className="widget-footer">Cámaras con temperaturas fuera del rango óptimo.</p>
              </div>
              <div className="widget-card">
                <h3>Recepciones de Hoy</h3>
                <p className="widget-value">{receptionsToday}</p>
                <p className="widget-footer">Entregas de proveedores registradas hoy.</p>
              </div>
            </div>

            {/* Widgets de incidencias */}
            <div className="dashboard-section">
              <h2>Estado de Incidencias</h2>
              <div className="widgets-grid">
                <div className="widget-card incident-widget">
                  <h3>Incidencias Abiertas</h3>
                  <p className={`widget-value ${openIncidents > 0 ? 'warning' : 'success'}`}>{openIncidents}</p>
                  <p className="widget-footer">Incidencias que requieren atención.</p>
                  {openIncidents > 0 && (
                    <div className="widget-action">
                      <button 
                        className="btn-link" 
                        onClick={() => handleNav('Incidencias')}
                      >
                        Ver incidencias →
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="widget-card incident-widget critical">
                  <h3>Incidencias Críticas</h3>
                  <p className={`widget-value ${criticalIncidents > 0 ? 'danger' : 'success'}`}>{criticalIncidents}</p>
                  <p className="widget-footer">Incidencias críticas sin resolver.</p>
                  {criticalIncidents > 0 && (
                    <div className="widget-action">
                      <button 
                        className="btn-link critical" 
                        onClick={() => handleNav('Incidencias')}
                      >
                        ¡Atención inmediata! →
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="widget-card incident-widget">
                  <h3>Incidencias Vencidas</h3>
                  <p className={`widget-value ${overdueIncidents > 0 ? 'danger' : 'success'}`}>{overdueIncidents}</p>
                  <p className="widget-footer">Más de 7 días sin resolver.</p>
                  {overdueIncidents > 0 && (
                    <div className="widget-action">
                      <button 
                        className="btn-link" 
                        onClick={() => handleNav('Incidencias')}
                      >
                        Revisar vencidas →
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="widget-card incident-widget success">
                  <h3>Resueltas Este Mes</h3>
                  <p className="widget-value success">{resolvedThisMonth}</p>
                  <p className="widget-footer">Incidencias resueltas en el mes actual.</p>
                </div>
              </div>
            </div>

            {/* Resumen semanal */}
            <div className="dashboard-section">
              <h2>Resumen Semanal</h2>
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="summary-icon">📊</div>
                  <div className="summary-content">
                    <h4>Nuevas Incidencias</h4>
                    <p className="summary-value">{incidentsThisWeek}</p>
                    <p className="summary-text">registradas esta semana</p>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">✅</div>
                  <div className="summary-content">
                    <h4>Tasa de Resolución</h4>
                    <p className="summary-value">
                      {props.incidents.length > 0 
                        ? Math.round((resolvedThisMonth / props.incidents.length) * 100)
                        : 0}%
                    </p>
                    <p className="summary-text">incidencias resueltas</p>
                  </div>
                </div>
                
                <div className="summary-card">
                  <div className="summary-icon">⚠️</div>
                  <div className="summary-content">
                    <h4>Atención Requerida</h4>
                    <p className="summary-value">{criticalIncidents + overdueIncidents}</p>
                    <p className="summary-text">incidencias urgentes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones rápidas */}
            {(criticalIncidents > 0 || overdueIncidents > 0) && (
              <div className="dashboard-section">
                <h2>Acciones Recomendadas</h2>
                <div className="action-cards">
                  {criticalIncidents > 0 && (
                    <div className="action-card critical">
                      <div className="action-icon">🚨</div>
                      <div className="action-content">
                        <h4>Incidencias Críticas Pendientes</h4>
                        <p>Hay {criticalIncidents} incidencia{criticalIncidents > 1 ? 's' : ''} crítica{criticalIncidents > 1 ? 's' : ''} que requiere{criticalIncidents > 1 ? 'n' : ''} atención inmediata.</p>
                        <button 
                          className="btn-action critical" 
                          onClick={() => handleNav('Incidencias')}
                        >
                          Revisar Ahora
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {overdueIncidents > 0 && (
                    <div className="action-card warning">
                      <div className="action-icon">⏰</div>
                      <div className="action-content">
                        <h4>Incidencias Vencidas</h4>
                        <p>Hay {overdueIncidents} incidencia{overdueIncidents > 1 ? 's' : ''} que lleva{overdueIncidents > 1 ? 'n' : ''} más de 7 días sin resolver.</p>
                        <button 
                          className="btn-action warning" 
                          onClick={() => handleNav('Incidencias')}
                        >
                          Revisar Estado
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        );
      case 'Recepción y Transporte':
        return <ReceptionPage 
            users={props.users}
            suppliers={props.suppliers}
            productTypes={props.productTypes}
            records={props.deliveryRecords}
            onAddSupplier={props.onAddSupplier}
            onDeleteSupplier={props.onDeleteSupplier}
            onAddProductType={props.onAddProductType}
            onDeleteProductType={props.onDeleteProductType}
            onAddRecord={props.onAddDeliveryRecord}
            onDeleteRecord={props.onDeleteDeliveryRecord}
            establishmentInfo={props.establishmentInfo}
            currentUser={props.currentUser}
        />;
      case 'Almacenamiento':
        return <StoragePage 
            users={props.users}
            units={props.storageUnits}
            records={props.storageRecords}
            onAddUnit={props.onAddStorageUnit}
            onDeleteUnit={props.onDeleteStorageUnit}
            onAddRecord={props.onAddStorageRecord}
            onDeleteRecord={props.onDeleteStorageRecord}
            establishmentInfo={props.establishmentInfo}
            currentUser={props.currentUser}
        />;
      case 'Fichas Técnicas':
        return <TechnicalSheetsPage 
            sheets={props.technicalSheets}
            onAddSheet={props.onAddTechnicalSheet}
            onDeleteSheet={props.onDeleteTechnicalSheet}
            currentUser={props.currentUser}
        />;
      case 'Limpieza e Higiene':
        return <CleaningPage 
            users={props.users}
            surfaces={props.dailySurfaces}
            dailyRecords={props.dailyCleaningRecords}
            areas={props.frequentAreas}
            onAddSurface={props.onAddDailySurface}
            onDeleteSurface={props.onDeleteDailySurface}
            onCleanSurface={props.onAddDailyCleaningRecord}
            onDeleteRecord={props.onDeleteDailyCleaningRecord}
            onAddArea={props.onAddFrequentArea}
            onDeleteArea={props.onDeleteFrequentArea}
            onCleanArea={props.onCleanFrequentArea}
            establishmentInfo={props.establishmentInfo}
        />;
      case 'Trazabilidad':
        return <TraceabilityPage
            users={props.users}
            outgoingRecords={props.outgoingRecords}
            elaboratedRecords={props.elaboratedRecords}
            onAddOutgoingRecord={props.onAddOutgoingRecord}
            onDeleteOutgoing={props.onDeleteOutgoingRecord}
            onAddElaboratedRecord={props.onAddElaboratedRecord}
            onDeleteElaborated={props.onDeleteElaboratedRecord}
            establishmentInfo={props.establishmentInfo}
         />;
      case 'Escandallos':
        return <EscandallosPage 
            costings={props.costings}
            onSetCostings={props.onSetCostings}
        />;
      case 'Incidencias':
        return <IncidentsPage 
          users={props.users}
          incidents={props.incidents}
          onAddIncident={props.onAddIncident}
          onUpdateIncident={props.onUpdateIncident}
          onDeleteIncident={props.onDeleteIncident}
          onAddCorrectiveAction={props.onAddCorrectiveAction}
          onUpdateCorrectiveAction={props.onUpdateCorrectiveAction}
          onDeleteCorrectiveAction={props.onDeleteCorrectiveAction}
          establishmentInfo={props.establishmentInfo}
          currentUser={props.currentUser}
        />;
      case 'Usuarios':
        return isCurrentUserAdmin ? <UsersPage users={props.users} onAddUser={props.onAddUser} onDeleteUser={props.onDeleteUser} onUpdateUser={props.onUpdateUser} currentUser={props.currentUser} onRefreshUsers={props.onRefreshUsers} /> : <h1>Acceso Denegado</h1>;
      case 'Configuración':
        return <SettingsPage info={props.establishmentInfo} onUpdateInfo={props.onUpdateEstablishmentInfo} currentUser={props.currentUser} />;
      default:
        // Placeholder for other pages, showing the title
        return <h1>{activePage}</h1>;
    }
  };

  return (
    <div className={`dashboard-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar isCurrentUserAdmin={isCurrentUserAdmin} activePage={activePage} onNavChange={handleNav} isOpen={isSidebarOpen} />
      <main className="main-content">
        <div className="main-content-overlay" onClick={() => setSidebarOpen(false)}></div>
        <header className="header">
          <Hamburger onClick={() => setSidebarOpen(!isSidebarOpen)} />
          <div className="user-info">
            <span>Usuario: <strong>{props.currentUser.name}</strong></span>
            <button className="btn-logout" onClick={props.onLogout}>
              Cerrar Sesión
            </button>
          </div>
        </header>
        <div className="page-content">
          {renderContent()}
        </div>
        <HelpButton onClick={() => setHelpModalOpen(true)} />
      </main>
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setHelpModalOpen(false)} 
        page={activePage} 
      />
    </div>
  );
};

export default Dashboard;