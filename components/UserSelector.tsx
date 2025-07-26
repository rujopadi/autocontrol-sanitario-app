import React, { useState, useEffect } from 'react';
import { User } from '../App';

interface UserSelectorProps {
  users: User[];
  selectedUserId: string;
  selectedUserName: string;
  onUserSelect: (userId: string, userName: string) => void;
  required?: boolean;
  label?: string;
  error?: string;
}

const UserSelector: React.FC<UserSelectorProps> = ({
  users,
  selectedUserId,
  selectedUserName,
  onUserSelect,
  required = true,
  label = "Registrado por",
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar usuarios activos y por término de búsqueda
  const filteredUsers = users.filter(user => 
    user.isActive && 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-seleccionar si solo hay un usuario activo
  useEffect(() => {
    if (filteredUsers.length === 1 && !selectedUserId) {
      const user = filteredUsers[0];
      onUserSelect(user.id, user.name);
    }
  }, [filteredUsers, selectedUserId, onUserSelect]);

  const handleUserSelect = (user: User) => {
    onUserSelect(user.id, user.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="user-selector">
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      
      <div className="user-selector-container">
        <div 
          className={`user-selector-input ${error ? 'error' : ''}`}
          onClick={handleToggle}
        >
          <span className={selectedUserName ? 'selected' : 'placeholder'}>
            {selectedUserName || 'Seleccionar usuario...'}
          </span>
          <svg 
            className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="user-selector-dropdown">
            {filteredUsers.length > 3 && (
              <div className="user-selector-search">
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            <div className="user-selector-options">
              {filteredUsers.length === 0 ? (
                <div className="user-selector-option disabled">
                  No hay usuarios disponibles
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`user-selector-option ${selectedUserId === user.id ? 'selected' : ''}`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="user-info">
                      <span className="user-name">{user.name}</span>
                      <span className="user-role">{user.role}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default UserSelector;