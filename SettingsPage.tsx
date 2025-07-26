import React, { useState, useEffect } from 'react';
import { EstablishmentInfo, User } from './App';
import { useNotifications } from './NotificationContext';

interface SettingsPageProps {
    info: EstablishmentInfo;
    onUpdateInfo: (newInfo: EstablishmentInfo) => void;
    currentUser: User;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ info, onUpdateInfo, currentUser }) => {
    const { success, error, warning } = useNotifications();
    const [formState, setFormState] = useState<EstablishmentInfo>(info);
    const [isEditing, setIsEditing] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

    useEffect(() => {
        setFormState(info);
    }, [info]);

    // Validaciones
    const validateField = (name: string, value: string): string => {
        switch (name) {
            case 'name':
                return value.trim().length < 2 ? 'El nombre debe tener al menos 2 caracteres' : '';
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !emailRegex.test(value) ? 'Formato de email inválido' : '';
            case 'phone':
                const phoneRegex = /^[6-9]\d{8}$/;
                return !phoneRegex.test(value.replace(/\s/g, '')) ? 'Formato de teléfono inválido (9 dígitos)' : '';
            case 'cif':
                const cifRegex = /^[A-Z]\d{8}$|^\d{8}[A-Z]$/;
                return !cifRegex.test(value.toUpperCase()) ? 'Formato CIF/NIF inválido' : '';
            case 'sanitaryRegistry':
                return value.trim().length < 5 ? 'El registro sanitario debe tener al menos 5 caracteres' : '';
            case 'postalCode':
                const postalRegex = /^\d{5}$/;
                return !postalRegex.test(value) ? 'Código postal debe tener 5 dígitos' : '';
            default:
                return value.trim().length === 0 ? 'Este campo es obligatorio' : '';
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({
            ...prevState,
            [name]: value
        }));

        // Validación en tiempo real
        const errorMessage = validateField(name, value);
        setValidationErrors(prev => ({
            ...prev,
            [name]: errorMessage
        }));
    };

    const validateForm = (): boolean => {
        const errors: {[key: string]: string} = {};
        const requiredFields = ['name', 'address', 'city', 'postalCode', 'phone', 'email', 'cif', 'sanitaryRegistry', 'technicalResponsible'];
        
        requiredFields.forEach(field => {
            const value = formState[field as keyof EstablishmentInfo] as string;
            const errorMessage = validateField(field, value || '');
            if (errorMessage) {
                errors[field] = errorMessage;
            }
        });

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            warning('Errores de validación', 'Por favor, corrija los errores en el formulario.');
            return;
        }

        try {
            const updatedInfo = {
                ...formState,
                updatedAt: new Date().toISOString()
            };
            onUpdateInfo(updatedInfo);
            setIsEditing(false);
            success('Información actualizada', 'Los datos de la empresa se han guardado correctamente.');
        } catch (err) {
            error('Error al guardar', 'No se pudo guardar la información de la empresa.');
        }
    };

    // Verificar permisos de administrador
    if (!currentUser.isAdmin) {
        return (
            <div className="access-denied">
                <h1>Acceso Denegado</h1>
                <p>Solo los administradores pueden acceder a la configuración de la empresa.</p>
            </div>
        );
    }

    return (
        <>
            <h1>Gestión de Empresa</h1>
            <p style={{color: '#6c757d', marginBottom: '30px'}}>
                Configure la información completa de su empresa. Esta información se incluirá en todos los documentos PDF exportados.
            </p>

            {/* Vista de solo lectura */}
            {!isEditing && (
                <div className="card">
                    <div className="card-header">
                        <h2>Información de la Empresa</h2>
                        <button 
                            type="button" 
                            className="btn-secondary"
                            onClick={() => setIsEditing(true)}
                        >
                            Editar Información
                        </button>
                    </div>
                    <div className="company-info-display">
                        <div className="info-section">
                            <h3>Datos Básicos</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Nombre del Establecimiento</label>
                                    <span>{formState.name || 'No especificado'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Registro Sanitario</label>
                                    <span>{formState.sanitaryRegistry || 'No especificado'}</span>
                                </div>
                                <div className="info-item">
                                    <label>CIF/NIF</label>
                                    <span>{formState.cif || 'No especificado'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Responsable Técnico</label>
                                    <span>{formState.technicalResponsible || 'No especificado'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="info-section">
                            <h3>Dirección</h3>
                            <div className="info-grid">
                                <div className="info-item full-width">
                                    <label>Dirección</label>
                                    <span>{formState.address || 'No especificada'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Ciudad</label>
                                    <span>{formState.city || 'No especificada'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Código Postal</label>
                                    <span>{formState.postalCode || 'No especificado'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="info-section">
                            <h3>Contacto</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Teléfono</label>
                                    <span>{formState.phone || 'No especificado'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Email</label>
                                    <span>{formState.email || 'No especificado'}</span>
                                </div>
                            </div>
                        </div>

                        {formState.updatedAt && (
                            <div className="info-footer">
                                <small>Última actualización: {new Date(formState.updatedAt).toLocaleString('es-ES')}</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Formulario de edición */}
            {isEditing && (
                <div className="card">
                    <div className="card-header">
                        <h2>Editar Información de la Empresa</h2>
                        <button 
                            type="button" 
                            className="btn-secondary"
                            onClick={() => {
                                setIsEditing(false);
                                setFormState(info);
                                setValidationErrors({});
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        {/* Datos Básicos */}
                        <div className="form-section">
                            <h3>Datos Básicos</h3>
                            <div className="costing-form-grid">
                                <div className="form-group">
                                    <label htmlFor="name">Nombre del Establecimiento *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formState.name || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Carnicería Pepe"
                                        className={validationErrors.name ? 'error' : ''}
                                        required
                                    />
                                    {validationErrors.name && <span className="error-message">{validationErrors.name}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="sanitaryRegistry">Registro Sanitario *</label>
                                    <input
                                        type="text"
                                        id="sanitaryRegistry"
                                        name="sanitaryRegistry"
                                        value={formState.sanitaryRegistry || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: ES 10.12345/M CE"
                                        className={validationErrors.sanitaryRegistry ? 'error' : ''}
                                        required
                                    />
                                    {validationErrors.sanitaryRegistry && <span className="error-message">{validationErrors.sanitaryRegistry}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="cif">CIF/NIF *</label>
                                    <input
                                        type="text"
                                        id="cif"
                                        name="cif"
                                        value={formState.cif || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: A12345678 o 12345678Z"
                                        className={validationErrors.cif ? 'error' : ''}
                                        required
                                    />
                                    {validationErrors.cif && <span className="error-message">{validationErrors.cif}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="technicalResponsible">Responsable Técnico *</label>
                                    <input
                                        type="text"
                                        id="technicalResponsible"
                                        name="technicalResponsible"
                                        value={formState.technicalResponsible || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Juan Pérez García"
                                        className={validationErrors.technicalResponsible ? 'error' : ''}
                                        required
                                    />
                                    {validationErrors.technicalResponsible && <span className="error-message">{validationErrors.technicalResponsible}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Dirección */}
                        <div className="form-section">
                            <h3>Dirección</h3>
                            <div className="form-group">
                                <label htmlFor="address">Dirección Completa *</label>
                                <input
                                    type="text"
                                    id="address"
                                    name="address"
                                    value={formState.address || ''}
                                    onChange={handleChange}
                                    placeholder="Ej: Calle Mayor, 123, 2º A"
                                    className={validationErrors.address ? 'error' : ''}
                                    required
                                />
                                {validationErrors.address && <span className="error-message">{validationErrors.address}</span>}
                            </div>
                            <div className="costing-form-grid">
                                <div className="form-group">
                                    <label htmlFor="city">Ciudad *</label>
                                    <input
                                        type="text"
                                        id="city"
                                        name="city"
                                        value={formState.city || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Madrid"
                                        className={validationErrors.city ? 'error' : ''}
                                        required
                                    />
                                    {validationErrors.city && <span className="error-message">{validationErrors.city}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="postalCode">Código Postal *</label>
                                    <input
                                        type="text"
                                        id="postalCode"
                                        name="postalCode"
                                        value={formState.postalCode || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 28001"
                                        className={validationErrors.postalCode ? 'error' : ''}
                                        maxLength={5}
                                        required
                                    />
                                    {validationErrors.postalCode && <span className="error-message">{validationErrors.postalCode}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Contacto */}
                        <div className="form-section">
                            <h3>Información de Contacto</h3>
                            <div className="costing-form-grid">
                                <div className="form-group">
                                    <label htmlFor="phone">Teléfono *</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formState.phone || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: 612345678"
                                        className={validationErrors.phone ? 'error' : ''}
                                        required
                                    />
                                    {validationErrors.phone && <span className="error-message">{validationErrors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email *</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formState.email || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: info@miempresa.com"
                                        className={validationErrors.email ? 'error' : ''}
                                        required
                                    />
                                    {validationErrors.email && <span className="error-message">{validationErrors.email}</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="form-actions">
                            <button type="submit" className="btn-submit">
                                Guardar Cambios
                            </button>
                            <button 
                                type="button" 
                                className="btn-secondary"
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormState(info);
                                    setValidationErrors({});
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default SettingsPage;
