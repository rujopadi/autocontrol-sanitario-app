
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Middleware para comprobar si el usuario es administrador
const adminAuth = async (req, res, next) => {
    try {
        // El superusuario "rujo" siempre tiene permisos de administrador
        if (req.user.id === 'superuser-rujo') {
            return next();
        }

        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor al verificar permisos.' });
    }
};

// @route   GET api/users
// @desc    Obtener todos los usuarios
// @access  Private (Admin)
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   POST api/users
// @desc    Crear un nuevo usuario
// @access  Private (Admin)
router.post('/', [auth, adminAuth], async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'El correo electrónico ya está en uso.' });
        }

        user = new User({ name, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        
        const userResponse = await User.findById(user.id).select('-password');
        res.status(201).json(userResponse);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   PUT api/users/:id
// @desc    Actualizar un usuario
// @access  Private (Admin)
router.put('/:id', [auth, adminAuth], async (req, res) => {
    const { name, email } = req.body;
    const userIdToEdit = req.params.id;

    // Un admin no puede editarse a sí mismo a través de esta ruta
    if (req.user.id === userIdToEdit) {
        return res.status(400).json({ message: 'Los administradores no pueden editar su propia cuenta desde este panel.' });
    }

    try {
        let user = await User.findById(userIdToEdit);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        
        // No se puede editar a otro admin
        if (user.isAdmin) {
             return res.status(400).json({ message: 'No se puede editar a otro administrador.' });
        }

        // Si el email ha cambiado, verificar que no esté en uso
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'El correo electrónico ya está en uso por otra cuenta.' });
            }
            user.email = email;
        }

        if (name) {
            user.name = name;
        }

        await user.save();

        const userResponse = await User.findById(user.id).select('-password');
        res.json(userResponse);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   DELETE api/users/:id
// @desc    Eliminar un usuario
// @access  Private (Admin)
router.delete('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        // No permitir que un admin se elimine a sí mismo o al primer admin
        if (user.isAdmin) {
             return res.status(400).json({ message: 'No se puede eliminar a un administrador.' });
        }
        await user.deleteOne();
        res.json({ message: 'Usuario eliminado.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

module.exports = router;