import React, { useState, useEffect } from 'react';
import { useAuth, useOrganization } from '../../contexts';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'Admin' | 'Manager' | 'User') => Promise<void>;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Manager' | 'User'>('User');
  const [isInviting, setIsInviting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsInviting(true);
    try {
      await onInvite(email, role);
      setEmail('');
      setRole('User');
      onClose();
    } catch (error) {
      console.error('Error invitando usuario:', error);
    } finally {
      setIsInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invitar Usuario</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              required
              disabled={isInviting}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rol</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as 'Admin' | 'Manager' | 'User')}
              disabled={isInviting}
            >
              <option value="User">Usuario - Acceso básico</option>
              <option value="Manager">Manager - Gestión de registros</option>
              <option value="Admin">Admin - Control total</option>
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isInviting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`btn-primary ${isInviting ? 'loading' : ''}`}
              disabled={isInviting || !email.trim()}
            >
              {isInviting ? (
                <>
                  <span className="spinner"></span>
                  Enviando...
                </>
              ) : (
                'Enviar Invitación'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const {
    users,
    invitations,
    isLoading,
    error,
    inviteUser,
    updateUserRole,
    deactivateUser,
    reactivateUser,
    removeUser,
    cancelInvitation,
    resendInvitation,
    clearError,
  } = useOrganization();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'Admin' | 'Manager' | 'User'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleInviteUser = async (email: string, role: 'Admin' | 'Manager' | 'User') => {
    try {
      await inviteUser(email, role);
    } catch (error) {
      throw error;
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'Admin' | 'Manager' | 'User') => {
    try {
      await updateUserRole(userId, newRole);
    } catch (error) {
      alert('Error al cambiar el rol del usuario');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateUser(userId);
      } else {
        await reactivateUser(userId);
      }
    } catch (error) {
      alert('Error al cambiar el estado del usuario');
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${userName}? Esta acción no se puede deshacer.`)) {
      try {
        await removeUser(userId);
      } catch (error) {
        alert('Error al eliminar el usuario');
      }
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
    } catch (error) {
      alert('Error al cancelar la invitación');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
      alert('Invitación reenviada exitosamente');
    } catch (error) {
      alert('Error al reenviar la invitación');
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtrar invitaciones pendientes
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.isAdmin;

  return (
    <div className="user-management">
      <div className="page-header">
        <div className="header-content">
          <h1>Gestión de Usuarios</h1>
          <p>Administra los usuarios y permisos de tu organización</p>
        </div>
        
        {isAdmin && (
          <button 
            className="btn-primary"
            onClick={() => setShowInviteModal(true)}
          >
            <span className="btn-icon">➕</span>
            Invitar Usuario
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button className="error-close" onClick={clearError}>✕</button>
        </div>
      )}

      {/* Filtros */}
      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">Todos los roles</option>
            <option value="Admin">Administradores</option>
            <option value="Manager">Managers</option>
            <option value="User">Usuarios</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Invitaciones pendientes */}
      {pendingInvitations.length > 0 && (
        <div className="invitations-section">
          <h2>Invitaciones Pendientes ({pendingInvitations.length})</h2>
          <div className="invitations-list">
            {pendingInvitations.map(invitation => (
              <div key={invitation.id} className="invitation-card">
                <div className="invitation-info">
                  <div className="invitation-email">{invitation.email}</div>
                  <div className="invitation-details">
                    <span className="invitation-role">{invitation.role}</span>
                    <span className="invitation-date">
                      Enviada: {new Date(invitation.invitedAt).toLocaleDateString()}
                    </span>
                    <span className="invitation-expires">
                      Expira: {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="invitation-actions">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => handleResendInvitation(invitation.id)}
                    >
                      Reenviar
                    </button>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="users-section">
        <h2>Usuarios ({filteredUsers.length})</h2>
        
        {isLoading ? (
          <div className="loading-state">
            <span className="spinner"></span>
            <p>Cargando usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No se encontraron usuarios</h3>
            <p>
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Invita a tu primer usuario para comenzar'
              }
            </p>
          </div>
        ) : (
          <div className="users-table">
            <div className="table-header">
              <div className="header-cell">Usuario</div>
              <div className="header-cell">Rol</div>
              <div className="header-cell">Estado</div>
              <div className="header-cell">Último Acceso</div>
              {isAdmin && <div className="header-cell">Acciones</div>}
            </div>
            
            {filteredUsers.map(user => (
              <div key={user.id} className="table-row">
                <div className="user-info">
                  <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                </div>
                
                <div className="user-role">
                  {isAdmin && user.id !== currentUser?.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                      className="role-select"
                    >
                      <option value="User">Usuario</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`role-badge ${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  )}
                </div>
                
                <div className="user-status">
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="user-last-login">
                  {user.lastLogin 
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : 'Nunca'
                  }
                </div>
                
                {isAdmin && user.id !== currentUser?.id && (
                  <div className="user-actions">
                    <button
                      className={`btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                    >
                      {user.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => handleRemoveUser(user.id, user.name)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUser}
      />
    </div>
  );
};

export default UserManagementPage;