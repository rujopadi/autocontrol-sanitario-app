import React, { useState } from 'react';
import { User } from './types';

interface UsersPageProps {
  users: User[];
  onAddUser: (details: Omit<User, 'id'>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (id: string, details: { name: string; email: string }) => void;
}

const UsersPage: React.FC<UsersPageProps> = ({ users, onAddUser, onDeleteUser, onUpdateUser }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State for editing modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormState, setEditFormState] = useState({ name: '', email: '' });
  
  // El primer usuario es el admin y no se puede eliminar
  const adminUsers = users.filter(u => u.isAdmin);
  const regularUsers = users.filter(u => !u.isAdmin);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert('Todos los campos son obligatorios.');
      return;
    }
    onAddUser({ name: name.trim(), email: email.trim(), password });
    // Reset form
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
        onDeleteUser(userId);
    }
  };

  // Handlers for editing
  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditFormState({ name: user.name, email: user.email });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormState({ ...editFormState, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && editFormState.name.trim() && editFormState.email.trim()) {
      onUpdateUser(editingUser.id, editFormState);
      handleCancelEdit();
    } else {
      alert('El nombre y el correo no pueden estar vacíos.');
    }
  };

  return (
    <>
      <h1>Gestión de Usuarios</h1>
      <div className="page-grid">
        <div className="card">
          <h2>Añadir Nuevo Usuario</h2>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label htmlFor="new-user-name">Nombre completo</label>
              <input
                type="text"
                id="new-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: María Rodriguez"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-user-email">Correo electrónico</label>
              <input
                type="email"
                id="new-user-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                required
              />
            </div>
             <div className="form-group">
              <label htmlFor="new-user-password">Contraseña</label>
              <input
                type="password"
                id="new-user-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña segura"
                required
              />
            </div>
            <button type="submit" className="btn-submit">
              Crear Usuario
            </button>
          </form>
        </div>
        <div className="card">
          <h2>Listado de Usuarios</h2>
          {users.length > 0 ? (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo Electrónico</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Fila del Administrador (no se puede borrar) */}
                {adminUsers.map(user => (
                  <tr key={user.id}>
                    <td data-label="Nombre">{user.name} <strong>(Admin)</strong></td>
                    <td data-label="Correo">{user.email}</td>
                    <td data-label="Acciones" style={{textAlign: 'right'}}>
                       <span style={{fontSize: '13px', color: '#6c757d'}}>No se puede modificar</span>
                    </td>
                </tr>
                ))}
                {regularUsers.map(user => (
                  <tr key={user.id}>
                    <td data-label="Nombre">{user.name}</td>
                    <td data-label="Correo">{user.email}</td>
                    <td data-label="Acciones">
                      <div className="user-actions">
                        <button className="btn-edit" onClick={() => handleStartEdit(user)}>Editar</button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteUser(user.id)}
                          aria-label={`Eliminar a ${user.name}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No hay usuarios registrados.</p>
          )}
        </div>
      </div>
      
      {editingUser && (
        <div className="image-modal-overlay" onClick={handleCancelEdit}>
            <div className="image-modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px', padding: '25px'}}>
                 <h2 style={{color: 'var(--primary-color)', marginTop: 0, marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', width: '100%', textAlign: 'left'}}>Editar Usuario</h2>
                 <form onSubmit={handleSaveEdit} style={{width: '100%'}}>
                    <div className="form-group">
                        <label htmlFor="edit-name">Nombre completo</label>
                        <input type="text" id="edit-name" name="name" value={editFormState.name} onChange={handleEditChange} required />
                    </div>
                     <div className="form-group">
                        <label htmlFor="edit-email">Correo electrónico</label>
                        <input type="email" id="edit-email" name="email" value={editFormState.email} onChange={handleEditChange} required />
                    </div>
                    <div className="edit-form-actions">
                        <button type="button" className="btn-cancel" onClick={handleCancelEdit}>Cancelar</button>
                        <button type="submit" className="btn-submit">Guardar Cambios</button>
                    </div>
                 </form>
            </div>
        </div>
      )}
    </>
  );
};

export default UsersPage;
