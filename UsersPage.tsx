
import React, { useState, useMemo } from 'react';
import { User, UserRole, UserFormData } from './App';
import { useNotifications } from './NotificationContext';
import { createCollaboratorUser, getCompanyUsers } from './utils/dataMigration';

interface UsersPageProps {
  users: User[];
  onAddUser: (details: UserFormData) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (id: string, details: Partial<User>) => void;
  currentUser: User;
  onRefreshUsers: () => void; // Nueva prop para refrescar usuarios
}

const UsersPage: React.FC<UsersPageProps> = ({ users, onAddUser, onDeleteUser, onUpdateUser, currentUser, onRefreshUsers }) => {
  const { warning, success, error } = useNotifications();
  
  // Form state for new user
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Usuario');
  const [isActive, setIsActive] = useState(true);
  
  // State for editing modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormState, setEditFormState] = useState({
    name: '',
    email: '',
    role: 'Usuario' as UserRole,
    isActive: true
  });
  
  // Filters and search
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [searchText, setSearchText] = useState('');
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Filtrar solo usuarios de la misma empresa
  const companyUsers = useMemo(() => {
    return users.filter(user => user.companyId === currentUser.companyId);
  }, [users, currentUser.companyId]);

  // Derived data
  const filteredUsers = useMemo(() => {
    return companyUsers.filter(user => {
      // Role filter
      if (roleFilter && user.role !== roleFilter) return false;
      
      // Status filter
      if (statusFilter === 'active' && !user.isActive) return false;
      if (statusFilter === 'inactive' && user.isActive) return false;
      
      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const nameMatch = user.name.toLowerCase().includes(searchLower);
        const emailMatch = user.email.toLowerCase().includes(searchLower);
        if (!nameMatch && !emailMatch) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by role (Admin first), then by name
      if (a.role !== b.role) {
        const roleOrder = { 'Administrador': 0, 'Usuario': 1, 'Solo Lectura': 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      }
      return a.name.localeCompare(b.name);
    });
  }, [users, roleFilter, statusFilter, searchText]);

  const userStats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const inactive = users.filter(u => !u.isActive).length;
    const admins = users.filter(u => u.role === 'Administrador').length;
    const regularUsers = users.filter(u => u.role === 'Usuario').length;
    const readOnly = users.filter(u => u.role === 'Solo Lectura').length;
    
    return { total, active, inactive, admins, regularUsers, readOnly };
  }, [users]);

  // Validation functions
  const validateField = (fieldName: string, value: string): string => {
    switch (fieldName) {
      case 'name':
        return value.trim().length < 2 ? 'El nombre debe tener al menos 2 caracteres' : '';
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Formato de email inválido';
        // Check if email already exists (excluding current editing user)
        const existingUser = users.find(u => u.email === value && u.id !== editingUser?.id);
        return existingUser ? 'Este email ya está registrado' : '';
      case 'password':
        return value.length < 6 ? 'La contraseña debe tener al menos 6 caracteres' : '';
      default:
        return '';
    }
  };

  const validateForm = (formData: any, isEdit: boolean = false): boolean => {
    const errors: {[key: string]: string} = {};
    
    errors.name = validateField('name', formData.name);
    errors.email = validateField('email', formData.email);
    
    if (!isEdit) {
      errors.password = validateField('password', formData.password);
    }
    
    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = { name: name.trim(), email: email.trim(), password, role, isActive };
    
    if (!validateForm(formData)) {
      warning('Errores de validación', 'Por favor, corrija los errores en el formulario.');
      return;
    }

    try {
      onAddUser(formData);
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setRole('Usuario');
      setIsActive(true);
      setValidationErrors({});
      success('Usuario creado', `El usuario ${formData.name} se ha creado correctamente.`);
    } catch (err) {
      error('Error al crear usuario', 'No se pudo crear el usuario.');
    }
  };

  // Nueva función para crear usuarios colaboradores
  const handleCreateCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    
    const collaboratorData = { 
      name: name.trim(), 
      email: email.trim(), 
      password 
    };
    
    if (!validateForm({...collaboratorData, role: 'Usuario', isActive: true})) {
      warning('Errores de validación', 'Por favor, corrija los errores en el formulario.');
      return;
    }

    try {
      createCollaboratorUser(collaboratorData, currentUser);
      onRefreshUsers(); // Refrescar la lista de usuarios
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setRole('Usuario');
      setIsActive(true);
      setValidationErrors({});
      success('Usuario colaborador creado', `El usuario ${collaboratorData.name} se ha creado correctamente y puede acceder al sistema.`);
    } catch (err: any) {
      error('Error al crear usuario colaborador', err.message || 'No se pudo crear el usuario colaborador.');
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    // Prevent deleting current user
    if (userId === currentUser.id) {
      warning('Acción no permitida', 'No puedes eliminar tu propio usuario.');
      return;
    }
    
    // Prevent deleting the last admin
    const user = users.find(u => u.id === userId);
    if (user?.role === 'Administrador') {
      const adminCount = users.filter(u => u.role === 'Administrador').length;
      if (adminCount <= 1) {
        warning('Acción no permitida', 'Debe haber al menos un administrador en el sistema.');
        return;
      }
    }
    
    if (window.confirm(`¿Está seguro de que desea eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      try {
        onDeleteUser(userId);
        success('Usuario eliminado', `El usuario ${userName} ha sido eliminado correctamente.`);
      } catch (err) {
        error('Error al eliminar', 'No se pudo eliminar el usuario.');
      }
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean, userName: string) => {
    // Prevent deactivating current user
    if (userId === currentUser.id && currentStatus) {
      warning('Acción no permitida', 'No puedes desactivar tu propio usuario.');
      return;
    }
    
    const newStatus = !currentStatus;
    const action = newStatus ? 'activado' : 'desactivado';
    
    try {
      onUpdateUser(userId, { isActive: newStatus });
      success(`Usuario ${action}`, `El usuario ${userName} ha sido ${action} correctamente.`);
    } catch (err) {
      error('Error al actualizar', `No se pudo ${action.slice(0, -1)}ar el usuario.`);
    }
  };

  // Handlers for editing
  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditFormState({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    setValidationErrors({});
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setValidationErrors({});
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setEditFormState({ ...editFormState, [name]: newValue });
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    if (!validateForm(editFormState, true)) {
      warning('Errores de validación', 'Por favor, corrija los errores en el formulario.');
      return;
    }
    
    // Prevent changing own role or status
    if (editingUser.id === currentUser.id) {
      if (editFormState.role !== editingUser.role) {
        warning('Acción no permitida', 'No puedes cambiar tu propio rol.');
        return;
      }
      if (editFormState.isActive !== editingUser.isActive) {
        warning('Acción no permitida', 'No puedes cambiar tu propio estado.');
        return;
      }
    }
    
    // Prevent removing last admin
    if (editingUser.role === 'Administrador' && editFormState.role !== 'Administrador') {
      const adminCount = users.filter(u => u.role === 'Administrador').length;
      if (adminCount <= 1) {
        warning('Acción no permitida', 'Debe haber al menos un administrador en el sistema.');
        return;
      }
    }

    try {
      onUpdateUser(editingUser.id, {
        name: editFormState.name.trim(),
        email: editFormState.email.trim(),
        role: editFormState.role,
        isActive: editFormState.isActive
      });
      handleCancelEdit();
      success('Usuario actualizado', `Los datos de ${editFormState.name} se han actualizado correctamente.`);
    } catch (err) {
      error('Error al actualizar', 'No se pudo actualizar el usuario.');
    }
  };

  const clearFilters = () => {
    setRoleFilter('');
    setStatusFilter('');
    setSearchText('');
  };

  return (
    <>
      <h1>Gestión Avanzada de Usuarios</h1>
      
      {/* Estadísticas */}
      <div className="card">
        <h2>Estadísticas de Usuarios</h2>
        <div className="user-stats-grid">
          <div className="stat-item">
            <span className="stat-value">{userStats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-value active">{userStats.active}</span>
            <span className="stat-label">Activos</span>
          </div>
          <div className="stat-item">
            <span className="stat-value inactive">{userStats.inactive}</span>
            <span className="stat-label">Inactivos</span>
          </div>
          <div className="stat-item">
            <span className="stat-value admin">{userStats.admins}</span>
            <span className="stat-label">Administradores</span>
          </div>
          <div className="stat-item">
            <span className="stat-value user">{userStats.regularUsers}</span>
            <span className="stat-label">Usuarios</span>
          </div>
          <div className="stat-item">
            <span className="stat-value readonly">{userStats.readOnly}</span>
            <span className="stat-label">Solo Lectura</span>
          </div>
        </div>
      </div>

      <div className="page-grid">
        {/* Formulario de nuevo usuario */}
        <div className="card">
          <h2>Añadir Nuevo Usuario</h2>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label htmlFor="new-user-name">Nombre Completo *</label>
              <input
                type="text"
                id="new-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: María Rodriguez"
                className={validationErrors.name ? 'error' : ''}
                required
              />
              {validationErrors.name && <span className="error-message">{validationErrors.name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-user-email">Correo Electrónico *</label>
              <input
                type="email"
                id="new-user-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className={validationErrors.email ? 'error' : ''}
                required
              />
              {validationErrors.email && <span className="error-message">{validationErrors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-user-password">Contraseña *</label>
              <input
                type="password"
                id="new-user-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={validationErrors.password ? 'error' : ''}
                required
              />
              {validationErrors.password && <span className="error-message">{validationErrors.password}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-user-role">Rol *</label>
              <select
                id="new-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                required
              >
                <option value="Usuario">Usuario</option>
                <option value="Administrador">Administrador</option>
                <option value="Solo Lectura">Solo Lectura</option>
              </select>
            </div>
            <div className="form-group-checkbox">
              <input
                type="checkbox"
                id="new-user-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="new-user-active">Usuario activo</label>
            </div>
            <div className="form-buttons">
              <button type="submit" className="btn-submit">
                Crear Usuario
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleCreateCollaborator}
              >
                Crear Usuario Colaborador
              </button>
            </div>
          </form>
        </div>

        {/* Filtros y listado */}
        <div className="card">
          <h2>Listado de Usuarios ({filteredUsers.length})</h2>
          
          {/* Filtros */}
          <div className="user-filters">
            <div className="filter-row">
              <div className="form-group">
                <label htmlFor="search-users">Buscar</label>
                <input
                  type="text"
                  id="search-users"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="role-filter">Rol</label>
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                >
                  <option value="">Todos los roles</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Usuario">Usuario</option>
                  <option value="Solo Lectura">Solo Lectura</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status-filter">Estado</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              <div className="filter-actions">
                <button type="button" className="btn-secondary" onClick={clearFilters}>
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de usuarios */}
          {filteredUsers.length > 0 ? (
            <div style={{overflowX: 'auto'}}>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className={!user.isActive ? 'inactive-user' : ''}>
                      <td data-label="Usuario">
                        <div className="user-info">
                          <div className="user-name">
                            {user.name}
                            {user.id === currentUser.id && <span className="current-user-badge">(Tú)</span>}
                          </div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </td>
                      <td data-label="Rol">
                        <span className={`role-badge role-${user.role.toLowerCase().replace(' ', '-')}`}>
                          {user.role}
                        </span>
                      </td>
                      <td data-label="Estado">
                        <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <div className="user-actions">
                          <button 
                            className="btn-edit" 
                            onClick={() => handleStartEdit(user)}
                            title="Editar usuario"
                          >
                            Editar
                          </button>
                          <button
                            className={`btn-toggle ${user.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                            onClick={() => handleToggleUserStatus(user.id, user.isActive, user.name)}
                            disabled={user.id === currentUser.id}
                            title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            {user.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={user.id === currentUser.id}
                            title="Eliminar usuario"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No hay usuarios que coincidan con los filtros seleccionados.</p>
          )}
        </div>
      </div>
      
      {editingUser && (
        <div className="image-modal-overlay" onClick={handleCancelEdit}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', padding: '25px'}}>
            <h2 style={{color: 'var(--primary-color)', marginTop: 0, marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', width: '100%', textAlign: 'left'}}>
              Editar Usuario: {editingUser.name}
            </h2>
            <form onSubmit={handleSaveEdit} style={{width: '100%'}}>
              <div className="form-group">
                <label htmlFor="edit-name">Nombre Completo *</label>
                <input 
                  type="text" 
                  id="edit-name" 
                  name="name" 
                  value={editFormState.name} 
                  onChange={handleEditChange}
                  className={validationErrors.name ? 'error' : ''}
                  required 
                />
                {validationErrors.name && <span className="error-message">{validationErrors.name}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="edit-email">Correo Electrónico *</label>
                <input 
                  type="email" 
                  id="edit-email" 
                  name="email" 
                  value={editFormState.email} 
                  onChange={handleEditChange}
                  className={validationErrors.email ? 'error' : ''}
                  required 
                />
                {validationErrors.email && <span className="error-message">{validationErrors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="edit-role">Rol *</label>
                <select
                  id="edit-role"
                  name="role"
                  value={editFormState.role}
                  onChange={handleEditChange}
                  disabled={editingUser.id === currentUser.id}
                  required
                >
                  <option value="Usuario">Usuario</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Solo Lectura">Solo Lectura</option>
                </select>
                {editingUser.id === currentUser.id && (
                  <small style={{color: '#666', fontSize: '0.85em'}}>No puedes cambiar tu propio rol</small>
                )}
              </div>
              <div className="form-group-checkbox">
                <input
                  type="checkbox"
                  id="edit-active"
                  name="isActive"
                  checked={editFormState.isActive}
                  onChange={handleEditChange}
                  disabled={editingUser.id === currentUser.id}
                />
                <label htmlFor="edit-active">Usuario activo</label>
                {editingUser.id === currentUser.id && (
                  <small style={{color: '#666', fontSize: '0.85em', display: 'block', marginTop: '5px'}}>
                    No puedes cambiar tu propio estado
                  </small>
                )}
              </div>
              <div className="edit-form-actions">
                <button type="button" className="btn-cancel" onClick={handleCancelEdit}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersPage;