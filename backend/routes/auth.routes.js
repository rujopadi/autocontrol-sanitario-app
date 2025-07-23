
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

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
// @desc    Registrar un usuario
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Prevenir registro con el email de superusuario
    if (email.toLowerCase() === 'rujopadi@gmail.com') {
        return res.status(400).json({ message: 'Este correo electrónico está reservado.' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'El correo electrónico ya está en uso.' });
        }

        // El primer usuario registrado es admin
        const isFirstUser = (await User.countDocuments({})) === 0;

        user = new User({ name, email, password, isAdmin: isFirstUser });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.status(201).json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   POST api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Lógica para el superusuario
    if (email.toLowerCase() === 'rujopadi@gmail.com' && password === '222333222') {
        const payload = { user: { id: 'superuser-rujo' } };
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    }

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   GET api/auth
// @desc    Obtener datos del usuario logueado
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Devolver datos del superusuario si es el caso
        if (req.user.id === 'superuser-rujo') {
            return res.json({
                id: 'superuser-rujo',
                name: 'Super Usuario',
                email: 'rujopadi@gmail.com',
                isAdmin: true
            });
        }

        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

module.exports = router;