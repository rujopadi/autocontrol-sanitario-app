const express = require('express');
const router = express.Router();
const { auth, requireOrgAdmin, addTenantContext } = require('../middleware/auth-simple');
const { validateOrganizationUpdate, validateObjectId } = require('../middleware/validation');
const Organization = require('../models/Organization');
const User = require('../models/User');

// Aplicar autenticación a todas las rutas
router.use(auth);

// @route   GET api/organization
// @desc    Obtener información de la organización actual
// @access  Private
router.get('/', addTenantContext, async (req, res) => {
    try {
        const organization = await Organization.findById(req.user.organizationId)
            .populate('createdBy', 'name email')
            .select('-__v');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organización no encontrada'
            });
        }

        res.json({
            success: true,
            data: organization
        });

    } catch (error) {
        console.error('Error obteniendo organización:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   PUT api/organization
// @desc    Actualizar información de la organización
// @access  Private (Admin only)
router.put('/', requireOrgAdmin, validateOrganizationUpdate, async (req, res) => {
    try {
        const updateData = req.body;
        
        // Prevenir actualización de campos sensibles
        delete updateData._id;
        delete updateData.createdBy;
        delete updateData.subscription;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        const organization = await Organization.findByIdAndUpdate(
            req.user.organizationId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organización no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Organización actualizada exitosamente',
            data: organization
        });

    } catch (error) {
        console.error('Error actualizando organización:', error);
        
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

// @route   GET api/organization/users
// @desc    Obtener usuarios de la organización
// @access  Private (Admin only)
router.get('/users', requireOrgAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search, role, isActive } = req.query;
        
        // Construir filtros
        const filters = { organizationId: req.user.organizationId };
        
        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role) {
            filters.role = role;
        }
        
        if (isActive !== undefined) {
            filters.isActive = isActive === 'true';
        }

        // Paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [users, total] = await Promise.all([
            User.find(filters)
                .select('-password -emailVerificationToken -passwordResetToken')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(filters)
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   PUT api/organization/users/:userId
// @desc    Actualizar usuario de la organización
// @access  Private (Admin only)
router.put('/users/:userId', requireOrgAdmin, validateObjectId('userId'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, role, isActive } = req.body;

        // Verificar que el usuario pertenece a la organización
        const user = await User.findOne({
            _id: userId,
            organizationId: req.user.organizationId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Prevenir que un admin se desactive a sí mismo
        if (userId === req.user.id && isActive === false) {
            return res.status(400).json({
                success: false,
                message: 'No puedes desactivar tu propia cuenta'
            });
        }

        // Prevenir que se quede sin admins
        if (user.role === 'Admin' && role !== 'Admin') {
            const adminCount = await User.countDocuments({
                organizationId: req.user.organizationId,
                role: 'Admin',
                isActive: true,
                _id: { $ne: userId }
            });

            if (adminCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe haber al menos un administrador activo'
                });
            }
        }

        // Actualizar usuario
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password -emailVerificationToken -passwordResetToken');

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: updatedUser
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   DELETE api/organization/users/:userId
// @desc    Desactivar usuario de la organización
// @access  Private (Admin only)
router.delete('/users/:userId', requireOrgAdmin, validateObjectId('userId'), async (req, res) => {
    try {
        const { userId } = req.params;

        // Verificar que el usuario pertenece a la organización
        const user = await User.findOne({
            _id: userId,
            organizationId: req.user.organizationId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Prevenir que un admin se elimine a sí mismo
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propia cuenta'
            });
        }

        // Prevenir que se quede sin admins
        if (user.role === 'Admin') {
            const adminCount = await User.countDocuments({
                organizationId: req.user.organizationId,
                role: 'Admin',
                isActive: true,
                _id: { $ne: userId }
            });

            if (adminCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar el último administrador'
                });
            }
        }

        // Desactivar usuario en lugar de eliminarlo
        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'Usuario desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error desactivando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   GET api/organization/stats
// @desc    Obtener estadísticas de la organización
// @access  Private (Admin only)
router.get('/stats', requireOrgAdmin, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;

        const [
            totalUsers,
            activeUsers,
            adminUsers,
            organization
        ] = await Promise.all([
            User.countDocuments({ organizationId }),
            User.countDocuments({ organizationId, isActive: true }),
            User.countDocuments({ organizationId, role: 'Admin', isActive: true }),
            Organization.findById(organizationId)
        ]);

        const limits = organization.getLimits();
        
        const stats = {
            users: {
                total: totalUsers,
                active: activeUsers,
                admins: adminUsers,
                limit: limits.maxUsers,
                usage: Math.round((totalUsers / limits.maxUsers) * 100)
            },
            storage: {
                used: 0, // TODO: Calcular uso real de almacenamiento
                limit: limits.storageLimit,
                usage: 0
            },
            subscription: {
                plan: organization.subscription.plan,
                status: organization.subscription.status,
                expiresAt: organization.subscription.expiresAt,
                trialEndsAt: organization.subscription.trialEndsAt
            },
            organization: {
                createdAt: organization.createdAt,
                isActive: organization.isActive
            }
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;