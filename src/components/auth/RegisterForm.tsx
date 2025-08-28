import React, { useState } from 'react';
import { useAuth } from '../../contexts';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationSubdomain: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState(1); // 1: Datos personales, 2: Datos de empresa

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (error) {
      clearError();
    }
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      return 'El nombre es requerido';
    }
    if (!formData.email.trim()) {
      return 'El correo electrónico es requerido';
    }
    if (formData.password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  };

  const validateStep2 = () => {
    if (!formData.organizationName.trim()) {
      return 'El nombre de la empresa es requerido';
    }
    if (!acceptTerms) {
      return 'Debes aceptar los términos y condiciones';
    }
    return null;
  };

  const handleNextStep = () => {
    const error = validateStep1();
    if (error) {
      alert(error);
      return;
    }
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const generateSubdomain = (orgName: string) => {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
  };

  const handleOrganizationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const orgName = e.target.value;
    setFormData(prev => ({
      ...prev,
      organizationName: orgName,
      organizationSubdomain: generateSubdomain(orgName)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const step2Error = validateStep2();
    if (step2Error) {
      alert(step2Error);
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organizationName: formData.organizationName,
        organizationSubdomain: formData.organizationSubdomain,
      });
      // El contexto manejará la redirección automáticamente
    } catch (err) {
      // El error ya está manejado por el contexto
      console.error('Error en registro:', err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">🛡️</div>
            <h1>Crear Cuenta</h1>
          </div>
          <p className="auth-subtitle">
            Configura tu cuenta y empresa en minutos
          </p>
          
          {/* Progress indicator */}
          <div className="progress-indicator">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Datos personales</span>
            </div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Datos de empresa</span>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={step === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit}>
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Tu nombre completo"
                  className="form-input"
                  autoComplete="name"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@empresa.com"
                  className="form-input"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Contraseña
                </label>
                <div className="input-wrapper password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
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
                    placeholder="Repite tu contraseña"
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

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                Continuar
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label htmlFor="organizationName" className="form-label">
                  Nombre de la empresa
                </label>
                <input
                  type="text"
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleOrganizationNameChange}
                  placeholder="Nombre de tu empresa"
                  className="form-input"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="organizationSubdomain" className="form-label">
                  Subdominio (opcional)
                </label>
                <div className="input-wrapper subdomain-wrapper">
                  <input
                    type="text"
                    id="organizationSubdomain"
                    name="organizationSubdomain"
                    value={formData.organizationSubdomain}
                    onChange={handleChange}
                    placeholder="mi-empresa"
                    className="form-input"
                    disabled={isLoading}
                  />
                  <span className="subdomain-suffix">.autocontrol.pro</span>
                </div>
                <small className="form-help">
                  Tu equipo podrá acceder en: {formData.organizationSubdomain || 'mi-empresa'}.autocontrol.pro
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    disabled={isLoading}
                    required
                  />
                  <span className="checkbox-custom"></span>
                  Acepto los términos y condiciones de uso del servicio
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrevStep}
                  disabled={isLoading}
                >
                  Atrás
                </button>
                
                <button
                  type="submit"
                  className={`btn-primary ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading || !acceptTerms}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear Cuenta'
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onSwitchToLogin}
              disabled={isLoading}
            >
              Iniciar sesión
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

export default RegisterForm;