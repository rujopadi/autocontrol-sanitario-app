import React, { useState } from 'react';
import { useAuth, useOrganization } from '../../contexts';

const OrganizationSettingsPage: React.FC = () => {
  const { user, organization, updateOrganization } = useAuth();
  const { stats, isLoading: orgLoading } = useOrganization();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'settings' | 'stats'>('general');
  
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    subdomain: organization?.subdomain || '',
    settings: {
      allowUserRegistration: organization?.settings?.allowUserRegistration || false,
      requireEmailVerification: organization?.settings?.requireEmailVerification || true,
      sessionTimeout: organization?.settings?.sessionTimeout || 480, // 8 horas en minutos
    },
    branding: {
      primaryColor: organization?.branding?.primaryColor || '#005A9C',
      secondaryColor: organization?.branding?.secondaryColor || '#EFEFEF',
      logo: organization?.branding?.logo || '',
    }
  });

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    if (!organization) return;
    
    setIsSaving(true);
    try {
      await updateOrganization({
        name: formData.name,
        settings: formData.settings,
        branding: formData.branding,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error actualizando organización:', error);
      alert('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: organization?.name || '',
      subdomain: organization?.subdomain || '',
      settings: {
        allowUserRegistration: organization?.settings?.allowUserRegistration || false,
        requireEmailVerification: organization?.settings?.requireEmailVerification || true,
        sessionTimeout: organization?.settings?.sessionTimeout || 480,
      },
      branding: {
        primaryColor: organization?.branding?.primaryColor || '#005A9C',
        secondaryColor: organization?.branding?.secondaryColor || '#EFEFEF',
        logo: organization?.branding?.logo || '',
      }
    });
    setIsEditing(false);
  };

  if (!organization) {
    return (
      <div className="organization-settings">
        <div className="loading-state">
          <span className="spinner"></span>
          <p>Cargando configuración de la organización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="organization-settings">
      <div className="settings-header">
        <div className="header-content">
          <h1>Configuración de la Organización</h1>
          <p>Gestiona la configuración y preferencias de tu organización</p>
        </div>
        
        {!isEditing ? (
          <button 
            className="btn-primary"
            onClick={() => setIsEditing(true)}
            disabled={user?.role !== 'Admin' && !user?.isAdmin}
          >
            Editar Configuración
          </button>
        ) : (
          <div className="edit-actions">
            <button 
              className="btn-secondary"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button 
              className={`btn-primary ${isSaving ? 'loading' : ''}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        )}
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <span className="tab-icon">🏢</span>
          General
        </button>
        <button 
          className={`tab-button ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          <span className="tab-icon">🎨</span>
          Marca
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="tab-icon">⚙️</span>
          Configuración
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="tab-icon">📊</span>
          Estadísticas
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <div className="settings-section">
            <h2>Información General</h2>
            
            <div className="form-group">
              <label className="form-label">Nombre de la Organización</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
                placeholder="Nombre de tu empresa"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subdominio</label>
              <div className="subdomain-input">
                <input
                  type="text"
                  className="form-input"
                  value={formData.subdomain}
                  disabled={true} // Los subdominios no se pueden cambiar después de la creación
                  placeholder="mi-empresa"
                />
                <span className="subdomain-suffix">.autocontrol.pro</span>
              </div>
              <small className="form-help">
                El subdominio no se puede modificar después de la creación
              </small>
            </div>

            <div className="organization-info">
              <div className="info-card">
                <h3>Plan de Suscripción</h3>
                <div className="plan-info">
                  <span className={`plan-badge ${organization.subscription.plan}`}>
                    {organization.subscription.plan.toUpperCase()}
                  </span>
                  <span className={`status-badge ${organization.subscription.status}`}>
                    {organization.subscription.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {organization.subscription.expiresAt && (
                  <p className="expiry-date">
                    Expira: {new Date(organization.subscription.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="settings-section">
            <h2>Personalización de Marca</h2>
            
            <div className="form-group">
              <label className="form-label">Color Primario</label>
              <div className="color-input-group">
                <input
                  type="color"
                  className="color-input"
                  value={formData.branding.primaryColor}
                  onChange={(e) => handleInputChange('branding.primaryColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  className="form-input"
                  value={formData.branding.primaryColor}
                  onChange={(e) => handleInputChange('branding.primaryColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#005A9C"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color Secundario</label>
              <div className="color-input-group">
                <input
                  type="color"
                  className="color-input"
                  value={formData.branding.secondaryColor}
                  onChange={(e) => handleInputChange('branding.secondaryColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  className="form-input"
                  value={formData.branding.secondaryColor}
                  onChange={(e) => handleInputChange('branding.secondaryColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#EFEFEF"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Logo de la Empresa</label>
              <div className="logo-upload">
                {formData.branding.logo ? (
                  <div className="logo-preview">
                    <img src={formData.branding.logo} alt="Logo" />
                    {isEditing && (
                      <button 
                        className="remove-logo"
                        onClick={() => handleInputChange('branding.logo', '')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="logo-placeholder">
                    <span className="placeholder-icon">🏢</span>
                    <p>Sin logo</p>
                  </div>
                )}
                {isEditing && (
                  <button className="btn-secondary upload-btn">
                    Subir Logo
                  </button>
                )}
              </div>
              <small className="form-help">
                Formatos soportados: PNG, JPG, SVG. Tamaño máximo: 2MB
              </small>
            </div>

            <div className="branding-preview">
              <h3>Vista Previa</h3>
              <div 
                className="preview-card"
                style={{
                  '--primary-color': formData.branding.primaryColor,
                  '--secondary-color': formData.branding.secondaryColor,
                } as React.CSSProperties}
              >
                <div className="preview-header">
                  {formData.branding.logo ? (
                    <img src={formData.branding.logo} alt="Logo" className="preview-logo" />
                  ) : (
                    <div className="preview-logo-placeholder">🏢</div>
                  )}
                  <h4>{formData.name}</h4>
                </div>
                <div className="preview-content">
                  <p>Así se verá tu marca en la aplicación</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <h2>Configuración del Sistema</h2>
            
            <div className="settings-group">
              <h3>Registro de Usuarios</h3>
              
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Permitir registro público</label>
                  <p className="setting-description">
                    Los usuarios pueden registrarse directamente sin invitación
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.settings.allowUserRegistration}
                    onChange={(e) => handleInputChange('settings.allowUserRegistration', e.target.checked)}
                    disabled={!isEditing}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Verificación de email obligatoria</label>
                  <p className="setting-description">
                    Los usuarios deben verificar su email antes de acceder
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.settings.requireEmailVerification}
                    onChange={(e) => handleInputChange('settings.requireEmailVerification', e.target.checked)}
                    disabled={!isEditing}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h3>Seguridad</h3>
              
              <div className="setting-item">
                <div className="setting-info">
                  <label className="setting-label">Tiempo de sesión (minutos)</label>
                  <p className="setting-description">
                    Tiempo antes de que expire automáticamente la sesión
                  </p>
                </div>
                <select
                  className="form-select"
                  value={formData.settings.sessionTimeout}
                  onChange={(e) => handleInputChange('settings.sessionTimeout', parseInt(e.target.value))}
                  disabled={!isEditing}
                >
                  <option value={60}>1 hora</option>
                  <option value={240}>4 horas</option>
                  <option value={480}>8 horas</option>
                  <option value={720}>12 horas</option>
                  <option value={1440}>24 horas</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="settings-section">
            <h2>Estadísticas de la Organización</h2>
            
            {orgLoading ? (
              <div className="loading-state">
                <span className="spinner"></span>
                <p>Cargando estadísticas...</p>
              </div>
            ) : stats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <h3>{stats.totalUsers}</h3>
                    <p>Usuarios Totales</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <h3>{stats.activeUsers}</h3>
                    <p>Usuarios Activos</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <div className="stat-content">
                    <h3>{stats.totalRecords}</h3>
                    <p>Registros Totales</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <h3>{stats.recordsThisMonth}</h3>
                    <p>Registros Este Mes</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">💾</div>
                  <div className="stat-content">
                    <h3>{Math.round(stats.storageUsed / 1024 / 1024)} MB</h3>
                    <p>Almacenamiento Usado</p>
                  </div>
                </div>
                
                {stats.lastActivity && (
                  <div className="stat-card">
                    <div className="stat-icon">🕒</div>
                    <div className="stat-content">
                      <h3>{new Date(stats.lastActivity).toLocaleDateString()}</h3>
                      <p>Última Actividad</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <p>No hay estadísticas disponibles</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationSettingsPage;