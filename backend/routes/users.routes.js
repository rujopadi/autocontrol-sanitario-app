
const express = require('express');
const router = express.Router();
const { auth, requireOrgAdmin, addTenantContext } = require('../middleware/auth');
const { validateUserInvitation, validateUserUpdate, validateObjectId } = require('../middleware/validation');
const User = require('../models/User');

// @route   GET api/users
// @desc    Obtener usuarios de la organización
// @access  Private (Admin)
router.get('/', auth, requireOrgAdmin, addTenantContext, async (req, res) => {
    try {
        const users = await User.find({ organizationId: req.tenantId })
            .select('-password -emailVerificationToken -passwordResetToken')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   POST api/users
// @desc    Crear/invitar un nuevo usuario a la organización
// @access  Private (Admin)
router.post('/', auth, requireOrgAdmin, validateUserInvitation, async (req, res) => {
    try {
        const { name, email, role = 'User' } = req.body;

        // Verificar si el usuario ya existe globalmente
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
        }

        // Crear usuario temporal (sin contraseña, requerirá activación)
        const user = new User({
            name,
            email,
            password: 'temp_password_' + Date.now(), // Temporal, se cambiará en activación
            organizationId: req.user.organizationId,
            role,
            isActive: false, // Inactivo hasta que complete el registro
            isEmailVerified: false,
            createdBy: req.user.id
        });

        // Generar token de verificación
        const emailToken = user.generateEmailVerificationToken();
        await user.save();

        // TODO: Enviar email de invitación
        // await sendInvitationEmail(user.email, emailToken, req.user.organization.name);

        const userResponse = await User.findById(user._id)
            .select('-password -emailVerificationToken -passwordResetToken')
            .populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Usuario invitado exitosamente',
            data: userResponse,
            // Solo para desarrollo
            devInvitationToken: process.env.NODE_ENV === 'development' ? emailToken : undefined
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   PUT api/users/:id
// @desc    Actualizar un usuario de la organización
// @access  Private (Admin)
router.put('/:id', auth, requireOrgAdmin, validateObjectId('id'), validateUserUpdate, async (req, res) => {
    try {
        const { name, role, isActive } = req.body;
        const userIdToEdit = req.params.id;

        // Verificar que el usuario pertenece a la organización
        const user = await User.findOne({
            _id: userIdToEdit,
            organizationId: req.user.organizationId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Prevenir que un admin se desactive a sí mismo
        if (userIdToEdit === req.user.id && isActive === false) {
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
                _id: { $ne: userIdToEdit }
            });

            if (adminCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe haber al menos un administrador activo'
                });
            }
        }

        // Actualizar campos
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(
            userIdToEdit,
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

// @route   DELETE api/users/:id
// @desc    Desactivar un usuario de la organización
// @access  Private (Admin)
router.delete('/:id', auth, requireOrgAdmin, validateObjectId('id'), async (req, res) => {
    try {
        const userIdToDelete = req.params.id;

        // Verificar que el usuario pertenece a la organización
        const user = await User.findOne({
            _id: userIdToDelete,
            organizationId: req.user.organizationId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Prevenir que un admin se elimine a sí mismo
        if (userIdToDelete === req.user.id) {
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
                _id: { $ne: userIdToDelete }
            });

            if (adminCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar el último administrador'
                });
            }
        }

        // Desactivar usuario en lugar de eliminarlo (soft delete)
        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'Usuario desactivado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;