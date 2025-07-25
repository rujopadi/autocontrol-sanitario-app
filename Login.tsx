import React, { useState } from 'react';
import { useNotifications } from './NotificationContext';
import LogoSVG from './LogoSVG';

interface LoginProps {
  onLoginSuccess: (credentials: { email: string, password: string }) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { warning } = useNotifications();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      warning('Campos requeridos', 'Por favor, introduzca su correo y contraseña.');
      return;
    }
    onLoginSuccess({ email, password });
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-logo">
          <LogoSVG className="logo-image" />
          <h1>Autocontrol Sanitario Pro</h1>
        </div>
        <p>Introduzca sus credenciales para acceder al panel.</p>
        <div className="form-group">
          <label htmlFor="email">Correo electrónico</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            autoComplete="email"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn-login">
          Iniciar Sesión
        </button>
        <div className="auth-switch-link">
          <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }}>
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        
        <div className="auth-switch-link">
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}>
            ¿No tiene cuenta? Cree una nueva
          </a>
        </div>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} Creado por <strong>Sibarilia, S.L.</strong></p>
        </div>
      </form>
    </div>
  );
};

export default Login;