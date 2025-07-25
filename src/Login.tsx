import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (credentials: { email: string, password: string }) => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert('Por favor, introduzca su correo y contraseña.');
      return;
    }
    onLoginSuccess({ email, password });
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Autocontrol Sanitario Pro</h1>
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
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}>
            ¿No tiene cuenta? Cree una nueva
          </a>
        </div>
      </form>
    </div>
  );
};

export default Login;