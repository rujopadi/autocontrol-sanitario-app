
const express = require('express');
const router = express.Router();
const { auth, addTenantContext } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const DeliveryRecord = require('../models/DeliveryRecord');

// @route   GET api/records/delivery
// @desc    Obtener registros de recepción de la organización
// @access  Private
router.get('/', auth, addTenantContext, async (req, res) => {
    try {
        const records = await DeliveryRecord.find({ organizationId: req.tenantId })
            .sort({ createdAt: -1 })
            .populate('registeredById', 'name email');

        res.json({
            success: true,
            data: records
        });
    } catch (error) {
        console.error('Error obteniendo registros de recepción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   POST api/records/delivery
// @desc    Crear un nuevo registro de recepción
// @access  Private
router.post('/', auth, addTenantContext, async (req, res) => {
    try {
        const { 
            supplierId, 
            productTypeId, 
            temperature, 
            receptionDate, 
            docsOk, 
            albaranImage,
            registeredBy,
            registeredById 
        } = req.body;
        
        console.log('📥 Backend recibió registro de recepción:', {
            supplierId,
            productTypeId,
            temperature,
            receptionDate,
            docsOk,
            albaranImage: albaranImage ? `[Imagen de ${albaranImage.length} caracteres]` : 'Sin imagen',
            organizationId: req.tenantId
        });
        
        const newRecord = new DeliveryRecord({
            organizationId: req.tenantId,
            userId: req.user.id, // Mantener compatibilidad
            supplierId,
            productTypeId,
            temperature,
            receptionDate,
            docsOk,
            albaranImage,
            registeredBy: registeredBy || req.user.name,
            registeredById: registeredById || req.user.id,
            registeredAt: new Date().toISOString()
        });
        
        const record = await newRecord.save();
        
        console.log('💾 Registro guardado:', {
            id: record._id,
            organizationId: record.organizationId,
            albaranImage: record.albaranImage ? `[Imagen guardada]` : 'Sin imagen'
        });
        
        res.status(201).json({
            success: true,
            message: 'Registro de recepción creado exitosamente',
            data: record
        });
        
    } catch (error) {
        console.error('❌ Error creando registro de recepción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   DELETE api/records/delivery/:id
// @desc    Eliminar un registro de recepción de la organización
// @access  Private
router.delete('/:id', auth, addTenantContext, validateObjectId('id'), async (req, res) => {
    try {
        const record = await DeliveryRecord.findOne({
            _id: req.params.id,
            organizationId: req.tenantId
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Registro no encontrado'
            });
        }

        await record.deleteOne();
        
        res.json({
            success: true,
            message: 'Registro de recepción eliminado exitosamente'
        });
        
    } catch (error) {
        console.error('Error eliminando registro de recepción:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
