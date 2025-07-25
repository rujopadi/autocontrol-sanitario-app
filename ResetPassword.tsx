import React, { useState } from 'react';
import { useNotifications } from './NotificationContext';

interface ResetPasswordProps {
  token: string;
  onResetComplete: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onResetComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      error('Error', 'Por favor completa todos los campos');
      return;
    }
    
    if (password !== confirmPassword) {
      error('Error', 'Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      error('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        success('Contraseña actualizada', data.message);
        setTimeout(() => onResetComplete(), 2000);
      } else {
        error('Error', data.message);
      }
    } catch (err) {
      error('Error', 'No se pudo actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Nueva Contraseña</h1>
        <p>Introduce tu nueva contraseña.</p>
        
        <div className="form-group">
          <label htmlFor="password">Nueva Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>
        
        <button 
          type="submit" 
          className="btn-login"
          disabled={isLoading}
        >
          {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;