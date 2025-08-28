import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';

interface EmailVerificationFormProps {
  token?: string;
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

const EmailVerificationForm: React.FC<EmailVerificationFormProps> = ({ 
  token, 
  onSuccess, 
  onSwitchToLogin 
}) => {
  const { 
    verifyEmail, 
    resendEmailVerification, 
    isLoading, 
    error, 
    emailVerificationSent,
    user,
    clearError 
  } = useAuth();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);

  // Verificar automáticamente si hay un token
  useEffect(() => {
    if (token && !isVerifying && !isSuccess) {
      handleVerifyToken(token);
    }
  }, [token]);

  const handleVerifyToken = async (verificationToken: string) => {
    setIsVerifying(true);
    
    try {
      await verifyEmail(verificationToken);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      console.error('Error verificando email:', err);
      if (err.message.includes('inválido') || err.message.includes('expirado')) {
        setIsTokenInvalid(true);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendEmailVerification();
    } catch (err) {
      console.error('Error reenviando verificación:', err);
    }
  };

  // Verificación exitosa
  if (isSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="success-icon">✅</div>
            <h1>¡Email Verificado!</h1>
            <p className="auth-subtitle">
              Tu correo electrónico ha sido verificado exitosamente
            </p>
          </div>

          <div className="success-message">
            <div className="success-content">
              <p>
                ¡Perfecto! Tu cuenta está ahora completamente configurada y lista para usar.
              </p>
              
              <div className="success-features">
                <h3>Ya puedes:</h3>
                <ul>
                  <li>✅ Acceder a todas las funcionalidades</li>
                  <li>✅ Invitar miembros a tu equipo</li>
                  <li>✅ Configurar tu organización</li>
                  <li>✅ Comenzar a registrar datos</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={onSuccess}
            >
              Continuar a la aplicación
            </button>
          </div>

          <div className="auth-security">
            <div className="security-badge">
              <span className="security-icon">🔐</span>
              <span>Cuenta verificada y segura</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Token inválido o expirado
  if (isTokenInvalid) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="error-icon">❌</div>
            <h1>Enlace de Verificación Inválido</h1>
            <p className="auth-subtitle">
              El enlace de verificación no es válido o ha expirado
            </p>
          </div>

          <div className="error-content">
            <p>
              El enlace que has utilizado no es válido o ha expirado. 
              Los enlaces de verificación expiran después de 24 horas por seguridad.
            </p>
            
            <div className="error-tips">
              <h3>¿Qué puedes hacer?</h3>
              <ul>
                <li>Solicita un nuevo enlace de verificación</li>
                <li>Verifica que hayas copiado el enlace completo</li>
                <li>Revisa tu carpeta de spam</li>
              </ul>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar Nuevo Enlace'}
            </button>
            
            <button
              type="button"
              className="btn-secondary"
              onClick={onSwitchToLogin}
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verificando token
  if (isVerifying) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="loading-icon">
              <span className="spinner large"></span>
            </div>
            <h1>Verificando Email</h1>
            <p className="auth-subtitle">
              Estamos verificando tu correo electrónico...
            </p>
          </div>

          <div className="loading-content">
            <p>Por favor espera mientras verificamos tu cuenta.</p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal de verificación (sin token)
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">📧</div>
            <h1>Verifica tu Email</h1>
          </div>
          <p className="auth-subtitle">
            Hemos enviado un enlace de verificación a tu correo electrónico
          </p>
        </div>

        <div className="verification-content">
          {user && (
            <div className="user-email">
              <strong>{user.email}</strong>
            </div>
          )}

          <div className="verification-instructions">
            <h3>¿Qué hacer ahora?</h3>
            <ol>
              <li>Revisa tu bandeja de entrada</li>
              <li>Busca el correo de "Autocontrol Sanitario Pro"</li>
              <li>Haz clic en el enlace de verificación</li>
              <li>¡Listo! Tu cuenta estará verificada</li>
            </ol>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {emailVerificationSent && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              Nuevo enlace de verificación enviado
            </div>
          )}

          <div className="verification-tips">
            <h3>¿No ves el correo?</h3>
            <ul>
              <li>Revisa tu carpeta de spam o correo no deseado</li>
              <li>Asegúrate de haber escrito correctamente tu correo</li>
              <li>El enlace expira en 24 horas por seguridad</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className={`btn-primary ${isLoading ? 'loading' : ''}`}
            onClick={handleResendVerification}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Enviando...
              </>
            ) : (
              'Reenviar Enlace de Verificación'
            )}
          </button>
          
          <button
            type="button"
            className="btn-secondary"
            onClick={onSwitchToLogin}
          >
            Volver al inicio de sesión
          </button>
        </div>

        <div className="auth-help">
          <div className="help-section">
            <h3>¿Necesitas ayuda?</h3>
            <p>
              Si tienes problemas con la verificación, contacta con nuestro 
              equipo de soporte en{' '}
              <a href="mailto:soporte@autocontrol.pro" className="link-button">
                soporte@autocontrol.pro
              </a>
            </p>
          </div>
        </div>

        <div className="auth-security">
          <div className="security-badge">
            <span className="security-icon">🔐</span>
            <span>Proceso seguro y encriptado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationForm;