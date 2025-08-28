
const express = require('express');
const router = express.Router();
const { auth, addTenantContext } = require('../middleware/auth');
const Organization = require('../models/Organization');

// @route   GET api/establishment
// @desc    Obtener la información del establecimiento de la organización
// @access  Private
router.get('/', auth, addTenantContext, async (req, res) => {
    try {
        const organization = await Organization.findById(req.tenantId);
        
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organización no encontrada'
            });
        }

        // Devolver la información del establecimiento desde la organización
        const establishmentInfo = organization.settings?.establishmentInfo || {
            name: '',
            address: '',
            city: '',
            postalCode: '',
            phone: '',
            email: '',
            cif: '',
            sanitaryRegistry: '',
            technicalResponsible: ''
        };

        res.json({
            success: true,
            data: establishmentInfo
        });
    } catch (error) {
        console.error('Error obteniendo información del establecimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   POST api/establishment
// @desc    Actualizar la información del establecimiento de la organización
// @access  Private
router.post('/', auth, addTenantContext, async (req, res) => {
    try {
        const { 
            name, 
            address, 
            city, 
            postalCode, 
            phone, 
            email, 
            cif, 
            sanitaryRegistry, 
            technicalResponsible 
        } = req.body;

        const establishmentInfo = {
            name,
            address,
            city,
            postalCode,
            phone,
            email,
            cif,
            sanitaryRegistry,
            technicalResponsible
        };

        // Actualizar la información del establecimiento en la organización
        const organization = await Organization.findByIdAndUpdate(
            req.tenantId,
            { 
                $set: { 
                    'settings.establishmentInfo': establishmentInfo 
                } 
            },
            { new: true, runValidators: true }
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organización no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Información del establecimiento actualizada exitosamente',
            data: organization.settings.establishmentInfo
        });

    } catch (error) {
        console.error('Error actualizando información del establecimiento:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
