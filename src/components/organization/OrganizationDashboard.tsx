import React, { useState, useEffect } from 'react';
import { useAuth, useOrganization, useAppData } from '../../contexts';

const OrganizationDashboard: React.FC = () => {
  const { user, organization } = useAuth();
  const { users, invitations, stats, isLoading: orgLoading } = useOrganization();
  const { 
    deliveryRecords, 
    storageRecords, 
    technicalSheets,
    isLoading: dataLoading,
    lastSync 
  } = useAppData();

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  // Calcular estadísticas rápidas
  const quickStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    pendingInvitations: invitations.filter(i => i.status === 'pending').length,
    totalRecords: deliveryRecords.length + storageRecords.length + technicalSheets.length,
    recentRecords: deliveryRecords.filter(r => {
      const recordDate = new Date(r.receptionDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return recordDate >= weekAgo;
    }).length,
  };

  // Datos para gráficos (simulados por ahora)
  const activityData = [
    { day: 'Lun', records: 12 },
    { day: 'Mar', records: 8 },
    { day: 'Mié', records: 15 },
    { day: 'Jue', records: 10 },
    { day: 'Vie', records: 18 },
    { day: 'Sáb', records: 5 },
    { day: 'Dom', records: 3 },
  ];

  const isAdmin = user?.role === 'Admin' || user?.isAdmin;

  return (
    <div className="organization-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard de {organization?.name}</h1>
          <p>Resumen de la actividad y estadísticas de tu organización</p>
        </div>
        
        <div className="header-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="time-range-select"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
          </select>
          
          {lastSync && (
            <div className="sync-info">
              <span className="sync-icon">🔄</span>
              <span className="sync-text">
                Actualizado: {lastSync.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de estadísticas rápidas */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{quickStats.totalUsers}</h3>
            <p>Usuarios Totales</p>
            <div className="stat-detail">
              {quickStats.activeUsers} activos
            </div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{quickStats.totalRecords}</h3>
            <p>Registros Totales</p>
            <div className="stat-detail">
              +{quickStats.recentRecords} esta semana
            </div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">📧</div>
          <div className="stat-content">
            <h3>{quickStats.pendingInvitations}</h3>
            <p>Invitaciones Pendientes</p>
            <div className="stat-detail">
              {quickStats.pendingInvitations > 0 ? 'Requieren atención' : 'Todo al día'}
            </div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{organization?.subscription.plan.toUpperCase()}</h3>
            <p>Plan Actual</p>
            <div className="stat-detail">
              {organization?.subscription.status === 'active' ? 'Activo' : 'Inactivo'}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-row">
          {/* Gráfico de actividad */}
          <div className="dashboard-card activity-chart">
            <div className="card-header">
              <h2>Actividad Reciente</h2>
              <p>Registros creados por día</p>
            </div>
            <div className="chart-container">
              <div className="simple-bar-chart">
                {activityData.map((item, index) => (
                  <div key={index} className="bar-item">
                    <div 
                      className="bar"
                      style={{ height: `${(item.records / 20) * 100}%` }}
                    ></div>
                    <div className="bar-label">{item.day}</div>
                    <div className="bar-value">{item.records}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Usuarios recientes */}
          <div className="dashboard-card recent-users">
            <div className="card-header">
              <h2>Usuarios Recientes</h2>
              <p>Últimos usuarios activos</p>
            </div>
            <div className="users-list">
              {users
                .filter(u => u.isActive)
                .sort((a, b) => {
                  const dateA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
                  const dateB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
                  return dateB - dateA;
                })
                .slice(0, 5)
                .map(user => (
                  <div key={user.id} className="user-item">
                    <div className="user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-role">{user.role}</div>
                    </div>
                    <div className="user-status">
                      <span className="status-dot active"></span>
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Nuevo'
                      }
                    </div>
                  </div>
                ))}
              
              {users.filter(u => u.isActive).length === 0 && (
                <div className="empty-state-small">
                  <p>No hay usuarios activos</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-row">
          {/* Resumen de registros */}
          <div className="dashboard-card records-summary">
            <div className="card-header">
              <h2>Resumen de Registros</h2>
              <p>Distribución por tipo</p>
            </div>
            <div className="records-breakdown">
              <div className="record-type">
                <div className="record-icon">📦</div>
                <div className="record-info">
                  <h3>{deliveryRecords.length}</h3>
                  <p>Registros de Entrega</p>
                </div>
              </div>
              
              <div className="record-type">
                <div className="record-icon">🌡️</div>
                <div className="record-info">
                  <h3>{storageRecords.length}</h3>
                  <p>Registros de Almacenamiento</p>
                </div>
              </div>
              
              <div className="record-type">
                <div className="record-icon">📋</div>
                <div className="record-info">
                  <h3>{technicalSheets.length}</h3>
                  <p>Fichas Técnicas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="dashboard-card quick-actions">
            <div className="card-header">
              <h2>Acciones Rápidas</h2>
              <p>Tareas comunes</p>
            </div>
            <div className="actions-grid">
              <button className="action-button">
                <span className="action-icon">📦</span>
                <span className="action-text">Nuevo Registro de Entrega</span>
              </button>
              
              <button className="action-button">
                <span className="action-icon">🌡️</span>
                <span className="action-text">Control de Temperatura</span>
              </button>
              
              {isAdmin && (
                <>
                  <button className="action-button">
                    <span className="action-icon">👥</span>
                    <span className="action-text">Invitar Usuario</span>
                  </button>
                  
                  <button className="action-button">
                    <span className="action-icon">⚙️</span>
                    <span className="action-text">Configuración</span>
                  </button>
                </>
              )}
              
              <button className="action-button">
                <span className="action-icon">📊</span>
                <span className="action-text">Ver Reportes</span>
              </button>
              
              <button className="action-button">
                <span className="action-icon">📥</span>
                <span className="action-text">Exportar Datos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Alertas y notificaciones */}
        {(quickStats.pendingInvitations > 0 || !organization?.subscription || organization.subscription.status !== 'active') && (
          <div className="dashboard-alerts">
            <h2>Alertas y Notificaciones</h2>
            
            {quickStats.pendingInvitations > 0 && (
              <div className="alert warning">
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  <h3>Invitaciones Pendientes</h3>
                  <p>
                    Tienes {quickStats.pendingInvitations} invitación(es) pendiente(s) que requieren atención.
                  </p>
                </div>
                <button className="alert-action">Ver Invitaciones</button>
              </div>
            )}
            
            {organization?.subscription.status !== 'active' && (
              <div className="alert danger">
                <span className="alert-icon">🚨</span>
                <div className="alert-content">
                  <h3>Suscripción Inactiva</h3>
                  <p>
                    Tu suscripción está inactiva. Algunas funcionalidades pueden estar limitadas.
                  </p>
                </div>
                <button className="alert-action">Renovar Suscripción</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationDashboard;