# 🔐 Implementar Recuperación de Contraseña

## 🎯 Funcionalidad a Implementar

### Flujo Completo:
1. **Usuario olvida contraseña** → Hace clic en "¿Olvidaste tu contraseña?"
2. **Introduce email** → Sistema envía email con enlace
3. **Hace clic en enlace** → Va a página de reset
4. **Introduce nueva contraseña** → Se actualiza en la base de datos
5. **Puede iniciar sesión** con la nueva contraseña

## 🛠️ Implementación Técnica

### 1. Backend - Nuevas Rutas y Modelos

#### 1.1 Actualizar Modelo User
```javascript
// models/User.js - Añadir campos para reset
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  
  // NUEVOS CAMPOS PARA RESET PASSWORD
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
});
```

#### 1.2 Instalar Dependencias
```bash
# En el VPS
cd /var/www/backend
npm install nodemailer crypto
```

#### 1.3 Configurar Email (Nodemailer)
```javascript
// config/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail', // o tu proveedor de email
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Recuperación de Contraseña - Autocontrol Sanitario Pro',
    html: `
      <h2>Recuperación de Contraseña</h2>
      <p>Has solicitado recuperar tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Recuperar Contraseña
      </a>
      <p>Este enlace expira en 1 hora.</p>
      <p>Si no solicitaste este cambio, ignora este email.</p>
    `
  };
  
  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };
```

#### 1.4 Nuevas Rutas de Autenticación
```javascript
// routes/auth.routes.js - Añadir estas rutas

const crypto = require('crypto');
const { sendResetEmail } = require('../config/email');

// @route   POST api/auth/forgot-password
// @desc    Solicitar reset de contraseña
// @access  Public
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ 
        message: 'No existe una cuenta con ese email.' 
      });
    }
    
    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Guardar token y expiración (1 hora)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();
    
    // Enviar email
    await sendResetEmail(email, resetToken);
    
    res.json({ 
      message: 'Se ha enviado un email con instrucciones para recuperar tu contraseña.' 
    });
    
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// @route   POST api/auth/reset-password/:token
// @desc    Reset contraseña con token
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  
  try {
    // Buscar usuario con token válido y no expirado
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Token inválido o expirado.' 
      });
    }
    
    // Actualizar contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Limpiar campos de reset
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    res.json({ 
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' 
    });
    
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});
```

### 2. Frontend - Componentes y Páginas

#### 2.1 Componente ForgotPassword
```typescript
// ForgotPassword.tsx
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
          <h2>Email Enviado</h2>
          <p>Se ha enviado un email con instrucciones para recuperar tu contraseña.</p>
          <p>Revisa tu bandeja de entrada y spam.</p>
          <button onClick={onBackToLogin} className="login-button">
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Recuperar Contraseña</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Enviando...' : 'Enviar Email'}
          </button>
          
          <button 
            type="button" 
            onClick={onBackToLogin}
            className="register-link"
            disabled={isLoading}
          >
            Volver al Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
```

#### 2.2 Componente ResetPassword
```typescript
// ResetPassword.tsx
import React, { useState, useEffect } from 'react';
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
      <div className="login-form">
        <h2>Nueva Contraseña</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nueva Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label>Confirmar Contraseña:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
```

#### 2.3 Actualizar Login Component
```typescript
// Login.tsx - Añadir enlace "¿Olvidaste tu contraseña?"
// Añadir después del botón de login:

<button 
  type="button" 
  onClick={onForgotPassword}
  className="forgot-password-link"
  style={{ 
    background: 'none', 
    border: 'none', 
    color: '#007bff', 
    textDecoration: 'underline',
    cursor: 'pointer',
    marginTop: '10px'
  }}
>
  ¿Olvidaste tu contraseña?
</button>
```

### 3. Variables de Entorno

#### 3.1 Backend (.env)
```env
# Añadir al archivo .env del backend
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
FRONTEND_URL=https://autocontrolapp.com
```

## 🚀 Plan de Implementación

### Paso 1: Backend (30 minutos)
1. Actualizar modelo User
2. Instalar dependencias
3. Crear rutas de reset
4. Configurar email

### Paso 2: Frontend (45 minutos)
1. Crear componentes ForgotPassword y ResetPassword
2. Actualizar App.tsx para manejar rutas
3. Actualizar Login con enlace
4. Añadir estilos CSS

### Paso 3: Configuración Email (15 minutos)
1. Configurar Gmail App Password
2. Actualizar variables de entorno
3. Probar envío de emails

### Paso 4: Testing (15 minutos)
1. Probar flujo completo
2. Verificar emails
3. Probar casos edge

## 📧 Configuración de Email

### Gmail App Password:
1. Ve a tu cuenta de Google
2. Seguridad → Verificación en 2 pasos
3. Contraseñas de aplicaciones
4. Genera contraseña para "Autocontrol App"
5. Usa esa contraseña en EMAIL_PASS

¿Quieres que empecemos a implementar esto paso a paso?