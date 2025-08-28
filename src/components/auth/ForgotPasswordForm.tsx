import React, { useState } from 'react';
import { useAuth } from '../../contexts';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSwitchToLogin }) => {
  const { requestPasswordReset, isLoading, error, clearError, passwordResetSent } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Limpiar error cuando el usuario empiece a escribir
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      return;
    }

    try {
      await requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (err) {
      // El error ya está manejado por el contexto
      console.error('Error solicitando reset:', err);
    }
  };

  if (isSubmitted || passwordResetSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon">✅</div>
            <h1>Correo Enviado</h1>
            <p className="auth-subtitle">
              Hemos enviado un enlace de recuperación a tu correo electrónico
            </p>
          </div>

          <div className="success-content">
            <div className="info-box">
              <span className="info-icon">📧</span>
              <div>
                <strong>Revisa tu bandeja de entrada</strong>
                <p>
                  Si no ves el correo en unos minutos, revisa tu carpeta de spam.
                  El enlace será válido por 1 hora.
                </p>
              </div>
            </div>
          </div>

          <div className="auth-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={onSwitchToLogin}
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">🔑</div>
            <h1>Recuperar Contraseña</h1>
          </div>
          <p className="auth-subtitle">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="tu@empresa.com"
              className="form-input"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className={`btn-primary ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || !email.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Enviando...
              </>
            ) : (
              'Enviar Enlace de Recuperación'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Recordaste tu contraseña?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToLogin}
              disabled={isLoading}
            >
              Volver al login
            </button>
          </p>
        </div>

        <div className="auth-security">
          <div className="security-badge">
            <span className="security-icon">🔐</span>
            <span>Conexión segura SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;