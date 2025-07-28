import React, { useState, useEffect } from 'react';
import { User, EstablishmentInfo } from './App';
import { useNotifications } from './NotificationContext';
import UserSelector from './components/UserSelector';
import { getCompanyUsers } from './utils/dataMigration';

interface UserProfilePageProps {
  currentUser: User;
  users: User[];
  establishmentInfo: EstablishmentInfo;
  onUpdateUser: (id: string, details: Partial<User>) => void;
  onUpdateEstablishmentInfo: (info: EstablishmentInfo) => void;
  onAddUser: (details: any) => void;
  onDeleteUser: (id: string) => void;
  onRefreshUsers: () => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentUser,
  users,
  establishmentInfo,
  onUpdateUser,
  onUpdateEstablishmentInfo,
  onAddUser,
  onDeleteUser,
  onRefreshUsers
}) => {
  const { success, error, warning } = useNotifications();
  
  // Estados para perfil de usuario
  const [userName, setUserName] = useState(currentUser.name);
  const [userEmail, setUserEmail] = useState(currentUser.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados para información de empresa
  const [companyName, setCompanyName] = useState(establishmentInfo.name);
  const [companyAddress, setCompanyAddress] = useState(establishmentInfo.address);
  const [companyCity, setCompanyCity] = useState(establishmentInfo.city);
  const [companyPostalCode, setCompanyPostalCode] = useState(establishmentInfo.postalCode);
  const [companyPhone, setCompanyPhone] = useState(establishmentInfo.phone);
  const [companyEmail, setCompanyEmail] = useState(establishmentInfo.email);
  const [companyCif, setCompanyCif] = useState(establishmentInfo.cif);
  const [companySanitaryRegistry, setCompanySanitaryRegistry] = useState(establishmentInfo.sanitaryRegistry);
  const [companyTechnicalResponsible, setCompanyTechnicalResponsible] = useState(establishmentInfo.technicalResponsible);
  
  // Estados para gestión de trabajadores
  const [workerName, setWorkerName] = useState('');
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'workers'>('profile');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Obtener trabajadores de la empresa
  const companyWorkers = getCompanyUsers(currentUser);
  
  // Validación de formularios
  const validateUserForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!userName.trim()) {
      errors.userName = 'El nombre es requerido';
    }
    
    if (!userEmail.trim()) {
      errors.userEmail = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(userEmail)) {
      errors.userEmail = 'Email inválido';
    }
    
    if (newPassword && newPassword.length < 6) {
      errors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const validateCompanyForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!companyName.trim()) errors.companyName = 'El nombre de la empresa es requerido';
    if (!companyAddress.trim()) errors.companyAddress = 'La dirección es requerida';
    if (!companyCity.trim()) errors.companyCity = 'La ciudad es requerida';
    if (!companyPostalCode.trim()) errors.companyPostalCode = 'El código postal es requerido';
    if (!companyPhone.trim()) errors.companyPhone = 'El teléfono es requerido';
    if (!companyEmail.trim()) errors.companyEmail = 'El email es requerido';
    if (!companyCif.trim()) errors.companyCif = 'El CIF es requerido';
    if (!companySanitaryRegistry.trim()) errors.companySanitaryRegistry = 'El registro sanitario es requerido';
    if (!companyTechnicalResponsible.trim()) errors.companyTechnicalResponsible = 'El responsable técnico es requerido';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const validateWorkerForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!workerName.trim()) errors.workerName = 'El nombre es requerido';
    if (!workerEmail.trim()) errors.workerEmail = 'El email es requerido';
    if (!workerPassword || workerPassword.length < 6) errors.workerPassword = 'La contraseña debe tener al menos 6 caracteres';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handlers
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUserForm()) {
      warning('Errores de validación', 'Por favor, corrija los errores en el formulario.');
      return;
    }
    
    try {
      const updateData: any = {
        name: userName.trim(),
        email: userEmail.trim()
      };
      
      if (newPassword) {
        updateData.password = newPassword;
      }
      
      await onUpdateUser(currentUser.id, updateData);
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      success('Perfil actualizado', 'Su perfil se ha actualizado correctamente.');
    } catch (err: any) {
      error('Error al actualizar perfil', err.message || 'No se pudo actualizar el perfil.');
    }
  };
  
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCompanyForm()) {
      warning('Errores de validación', 'Por favor, corrija los errores en el formulario.');
      return;
    }
    
    try {
      const updatedInfo: EstablishmentInfo = {
        name: companyName.trim(),
        address: companyAddress.trim(),
        city: companyCity.trim(),
        postalCode: companyPostalCode.trim(),
        phone: companyPhone.trim(),
        email: companyEmail.trim(),
        cif: companyCif.trim(),
        sanitaryRegistry: companySanitaryRegistry.trim(),
        technicalResponsible: companyTechnicalResponsible.trim(),
        updatedAt: new Date().toISOString()
      };
      
      await onUpdateEstablishmentInfo(updatedInfo);
      success('Empresa actualizada', 'Los datos de la empresa se han actualizado correctamente.');
    } catch (err: any) {
      error('Error al actualizar empresa', err.message || 'No se pudieron actualizar los datos de la empresa.');
    }
  };
  
  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateWorkerForm()) {
      warning('Errores de validación', 'Por favor, corrija los errores en el formulario.');
      return;
    }
    
    try {
      const workerData = {
        name: workerName.trim(),
        email: workerEmail.trim(),
        password: workerPassword,
        role: 'Usuario' as const,
        isActive: true
      };
      
      await onAddUser(workerData);
      
      // Reset form
      setWorkerName('');
      setWorkerEmail('');
      setWorkerPassword('');
      setShowAddWorkerForm(false);
      setValidationErrors({});
      
      success('Trabajador añadido', `${workerData.name} se ha añadido correctamente al equipo.`);
    } catch (err: any) {
      error('Error al añadir trabajador', err.message || 'No se pudo añadir el trabajador.');
    }
  };
  
  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (workerId === currentUser.id) {
      warning('Acción no permitida', 'No puedes eliminarte a ti mismo.');
      return;
    }
    
    if (window.confirm(`¿Está seguro de que desea eliminar a ${workerName} del equipo?`)) {
      try {
        await onDeleteUser(workerId);
        success('Trabajador eliminado', `${workerName} ha sido eliminado del equipo.`);
      } catch (err: any) {
        error('Error al eliminar trabajador', err.message || 'No se pudo eliminar el trabajador.');
      }
    }
  };

  return (
    <div className="user-profile-page">
      <h1>Mi Perfil y Empresa</h1>
      
      {/* Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Mi Perfil
        </button>
        <button 
          className={`tab-button ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          Datos de Empresa
        </button>
        <button 
          className={`tab-button ${activeTab === 'workers' ? 'active' : ''}`}
          onClick={() => setActiveTab('workers')}
        >
          Equipo de Trabajo ({companyWorkers.length})
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {/* Perfil de Usuario */}
        {activeTab === 'profile' && (
          <div className="card">
            <h2>Información Personal</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label htmlFor="user-name">Nombre Completo *</label>
                <input
                  type="text"
                  id="user-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={validationErrors.userName ? 'error' : ''}
                  required
                />
                {validationErrors.userName && <span className="error-message">{validationErrors.userName}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="user-email">Email *</label>
                <input
                  type="email"
                  id="user-email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={validationErrors.userEmail ? 'error' : ''}
                  required
                />
                {validationErrors.userEmail && <span className="error-message">{validationErrors.userEmail}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="current-password">Contraseña Actual</label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Dejar vacío si no desea cambiar"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="new-password">Nueva Contraseña</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={validationErrors.newPassword ? 'error' : ''}
                  placeholder="Mínimo 6 caracteres"
                />
                {validationErrors.newPassword && <span className="error-message">{validationErrors.newPassword}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={validationErrors.confirmPassword ? 'error' : ''}
                  placeholder="Repetir nueva contraseña"
                />
                {validationErrors.confirmPassword && <span className="error-message">{validationErrors.confirmPassword}</span>}
              </div>
              
              <button type="submit" className="btn-submit">
                Actualizar Perfil
              </button>
            </form>
          </div>
        )}
        
        {/* Datos de Empresa */}
        {activeTab === 'company' && (
          <div className="card">
            <h2>Información de la Empresa</h2>
            <form onSubmit={handleUpdateCompany}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="company-name">Nombre de la Empresa *</label>
                  <input
                    type="text"
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={validationErrors.companyName ? 'error' : ''}
                    required
                  />
                  {validationErrors.companyName && <span className="error-message">{validationErrors.companyName}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="company-cif">CIF/NIF *</label>
                  <input
                    type="text"
                    id="company-cif"
                    value={companyCif}
                    onChange={(e) => setCompanyCif(e.target.value)}
                    className={validationErrors.companyCif ? 'error' : ''}
                    required
                  />
                  {validationErrors.companyCif && <span className="error-message">{validationErrors.companyCif}</span>}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="company-address">Dirección *</label>
                <input
                  type="text"
                  id="company-address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className={validationErrors.companyAddress ? 'error' : ''}
                  required
                />
                {validationErrors.companyAddress && <span className="error-message">{validationErrors.companyAddress}</span>}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="company-city">Ciudad *</label>
                  <input
                    type="text"
                    id="company-city"
                    value={companyCity}
                    onChange={(e) => setCompanyCity(e.target.value)}
                    className={validationErrors.companyCity ? 'error' : ''}
                    required
                  />
                  {validationErrors.companyCity && <span className="error-message">{validationErrors.companyCity}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="company-postal">Código Postal *</label>
                  <input
                    type="text"
                    id="company-postal"
                    value={companyPostalCode}
                    onChange={(e) => setCompanyPostalCode(e.target.value)}
                    className={validationErrors.companyPostalCode ? 'error' : ''}
                    required
                  />
                  {validationErrors.companyPostalCode && <span className="error-message">{validationErrors.companyPostalCode}</span>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="company-phone">Teléfono *</label>
                  <input
                    type="tel"
                    id="company-phone"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className={validationErrors.companyPhone ? 'error' : ''}
                    required
                  />
                  {validationErrors.companyPhone && <span className="error-message">{validationErrors.companyPhone}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="company-email">Email *</label>
                  <input
                    type="email"
                    id="company-email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className={validationErrors.companyEmail ? 'error' : ''}
                    required
                  />
                  {validationErrors.companyEmail && <span className="error-message">{validationErrors.companyEmail}</span>}
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="company-registry">Registro Sanitario *</label>
                  <input
                    type="text"
                    id="company-registry"
                    value={companySanitaryRegistry}
                    onChange={(e) => setCompanySanitaryRegistry(e.target.value)}
                    className={validationErrors.companySanitaryRegistry ? 'error' : ''}
                    required
                  />
                  {validationErrors.companySanitaryRegistry && <span className="error-message">{validationErrors.companySanitaryRegistry}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="company-responsible">Responsable Técnico *</label>
                  <input
                    type="text"
                    id="company-responsible"
                    value={companyTechnicalResponsible}
                    onChange={(e) => setCompanyTechnicalResponsible(e.target.value)}
                    className={validationErrors.companyTechnicalResponsible ? 'error' : ''}
                    required
                  />
                  {validationErrors.companyTechnicalResponsible && <span className="error-message">{validationErrors.companyTechnicalResponsible}</span>}
                </div>
              </div>
              
              <button type="submit" className="btn-submit">
                Actualizar Datos de Empresa
              </button>
            </form>
          </div>
        )}
        
        {/* Equipo de Trabajo */}
        {activeTab === 'workers' && (
          <div className="card">
            <div className="section-header">
              <h2>Equipo de Trabajo</h2>
              <button 
                className="btn-secondary"
                onClick={() => setShowAddWorkerForm(!showAddWorkerForm)}
              >
                {showAddWorkerForm ? 'Cancelar' : 'Añadir Trabajador'}
              </button>
            </div>
            
            {/* Formulario para añadir trabajador */}
            {showAddWorkerForm && (
              <div className="add-worker-form">
                <h3>Nuevo Trabajador</h3>
                <form onSubmit={handleAddWorker}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="worker-name">Nombre Completo *</label>
                      <input
                        type="text"
                        id="worker-name"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        className={validationErrors.workerName ? 'error' : ''}
                        required
                      />
                      {validationErrors.workerName && <span className="error-message">{validationErrors.workerName}</span>}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="worker-email">Email *</label>
                      <input
                        type="email"
                        id="worker-email"
                        value={workerEmail}
                        onChange={(e) => setWorkerEmail(e.target.value)}
                        className={validationErrors.workerEmail ? 'error' : ''}
                        required
                      />
                      {validationErrors.workerEmail && <span className="error-message">{validationErrors.workerEmail}</span>}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="worker-password">Contraseña *</label>
                    <input
                      type="password"
                      id="worker-password"
                      value={workerPassword}
                      onChange={(e) => setWorkerPassword(e.target.value)}
                      className={validationErrors.workerPassword ? 'error' : ''}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                    {validationErrors.workerPassword && <span className="error-message">{validationErrors.workerPassword}</span>}
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowAddWorkerForm(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-submit">
                      Añadir Trabajador
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Lista de trabajadores */}
            <div className="workers-list">
              {companyWorkers.length === 0 ? (
                <p>No hay trabajadores registrados.</p>
              ) : (
                companyWorkers.map(worker => (
                  <div key={worker.id} className="worker-item">
                    <div className="worker-info">
                      <div className="worker-name">
                        {worker.name}
                        {worker.id === currentUser.id && <span className="current-user-badge">(Tú)</span>}
                      </div>
                      <div className="worker-details">
                        <span className="worker-email">{worker.email}</span>
                        <span className={`worker-role ${worker.role.toLowerCase()}`}>{worker.role}</span>
                        <span className={`worker-status ${worker.isActive ? 'active' : 'inactive'}`}>
                          {worker.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    
                    {worker.id !== currentUser.id && (
                      <div className="worker-actions">
                        <button 
                          className="btn-danger btn-small"
                          onClick={() => handleDeleteWorker(worker.id, worker.name)}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;