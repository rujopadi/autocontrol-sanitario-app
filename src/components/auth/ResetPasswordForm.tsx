import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';

interface ResetPasswordFormProps {
  token: string;
  onSwitchToLogin: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token, onSwitchToLogin }) => {
  const { resetPassword, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // Validar token al montar el componente
    if (!token || token.length < 10) {
      setIsTokenValid(false);
    }
  }, [token]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Debe contener al menos una letra minúscula');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Debe contener al menos una letra mayúscula');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Debe contener al menos un número');
    }
    
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) {
      clearError();
    }
    
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar contraseñas
    const passwordErrors = validatePassword(formData.password);
    
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setValidationErrors(['Las contraseñas no coinciden']);
      return;
    }

    try {
      await resetPassword(token, formData.password);
      setIsSuccess(true);
    } catch (err) {
      // El error ya está manejado por el contexto
      console.error('Error reseteando contraseña:', err);
    }
  };

  if (!isTokenValid) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="error-icon">❌</div>
            <h1>Enlace Inválido</h1>
            <p className="auth-subtitle">
              El enlace de recuperación ha expirado o no es válido
            </p>
          </div>

          <div className="error-content">
            <div className="info-box">
              <span className="info-icon">ℹ️</span>
              <div>
                <strong>¿Qué puedes hacer?</strong>
                <p>
                  Solicita un nuevo enlace de recuperación desde la página de login.
                  Los enlaces son válidos por 1 hora por seguridad.
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

  if (isSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon">🎉</div>
            <h1>¡Contraseña Actualizada!</h1>
            <p className="auth-subtitle">
              Tu contraseña ha sido cambiada exitosamente
            </p>
          </div>

          <div className="success-content">
            <div className="info-box">
              <span className="info-icon">✅</span>
              <div>
                <strong>Ya puedes iniciar sesión</strong>
                <p>
                  Usa tu nueva contraseña para acceder a tu cuenta.
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
              Iniciar Sesión
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
            <div className="logo-icon">🔒</div>
            <h1>Nueva Contraseña</h1>
          </div>
          <p className="auth-subtitle">
            Ingresa tu nueva contraseña segura
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <ul>
                {validationErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Nueva contraseña
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Tu nueva contraseña"
                className="form-input"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirmar contraseña
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirma tu nueva contraseña"
                className="form-input"
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="password-requirements">
            <h4>Requisitos de la contraseña:</h4>
            <ul>
              <li className={formData.password.length >= 8 ? 'valid' : ''}>
                Al menos 8 caracteres
              </li>
              <li className={/(?=.*[a-z])/.test(formData.password) ? 'valid' : ''}>
                Una letra minúscula
              </li>
              <li className={/(?=.*[A-Z])/.test(formData.password) ? 'valid' : ''}>
                Una letra mayúscula
              </li>
              <li className={/(?=.*\d)/.test(formData.password) ? 'valid' : ''}>
                Un número
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className={`btn-primary ${isLoading ? 'loading' : ''}`}
            disabled={isLoading || !formData.password.trim() || !formData.confirmPassword.trim()}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Actualizando...
              </>
            ) : (
              'Actualizar Contraseña'
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

export default ResetPasswordForm;