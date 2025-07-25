import React, { useState } from 'react';
import { useNotifications } from './NotificationContext';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { success, error } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      error('Error', 'Por favor introduce tu email');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setEmailSent(true);
        success('Email enviado', data.message);
      } else {
        error('Error', data.message);
      }
    } catch (err) {
      error('Error', 'No se pudo enviar el email. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h1>Email Enviado</h1>
          <p>Se ha enviado un email con instrucciones para recuperar tu contraseña.</p>
          <p>Revisa tu bandeja de entrada y spam.</p>
          <button onClick={onBackToLogin} className="btn-login">
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Recuperar Contraseña</h1>
        <p>Introduce tu email para recibir instrucciones de recuperación.</p>
        
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            required
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          className="btn-login"
          disabled={isLoading}
        >
          {isLoading ? 'Enviando...' : 'Enviar Email'}
        </button>
        
        <div className="auth-switch-link">
          <a href="#" onClick={(e) => { e.preventDefault(); onBackToLogin(); }}>
            Volver al Login
          </a>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;