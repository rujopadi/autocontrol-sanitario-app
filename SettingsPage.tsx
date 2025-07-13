import React, { useState, useEffect } from 'react';
import { EstablishmentInfo } from './App';

interface SettingsPageProps {
    info: EstablishmentInfo;
    onUpdateInfo: (newInfo: EstablishmentInfo) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ info, onUpdateInfo }) => {
    const [formState, setFormState] = useState<EstablishmentInfo>(info);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setFormState(info);
    }, [info]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateInfo(formState);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000); // Ocultar mensaje tras 3 segundos
    };

    return (
        <>
            <h1>Configuración del Establecimiento</h1>
            <p style={{color: '#6c757d', marginBottom: '30px'}}>
                La información introducida aquí, como el número de registro sanitario, se incluirá en la cabecera de los documentos PDF que exporte.
            </p>
            <div className="card">
                <h2>Datos del Negocio</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Nombre del establecimiento</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formState.name}
                            onChange={handleChange}
                            placeholder="Ej: Carnicería Pepe"
                            required
                        />
                    </div>
                     <div className="form-group">
                        <label htmlFor="sanitaryRegistry">Número de Registro Sanitario</label>
                        <input
                            type="text"
                            id="sanitaryRegistry"
                            name="sanitaryRegistry"
                            value={formState.sanitaryRegistry}
                            onChange={handleChange}
                            placeholder="Ej: ES 10.12345/M CE"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="address">Dirección</label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            value={formState.address}
                            onChange={handleChange}
                            placeholder="Ej: Calle Mayor, 1"
                            required
                        />
                    </div>
                    <div className="costing-form-grid">
                        <div className="form-group">
                            <label htmlFor="city">Ciudad</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formState.city}
                                onChange={handleChange}
                                placeholder="Ej: Madrid"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="postalCode">Código Postal</label>
                            <input
                                type="text"
                                id="postalCode"
                                name="postalCode"
                                value={formState.postalCode}
                                onChange={handleChange}
                                placeholder="Ej: 28001"
                                required
                            />
                        </div>
                    </div>
                    
                    <button type="submit" className="btn-submit">
                        Guardar Cambios
                    </button>
                    {isSaved && <p style={{color: 'var(--success-color)', marginTop: '15px', fontWeight: '500'}}>¡Información guardada correctamente!</p>}
                </form>
            </div>
        </>
    );
};

export default SettingsPage;
