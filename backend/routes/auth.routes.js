
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { auth, generateToken, generateRefreshToken } = require('../middleware/auth-simple');
const { authLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { bruteForceProtection } = require('../middleware/security');
const { 
  validateUserRegistration, 
  validateLogin, 
  validatePasswordReset,
  validatePasswordResetConfirm 
} = require('../middleware/validation');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Middleware CORS para todas las rutas de auth
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// @route   POST api/auth/register
// @desc    Registrar un usuario y crear organización
// @access  Public
router.post('/register', registerLimiter, validateUserRegistration, async (req, res) => {
    try {
        const { name, email, password, organizationName } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'El correo electrónico ya está registrado' 
            });
        }

        // Crear la organización primero
        const orgName = organizationName || `${name}'s Organization`;
        const organization = new Organization({
            name: orgName,
            settings: {
                establishmentInfo: {
                    name: orgName
                }
            }
        });

        await organization.save();

        // Crear el usuario como admin de la organización
        const user = new User({
            name,
            email,
            password,
            organizationId: organization._id,
            role: 'Admin',
            isAdmin: true,
            isEmailVerified: false // En producción requerirá verificación
        });

        // Generar token de verificación de email
        const emailToken = user.generateEmailVerificationToken();
        await user.save();

        // Actualizar la organización con el creador
        organization.createdBy = user._id;
        await organization.save();

        // Generar tokens JWT
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // En desarrollo, marcar email como verificado automáticamente
        if (process.env.NODE_ENV === 'development') {
            user.isEmailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();
        }

        // TODO: Enviar email de verificación en producción
        // await sendVerificationEmail(user.email, emailToken);

        res.status(201).json({
            success: true,
            message: 'Usuario y organización creados exitosamente',
            data: {
                token,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    organizationId: organization._id,
                    organizationName: organization.name
                },
                requiresEmailVerification: !user.isEmailVerified
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// @route   POST api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', authLimiter, bruteForceProtection, validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario con organización
        const user = await User.findOne({ email })
            .populate('organizationId', 'name subdomain isActive subscription');

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Credenciales inválidas' 
            });
        }

        // Verificar que la organización esté activa
        if (!user.organizationId || !user.organizationId.isActive) {
            return res.status(403).json({ 
                success: false,
                message: 'Organización inactiva. Contacte con soporte.' 
            });
        }

        // Verificar contraseña (incluye manejo de intentos fallidos)
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Credenciales inválidas' 
            });
        }

        // Verificar que el usuario esté activo
        if (!user.isActive) {
            return res.status(403).json({ 
                success: false,
                message: 'Cuenta desactivada. Contacte con su administrador.' 
            });
        }

        // Generar tokens
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Actualizar último login
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: {
                token,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    organizationId: user.organizationId._id,
                    organizationName: user.organizationId.name,
                    lastLogin: user.lastLogin
                }
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        
        if (error.message.includes('bloqueada')) {
            return res.status(423).json({ 
                success: false,
                message: error.message 
            });
        }

        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// @route   GET api/auth
// @desc    Obtener datos del usuario logueado
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user
            }
        });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// @route   POST api/auth/forgot-password
// @desc    Solicitar reset de contraseña
// @access  Public
router.post('/forgot-password', passwordResetLimiter, validatePasswordReset, async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Por seguridad, siempre devolver éxito aunque el usuario no exista
            return res.json({
                success: true,
                message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
            });
        }

        // Generar token de reset
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // TODO: Enviar email con token de reset
        // await sendPasswordResetEmail(user.email, resetToken);

        // En desarrollo, devolver el token (SOLO PARA DESARROLLO)
        const responseData = {
            success: true,
            message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
        };

        if (process.env.NODE_ENV === 'development') {
            responseData.devToken = resetToken; // Solo para desarrollo
        }

        res.json(responseData);

    } catch (error) {
        console.error('Error en forgot password:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// @route   POST api/auth/reset-password
// @desc    Confirmar reset de contraseña
// @access  Public
router.post('/reset-password', validatePasswordResetConfirm, async (req, res) => {
    try {
        const { token, password } = req.body;

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false,
                message: 'Token inválido o expirado' 
            });
        }

        // Actualizar contraseña
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.loginAttempts = 0;
        user.lockUntil = undefined;

        await user.save();

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error en reset password:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// @route   POST api/auth/verify-email
// @desc    Verificar email del usuario
// @access  Public
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ 
                success: false,
                message: 'Token de verificación requerido' 
            });
        }

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                success: false,
                message: 'Token de verificación inválido o expirado' 
            });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save();

        res.json({
            success: true,
            message: 'Email verificado exitosamente'
        });

    } catch (error) {
        console.error('Error en verificación de email:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// @route   POST api/auth/refresh-token
// @desc    Refrescar token de acceso
// @access  Public
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ 
                success: false,
                message: 'Refresh token requerido' 
            });
        }

        // Verificar refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ 
                success: false,
                message: 'Token inválido' 
            });
        }

        // Buscar usuario
        const user = await User.findById(decoded.userId)
            .populate('organizationId', 'name subdomain isActive subscription');

        if (!user || !user.isActive || !user.organizationId?.isActive) {
            return res.status(401).json({ 
                success: false,
                message: 'Usuario o organización inactiva' 
            });
        }

        // Generar nuevo token de acceso
        const newToken = generateToken(user);

        res.json({
            success: true,
            data: {
                token: newToken
            }
        });

    } catch (error) {
        console.error('Error en refresh token:', error);
        res.status(401).json({ 
            success: false,
            message: 'Token inválido' 
        });
    }
});

module.exports = router;