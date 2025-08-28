const express = require('express');
const router = express.Router();
const { auth, addTenantContext, requireRole } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const { getAuditLogs, getAuditStats } = require('../middleware/audit');

// Aplicar autenticación y contexto de tenant a todas las rutas
router.use(auth);
router.use(addTenantContext);

// @route   GET api/audit/logs
// @desc    Obtener logs de auditoría de la organización
// @access  Private (Admin only)
router.get('/logs', requireRole(['Admin']), validatePagination, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            userId,
            action,
            resource,
            dateFrom,
            dateTo,
            success
        } = req.query;

        // Construir filtros
        const filters = {
            limit: Math.min(parseInt(limit), 100) // Máximo 100 registros por página
        };
        
        if (userId) filters.userId = userId;
        if (action) filters.action = action;
        if (resource) filters.resource = resource;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;
        if (success !== undefined) filters.success = success === 'true';

        const logs = await getAuditLogs(req.tenantId, filters);

        // Calcular paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedLogs = logs.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            data: {
                logs: paginatedLogs,
                pagination: {
                    current: parseInt(page),
                    pages: Math.ceil(logs.length / parseInt(limit)),
                    total: logs.length,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo logs de auditoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   GET api/audit/stats
// @desc    Obtener estadísticas de auditoría
// @access  Private (Admin only)
router.get('/stats', requireRole(['Admin']), async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        
        const dateRange = {};
        if (dateFrom) dateRange.start = new Date(dateFrom);
        if (dateTo) dateRange.end = new Date(dateTo);

        const stats = await getAuditStats(req.tenantId, dateRange);

        res.json({
            success: true,
            data: stats[0] || {
                totalActions: 0,
                successfulActions: 0,
                failedActions: 0,
                uniqueUsersCount: 0,
                successRate: 0
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de auditoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   GET api/audit/actions
// @desc    Obtener lista de acciones disponibles para filtros
// @access  Private (Admin only)
router.get('/actions', requireRole(['Admin']), async (req, res) => {
    try {
        const actions = [
            'LOGIN', 'LOGOUT', 'REGISTER', 'PASSWORD_RESET',
            'CREATE', 'UPDATE', 'DELETE', 'VIEW',
            'INVITE_USER', 'REMOVE_USER', 'CHANGE_ROLE',
            'UPDATE_ORGANIZATION', 'EXPORT_DATA'
        ];

        res.json({
            success: true,
            data: actions
        });

    } catch (error) {
        console.error('Error obteniendo acciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// @route   GET api/audit/resources
// @desc    Obtener lista de recursos disponibles para filtros
// @access  Private (Admin only)
router.get('/resources', requireRole(['Admin']), async (req, res) => {
    try {
        const resources = [
            'Authentication',
            'User',
            'Organization',
            'DeliveryRecord',
            'StorageRecord',
            'TechnicalSheet',
            'Incident'
        ];

        res.json({
            success: true,
            data: resources
        });

    } catch (error) {
        console.error('Error obteniendo recursos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;