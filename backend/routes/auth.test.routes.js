/**
 * Simplified Auth Routes for Testing
 * Removes rate limiting and complex middleware for test environment
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { auth, generateToken, generateRefreshToken } = require('../middleware/auth-simple');
const { mockEmailService } = require('../middleware/test-middleware');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Simple validation middleware for tests
const validateRegistration = (req, res, next) => {
  const { name, email, password, organizationName } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push({ field: 'name', message: 'El nombre es requerido y debe tener al menos 2 caracteres' });
  }

  if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    errors.push({ field: 'email', message: 'Email inválido' });
  }

  if (!password || password.length < 8) {
    errors.push({ field: 'password', message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  if (!organizationName || organizationName.trim().length < 2) {
    errors.push({ field: 'organizationName', message: 'El nombre de la organización es requerido' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push({ field: 'email', message: 'El email es requerido' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'La contraseña es requerida' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors
    });
  }

  next();
};

// @route   POST api/auth/register
// @desc    Register user and create organization (simplified for testing)
// @access  Public
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password, organizationName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'El correo electrónico ya existe' 
      });
    }

    // Create organization first
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

    // Create user as admin of the organization
    const user = new User({
      name,
      email,
      password,
      organizationId: organization._id,
      role: 'Admin',
      isAdmin: true,
      isEmailVerified: true // Auto-verify for registration in test environment
    });

    await user.save();

    // Update organization with creator
    organization.createdBy = user._id;
    await organization.save();

    // Generate JWT tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          organizationId: organization._id
        },
        organization: {
          id: organization._id,
          name: organization.name,
          subdomain: organization.subdomain
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user and get token (simplified for testing)
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with organization
    const user = await User.findOne({ email })
      .populate('organizationId', 'name subdomain isActive subscription');

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Credenciales inválidas' 
      });
    }

    // Check if organization is active
    if (!user.organizationId || !user.organizationId.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Organización inactiva' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: 'Cuenta desactivada' 
      });
    }

    // Check if email is verified (allow testing of unverified emails)
    if (!user.isEmailVerified) {
      return res.status(401).json({ 
        success: false,
        message: 'Debes verificar tu email antes de iniciar sesión' 
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Credenciales inválidas' 
      });
    }

    // Generate tokens (use the organization ID, not the populated object)
    const userForToken = {
      ...user.toObject(),
      organizationId: user.organizationId._id
    };
    const token = generateToken(userForToken);
    const refreshToken = generateRefreshToken(userForToken);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          organizationId: user.organizationId._id
        },
        organization: {
          id: user.organizationId._id,
          name: user.organizationId.name,
          subdomain: user.organizationId.subdomain
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// @route   POST api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }

    const user = await User.findOne({ email });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send email (mocked in test environment)
    await mockEmailService.sendEmail({
      to: user.email,
      subject: 'Restablecer contraseña',
      text: `Tu token de restablecimiento es: ${resetToken}`
    });

    res.json({
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: [
          { field: 'token', message: 'Token es requerido' },
          { field: 'password', message: 'Contraseña es requerida' }
        ]
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: [
          { field: 'password', message: 'La contraseña debe tener al menos 8 caracteres' }
        ]
      });
    }

    // Find user with valid reset token
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

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

module.exports = router;