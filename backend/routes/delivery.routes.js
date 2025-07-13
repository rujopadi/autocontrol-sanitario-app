
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DeliveryRecord = require('../models/DeliveryRecord');

// @route   GET api/records/delivery
// @desc    Obtener todos los registros de recepción
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const records = await DeliveryRecord.find().sort({ createdAt: -1 });
        res.json(records);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   POST api/records/delivery
// @desc    Crear un nuevo registro de recepción
// @access  Private
router.post('/', auth, async (req, res) => {
    const { supplierId, productTypeId, temperature, receptionDate, docsOk, albaranImage } = req.body;
    try {
        const newRecord = new DeliveryRecord({
            userId: req.user.id,
            supplierId,
            productTypeId,
            temperature,
            receptionDate,
            docsOk,
            albaranImage
        });
        const record = await newRecord.save();
        res.status(201).json(record);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

// @route   DELETE api/records/delivery/:id
// @desc    Eliminar un registro de recepción
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let record = await DeliveryRecord.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ message: 'Registro no encontrado.' });
        }
        await record.deleteOne();
        res.json({ message: 'Registro eliminado.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
});

module.exports = router;
