import React, { useState } from 'react';
import { AuthProvider, OrganizationProvider, AppDataProvider, useAuth, useAppData, useOrganization } from './contexts';
import { LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, EmailVerificationForm } from './components/auth';
import Dashboard from './Dashboard';
import DataMigrationWizard from './components/DataMigrationWizard';
import { configureApiService } from './services';
import { authUserToUser } from './types/auth';
import { hasLocalStorageData, isMigrationCompleted } from './utils/dataMigration';
import './styles/auth.css';

// Componente principal de la aplicación con contextos
const AppContent: React.FC = () => {
  const { user, isLoading, isAuthenticated, error } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  // Verificar tokens en la URL al cargar
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetTokenParam = urlParams.get('reset-token');
    const verifyTokenParam = urlParams.get('verify-token');
    
    if (resetTokenParam) {
      setResetToken(resetTokenParam);
      setAuthView('reset-password');
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (verifyTokenParam) {
      setVerificationToken(verifyTokenParam);
      setAuthView('verify-email');
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="loading-icon">
              <span className="spinner large"></span>
            </div>
            <h1>Autocontrol Sanitario Pro</h1>
            <p className="auth-subtitle">Cargando aplicación...</p>
          </div>
        </div>
      </div>
    );
  }

  // Usuario no autenticado - mostrar formularios de auth
  if (!isAuthenticated || !user) {
    switch (authView) {
      case 'register':
        return (
          <RegisterForm 
            onSwitchToLogin={() => setAuthView('login')} 
          />
        );
      
      case 'forgot-password':
        return (
          <ForgotPasswordForm 
            onSwitchToLogin={() => setAuthView('login')} 
          />
        );
      
      case 'reset-password':
        return (
          <ResetPasswordForm 
            token={resetToken || ''}
            onSuccess={() => setAuthView('login')}
            onSwitchToLogin={() => setAuthView('login')} 
          />
        );
      
      case 'verify-email':
        return (
          <EmailVerificationForm 
            token={verificationToken || undefined}
            onSuccess={() => window.location.reload()}
            onSwitchToLogin={() => setAuthView('login')} 
          />
        );
      
      default:
        return (
          <LoginForm 
            onSwitchToRegister={() => setAuthView('register')}
            onSwitchToForgotPassword={() => setAuthView('forgot-password')}
          />
        );
    }
  }

  // Usuario autenticado pero email no verificado
  if (!user.emailVerified) {
    return (
      <EmailVerificationForm 
        onSuccess={() => window.location.reload()}
        onSwitchToLogin={() => setAuthView('login')} 
      />
    );
  }

  // Usuario autenticado y verificado - mostrar dashboard
  return <DashboardWrapper />;
};

// Wrapper del Dashboard que usa los contextos de datos
const DashboardWrapper: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    deliveryRecords,
    storageRecords,
    technicalSheets,
    suppliers,
    productTypes,
    storageUnits,
    dailySurfaces,
    dailyCleaningRecords,
    frequentAreas,
    costings,
    outgoingRecords,
    elaboratedRecords,
    establishmentInfo,
    isLoading,
    // Métodos para manejar datos
    addDeliveryRecord,
    deleteDeliveryRecord,
    addStorageRecord,
    deleteStorageRecord,
    addTechnicalSheet,
    deleteTechnicalSheet,
    addSupplier,
    deleteSupplier,
    addProductType,
    deleteProductType,
    addStorageUnit,
    deleteStorageUnit,
    updateEstablishmentInfo,
  } = useAppData();

  const { users } = useOrganization();
  
  // Estado para controlar el wizard de migración
  const [showMigrationWizard, setShowMigrationWizard] = useState(() => {
    return hasLocalStorageData() && !isMigrationCompleted();
  });

  // Convertir usuarios de organización al formato esperado por Dashboard
  const dashboardUsers = users.map(orgUser => ({
    id: orgUser.id,
    name: orgUser.name,
    email: orgUser.email,
    role: orgUser.role,
    isActive: orgUser.isActive,
  }));

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="loading-icon">
              <span className="spinner large"></span>
            </div>
            <h1>Cargando datos...</h1>
            <p className="auth-subtitle">Preparando tu espacio de trabajo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showMigrationWizard && (
        <DataMigrationWizard
          onComplete={() => setShowMigrationWizard(false)}
          onSkip={() => setShowMigrationWizard(false)}
        />
      )}
      
      <Dashboard
      currentUser={authUserToUser(user)}
      onLogout={logout}
      users={dashboardUsers}
      onAddUser={() => {}} // TODO: Implementar con OrganizationContext
      onDeleteUser={() => {}} // TODO: Implementar con OrganizationContext
      onUpdateUser={() => {}} // TODO: Implementar con OrganizationContext
      deliveryRecords={deliveryRecords}
      onAddDeliveryRecord={addDeliveryRecord}
      onDeleteDeliveryRecord={deleteDeliveryRecord}
      establishmentInfo={establishmentInfo || {
        name: user.organization.name,
        address: '',
        phone: '',
        email: user.email,
        manager: user.name,
        activityType: '',
        registrationNumber: '',
      }}
      onUpdateEstablishmentInfo={updateEstablishmentInfo}
      suppliers={suppliers}
      onAddSupplier={addSupplier}
      onDeleteSupplier={deleteSupplier}
      productTypes={productTypes}
      onAddProductType={addProductType}
      onDeleteProductType={deleteProductType}
      storageUnits={storageUnits}
      onAddStorageUnit={addStorageUnit}
      onDeleteStorageUnit={deleteStorageUnit}
      storageRecords={storageRecords}
      onAddStorageRecord={addStorageRecord}
      onDeleteStorageRecord={deleteStorageRecord}
      dailySurfaces={dailySurfaces}
      onAddDailySurface={() => {}} // TODO: Implementar
      onDeleteDailySurface={() => {}} // TODO: Implementar
      dailyCleaningRecords={dailyCleaningRecords}
      onAddDailyCleaningRecord={() => {}} // TODO: Implementar
      onDeleteDailyCleaningRecord={() => {}} // TODO: Implementar
      frequentAreas={frequentAreas}
      onAddFrequentArea={() => {}} // TODO: Implementar
      onDeleteFrequentArea={() => {}} // TODO: Implementar
      onCleanFrequentArea={() => {}} // TODO: Implementar
      costings={costings}
      onSetCostings={() => {}} // TODO: Implementar
      outgoingRecords={outgoingRecords}
      onAddOutgoingRecord={() => {}} // TODO: Implementar
      onDeleteOutgoingRecord={() => {}} // TODO: Implementar
      elaboratedRecords={elaboratedRecords}
      onAddElaboratedRecord={() => {}} // TODO: Implementar
      onDeleteElaboratedRecord={() => {}} // TODO: Implementar
      technicalSheets={technicalSheets}
      onAddTechnicalSheet={addTechnicalSheet}
      onDeleteTechnicalSheet={deleteTechnicalSheet}
    />
    </>
  );
};

// Componente principal con todos los providers
const App: React.FC = () => {
  // Configurar el servicio API cuando se inicializa la app
  React.useEffect(() => {
    configureApiService(
      (newToken: string) => {
        // Callback para cuando se renueva el token
        console.log('Token renovado automáticamente');
      },
      () => {
        // Callback para cuando hay error de autenticación
        console.log('Error de autenticación, redirigiendo al login');
        window.location.reload();
      }
    );
  }, []);

  return (
    <AuthProvider>
      <OrganizationProvider>
        <AppDataProvider>
          <AppContent />
        </AppDataProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
};

export default App;
