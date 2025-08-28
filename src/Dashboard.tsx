import React, { useState } from 'react';
import Sidebar from './Sidebar';
import UsersPage from './UsersPage';
import StoragePage from './StoragePage';
import ReceptionPage from './ReceptionPage';
import CleaningPage from './CleaningPage';
import EscandallosPage from './EscandallosPage';
import { TraceabilityPage } from './TraceabilityPage';
import Hamburger from './Hamburger';
import TechnicalSheetsPage from './TechnicalSheetsPage';
import HelpButton from './HelpButton';
import HelpModal from './HelpModal';
import SettingsPage from './SettingsPage';
import { OrganizationSettingsPage, UserManagementPage, OrganizationDashboard } from './components/organization';
import { User, Supplier, ProductType, DeliveryRecord, StorageUnit, StorageRecord, DailySurface, DailyCleaningRecord, FrequentArea, Costing, OutgoingRecord, ElaboratedRecord, TechnicalSheet, EstablishmentInfo } from './types';

// --- PROPS INTERFACE ---
interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
  users: User[];
  onAddUser: (details: Omit<User, 'id'>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (id: string, details: { name: string; email: string; }) => void;
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
  today.setHours(0, 0, 0, 0);

  const pendingCleanings = props.frequentAreas.filter(area => {
    const nextDueDate = calculateNextDueDate(area.lastCleaned, area.frequencyDays);
    if (!nextDueDate) return true; // Never cleaned, so it's pending
    nextDueDate.setHours(0, 0, 0, 0);
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


  const renderContent = () => {
    switch (activePage) {
      case 'Panel Principal':
        return (
          <>
            <h1>Panel Principal</h1>
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
        />;
      case 'Fichas Técnicas':
        return <TechnicalSheetsPage
          sheets={props.technicalSheets}
          onAddSheet={props.onAddTechnicalSheet}
          onDeleteSheet={props.onDeleteTechnicalSheet}
          establishmentInfo={props.establishmentInfo}
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
      case 'Usuarios':
        return isCurrentUserAdmin ? <UsersPage users={props.users} onAddUser={props.onAddUser} onDeleteUser={props.onDeleteUser} onUpdateUser={props.onUpdateUser} /> : <h1>Acceso Denegado</h1>;
      case 'Configuración':
        return isCurrentUserAdmin ? <SettingsPage info={props.establishmentInfo} onUpdateInfo={props.onUpdateEstablishmentInfo} /> : <h1>Acceso Denegado</h1>;
      case 'Dashboard Organización':
        return isCurrentUserAdmin ? <OrganizationDashboard /> : <h1>Acceso Denegado</h1>;
      case 'Configuración Organización':
        return isCurrentUserAdmin ? <OrganizationSettingsPage /> : <h1>Acceso Denegado</h1>;
      case 'Gestión de Usuarios':
        return isCurrentUserAdmin ? <UserManagementPage /> : <h1>Acceso Denegado</h1>;
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
          <div className="header-info">
            <div className="organization-info">
              <span className="org-name">{props.establishmentInfo.name || 'Mi Organización'}</span>
              <span className="user-name">Usuario: <strong>{props.currentUser.name}</strong></span>
            </div>
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
