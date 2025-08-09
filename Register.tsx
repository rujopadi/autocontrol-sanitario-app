import React, { useState } from 'react';
import { User } from './App';
import { useNotifications } from './NotificationContext';

interface RegisterProps {
  onRegister: (details: Omit<User, 'id'>) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { warning } = useNotifications();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
        warning('Campos requeridos', 'Por favor, complete todos los campos.');
        return;
    }
    if (!acceptedTerms) {
        warning('Términos y condiciones', 'Debe aceptar los términos y condiciones para continuar.');
        return;
    }
    onRegister({ 
      name: name.trim(), 
      email: email.trim(), 
      role: 'Administrador',
      isActive: true,
      companyId: `company_${Date.now()}`,
      createdAt: new Date().toISOString()
    });
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
        
        {/* Términos y condiciones */}
        <div className="terms-section">
          <div className="terms-checkbox">
            <input 
              type="checkbox" 
              id="accept-terms" 
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
            />
            <label htmlFor="accept-terms">
              Acepto los términos y condiciones de uso
            </label>
          </div>
          
          <div className="legal-text">
            <h4>Política de Privacidad y Protección de Datos</h4>
            <p>
              <strong>Autocontrol Pro</strong> se compromete a proteger su privacidad y datos personales:
            </p>
            <ul>
              <li>✓ <strong>No vendemos sus datos</strong> a terceros bajo ninguna circunstancia</li>
              <li>✓ <strong>No compartimos información</strong> con empresas externas sin su consentimiento</li>
              <li>✓ Sus datos se utilizan <strong>únicamente</strong> para el funcionamiento del sistema de autocontrol</li>
              <li>✓ <strong>Aislamiento total</strong> entre empresas - cada empresa ve solo sus datos</li>
              <li>✓ <strong>Cifrado y seguridad</strong> en todas las comunicaciones y almacenamiento</li>
              <li>✓ <strong>Derecho de eliminación</strong> - puede solicitar la eliminación de sus datos en cualquier momento</li>
            </ul>
            
            <p>
              <strong>Uso del Sistema:</strong> Al registrarse, usted acepta utilizar este sistema únicamente para 
              fines de control sanitario y cumplimiento normativo. Los datos introducidos deben ser veraces y 
              actualizados.
            </p>
            
            <p>
              <strong>Soporte:</strong> Para cualquier consulta sobre privacidad o funcionamiento del sistema, 
              puede contactarnos a través del sistema de ayuda integrado.
            </p>
            
            <p className="legal-note">
              Al marcar esta casilla, confirma que ha leído y acepta estos términos, y que es mayor de edad 
              y tiene autoridad para registrar su empresa en este sistema.
            </p>
          </div>
        </div>
        
        <button type="submit" className="btn-login" disabled={!acceptedTerms}>
          Registrar y Entrar
        </button>
        <div className="auth-switch-link">
          <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }}>
            ¿Ya tiene una cuenta? Inicie sesión
          </a>
        </div>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} Creado por <strong>Sibarilia, S.L.</strong></p>
        </div>
      </form>
    </div>
  );
};

export default Register;