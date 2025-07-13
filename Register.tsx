import React, { useState } from 'react';
import { User } from './App';

interface RegisterProps {
  onRegister: (details: Omit<User, 'id'>) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
        alert('Por favor, complete todos los campos.');
        return;
    }
    onRegister({ name: name.trim(), email: email.trim(), password });
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Crear Nueva Cuenta</h1>
        <p>El primer usuario registrado será el <strong>administrador</strong> del sistema.</p>
        <div className="form-group">
          <label htmlFor="reg-name">Su nombre completo</label>
          <input 
            type="text" 
            id="reg-name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required 
            placeholder="Ej: Juan Pérez"
            autoComplete="name"
          />
        </div>
         <div className="form-group">
          <label htmlFor="reg-email">Correo electrónico</label>
          <input 
            type="email" 
            id="reg-email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            placeholder="ejemplo@correo.com"
            autoComplete="email"
          />
        </div>
         <div className="form-group">
          <label htmlFor="reg-password">Contraseña</label>
          <input 
            type="password" 
            id="reg-password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Cree una contraseña segura"
            autoComplete="new-password"
          />
        </div>
        <button type="submit" className="btn-login">
          Registrar y Entrar
        </button>
        <div className="auth-switch-link">
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>
            ¿Ya tiene una cuenta? Inicie sesión
          </a>
        </div>
      </form>
    </div>
  );
};

export default Register;