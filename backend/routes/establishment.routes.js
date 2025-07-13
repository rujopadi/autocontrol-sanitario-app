
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const EstablishmentInfo = require('../models/EstablishmentInfo');

// @route   GET api/establishment
// @desc    Obtener la información del establecimiento
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        let info = await EstablishmentInfo.findOne();
        if (!info) {
            // Si no existe, devuelve un objeto vacío para que el frontend no falle
            return res.json({ name: '', address: '', city: '', postalCode: '', sanitaryRegistry: '' });
        }
        res.json(info);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   POST api/establishment
// @desc    Crear o actualizar la información del establecimiento
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, address, city, postalCode, sanitaryRegistry } = req.body;
    const infoFields = { name, address, city, postalCode, sanitaryRegistry };

    try {
        let info = await EstablishmentInfo.findOne();
        if (info) {
            // Actualizar
            info = await EstablishmentInfo.findOneAndUpdate({}, { $set: infoFields }, { new: true });
            return res.json(info);
        }
        // Crear
        info = new EstablishmentInfo(infoFields);
        await info.save();
        res.status(201).json(info);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

module.exports = router;
