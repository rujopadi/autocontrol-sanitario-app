
import React, { useState, useMemo, useEffect } from 'react';
import { exportToPDF, exportToExcel } from './exportUtils';
import { User, Supplier, ProductType, DeliveryRecord, EstablishmentInfo } from './App';
import { useNotifications } from './NotificationContext';

interface ReceptionPageProps {
    users: User[];
    suppliers: Supplier[];
    productTypes: ProductType[];
    records: DeliveryRecord[];
    onAddSupplier: (name: string) => void;
    onDeleteSupplier: (id: string) => void;
    onAddProductType: (name: string, temp: number) => void;
    onDeleteProductType: (id: string) => void;
    onAddRecord: (record: Omit<DeliveryRecord, 'id' | 'userId'>) => void;
    onDeleteRecord: (id: string) => void;
    establishmentInfo: EstablishmentInfo;
}


const ReceptionPage: React.FC<ReceptionPageProps> = ({
    users, suppliers, productTypes, records,
    onAddSupplier, onDeleteSupplier, onAddProductType, onDeleteProductType, onAddRecord, onDeleteRecord, establishmentInfo
}) => {
    const { warning, success } = useNotifications();
    // UI State
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [isReceptionFormOpen, setIsReceptionFormOpen] = useState(true);
    const [isSupplierSectionOpen, setIsSupplierSectionOpen] = useState(false);
    const [isProductSectionOpen, setIsProductSectionOpen] = useState(false);
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Form state: New Supplier
    const [newSupplierName, setNewSupplierName] = useState('');

    // Form state: New Product Type
    const [newProductName, setNewProductName] = useState('');
    const [newProductTemp, setNewProductTemp] = useState('');
    
    // Form state: New Record
    const [recordSupplier, setRecordSupplier] = useState<string>('');
    const [recordProductType, setRecordProductType] = useState<string>('');
    const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
    const [recordTemp, setRecordTemp] = useState('');
    const [recordDocs, setRecordDocs] = useState(true);
    const [recordAlbaranImage, setRecordAlbaranImage] = useState<string | null>(null);


    // Derived data for display
    const suppliersMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
    const productTypesMap = useMemo(() => new Map(productTypes.map(p => [p.id, p])), [productTypes]);
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            if (!startDate && !endDate) return true;
            const recordDate = new Date(record.receptionDate);
            if (startDate && new Date(startDate) > recordDate) return false;
            if (endDate && new Date(endDate) > recordDate) return false;
            return true;
        }).sort((a, b) => new Date(b.receptionDate).getTime() - new Date(a.receptionDate).getTime());
    }, [records, startDate, endDate]);

    // Update form values when suppliers/productTypes change
    useEffect(() => {
        if (suppliers.length > 0 && !recordSupplier) {
            setRecordSupplier(suppliers[0].id);
        }
    }, [suppliers, recordSupplier]);

    useEffect(() => {
        if (productTypes.length > 0 && !recordProductType) {
            setRecordProductType(productTypes[0].id);
        }
    }, [productTypes, recordProductType]);

    // Handlers: Supplier
    const handleAddSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSupplierName.trim()) { 
            warning('Campo requerido', 'El nombre del proveedor no puede estar vacío.'); 
            return; 
        }
        onAddSupplier(newSupplierName.trim());
        setNewSupplierName('');
        success('Proveedor añadido', `El proveedor "${newSupplierName.trim()}" se ha añadido correctamente.`);
    };
    const handleDeleteSupplier = (id: string) => {
        if (window.confirm('¿Eliminar proveedor? Sus registros asociados no se eliminarán pero el nombre aparecerá como "N/A".')) {
            onDeleteSupplier(id);
        }
    };

    // Handlers: Product Type
    const handleAddProductType = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProductName.trim() || !newProductTemp.trim()) { 
            warning('Campos requeridos', 'Complete todos los campos del tipo de producto.'); 
            return; 
        }
        onAddProductType(newProductName.trim(), parseFloat(newProductTemp));
        setNewProductName('');
        setNewProductTemp('');
        success('Tipo de producto añadido', `El tipo "${newProductName.trim()}" se ha añadido correctamente.`);
    };
    const handleDeleteProductType = (id: string) => {
         if (window.confirm('¿Eliminar tipo de producto? Sus registros asociados no se eliminarán pero el nombre aparecerá como "N/A".')) {
            onDeleteProductType(id);
        }
    };

    // Handlers: Record
    const handleAddRecord = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Debug logging
        console.log('🔍 Validando campos:', {
            recordSupplier,
            recordProductType,
            recordTemp: recordTemp.trim(),
            recordDate,
            recordDocs,
            hasImage: !!recordAlbaranImage
        });
        
        if (!recordSupplier || !recordProductType || !recordTemp.trim()) {
            warning('Campos requeridos', 'Por favor, complete todos los campos del registro.'); 
            return;
        }
        
        const recordData = {
            supplierId: recordSupplier,
            productTypeId: recordProductType,
            temperature: recordTemp,
            receptionDate: recordDate,
            docsOk: recordDocs,
            albaranImage: recordAlbaranImage || undefined,
        };
        
        console.log('📝 Enviando registro:', recordData);
        
        try {
            onAddRecord(recordData);
            // Reset part of the form
            setRecordTemp('');
            setRecordDocs(true);
            setRecordAlbaranImage(null);
            success('Registro guardado', 'El registro de recepción se ha guardado correctamente.');
        } catch (error) {
            console.error('❌ Error al guardar:', error);
            warning('Error', 'No se pudo guardar el registro.');
        }
    };

    const handleDeleteRecord = (id: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este registro?')) {
            onDeleteRecord(id);
        }
    };

    const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Verificar tamaño del archivo (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                warning('Archivo muy grande', 'La imagen debe ser menor a 5MB.');
                return;
            }
            
            console.log('📷 Procesando imagen:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                console.log('✅ Imagen procesada, tamaño:', result.length);
                setRecordAlbaranImage(result);
                success('Imagen capturada', 'La foto del albarán se ha capturado correctamente.');
            };
            reader.onerror = () => {
                console.error('❌ Error al leer imagen');
                warning('Error', 'No se pudo procesar la imagen.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExportPDF = () => {
        const headers = ["Fecha", "Proveedor", "Producto", "Temp. Recibida", "Docs OK", "Usuario"];
        const data = filteredRecords.map(r => {
            const product = productTypesMap.get(r.productTypeId);
            return [
                new Date(r.receptionDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
                suppliersMap.get(r.supplierId) || 'N/A',
                product?.name || 'N/A',
                `${r.temperature}°C`,
                r.docsOk ? 'Sí' : 'No',
                usersMap.get(r.userId) || 'N/A'
            ];
        });
        exportToPDF("Historial de Recepciones", headers, data, "historial_recepciones", establishmentInfo);
    };

    const handleExportExcel = () => {
        const data = filteredRecords.map(r => {
            const product = productTypesMap.get(r.productTypeId);
            return {
                "Fecha": new Date(r.receptionDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
                "Proveedor": suppliersMap.get(r.supplierId) || 'N/A',
                "Producto": product?.name || 'N/A',
                "Temperatura Recibida (°C)": r.temperature,
                "Temperatura Óptima (°C)": product?.optimalTemp || 'N/A',
                "Documentación OK": r.docsOk ? 'Sí' : 'No',
                "Usuario": usersMap.get(r.userId) || 'N/A',
                "Foto Albarán": r.albaranImage ? 'Sí' : 'No'
            };
        });
        exportToExcel(data, "historial_recepciones");
    };


    return (
        <>
            <h1>Recepción y Transporte</h1>
            <div className="reception-grid">
                <div className="card">
                    <h2 
                        className="collapsible-header" 
                        onClick={() => setIsReceptionFormOpen(!isReceptionFormOpen)}
                        role="button"
                        aria-expanded={isReceptionFormOpen}
                    >
                        Registrar Recepción
                        <span className={`chevron ${isReceptionFormOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isReceptionFormOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner">
                            <form onSubmit={handleAddRecord}>
                                <div className="form-group">
                                    <label htmlFor="rec-supplier">Proveedor</label>
                                    <select id="rec-supplier" value={recordSupplier} onChange={e => setRecordSupplier(e.target.value)} required disabled={suppliers.length === 0}>
                                        {suppliers.length === 0 ? <option>Cree un proveedor</option> : suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="rec-product">Tipo de producto</label>
                                    <select id="rec-product" value={recordProductType} onChange={e => setRecordProductType(e.target.value)} required disabled={productTypes.length === 0}>
                                        {productTypes.length === 0 ? <option>Cree un tipo de producto</option> : productTypes.map(p => <option key={p.id} value={p.id}>{p.name} (Óptima: {p.optimalTemp}°C)</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="rec-date">Fecha de Recepción</label>
                                    <input type="date" id="rec-date" value={recordDate} onChange={e => setRecordDate(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="rec-temp">Temperatura de Entrega (°C)</label>
                                    <input type="number" step="0.1" id="rec-temp" value={recordTemp} onChange={e => setRecordTemp(e.target.value)} placeholder="Ej: 3.5" required />
                                </div>
                                <div className="form-group-checkbox">
                                    <input type="checkbox" id="rec-docs" checked={recordDocs} onChange={e => setRecordDocs(e.target.checked)} />
                                    <label htmlFor="rec-docs">Documentación de acompañamiento correcta</label>
                                </div>
                                <div className="form-group">
                                    <label>Foto del Albarán</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        onChange={handleImageCapture} 
                                        style={{ display: 'none' }} 
                                        id="albaran-camera-input" 
                                    />
                                    <button type="button" className="btn-secondary" onClick={() => document.getElementById('albaran-camera-input')?.click()}>
                                        Hacer Foto del Albarán
                                    </button>
                                    {recordAlbaranImage && (
                                        <div className="image-preview">
                                            <img src={recordAlbaranImage} alt="Vista previa del albarán" />
                                            <button type="button" onClick={() => setRecordAlbaranImage(null)}>Eliminar Foto</button>
                                        </div>
                                    )}
                                </div>
                                <button type="submit" className="btn-submit" disabled={suppliers.length === 0 || productTypes.length === 0}>
                                    Guardar Registro
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="management-section">
                        <h2 
                            className="collapsible-header" 
                            onClick={() => setIsSupplierSectionOpen(!isSupplierSectionOpen)}
                            role="button"
                            aria-expanded={isSupplierSectionOpen}
                        >
                            Gestionar Proveedores
                            <span className={`chevron ${isSupplierSectionOpen ? 'open' : ''}`}>&#9660;</span>
                        </h2>
                        <div className={`collapsible-content ${isSupplierSectionOpen ? 'open' : ''}`}>
                            <div className="collapsible-content-inner">
                                <form onSubmit={handleAddSupplier}>
                                    <div className="form-group">
                                        <label htmlFor="new-supplier-name">Nombre del proveedor</label>
                                        <input type="text" id="new-supplier-name" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Ej: Carnes del Sur" required />
                                    </div>
                                    <button type="submit" className="btn-submit">Añadir Proveedor</button>
                                </form>
                                <div className="units-list">
                                    <h3>Proveedores Existentes</h3>
                                    {suppliers.length > 0 ? suppliers.map(s => (
                                        <div key={s.id} className="units-list-item">
                                            <span>{s.name}</span>
                                            <button className="btn-delete" onClick={() => handleDeleteSupplier(s.id)}>Eliminar</button>
                                        </div>
                                    )) : <p>No hay proveedores.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="management-section">
                        <h2 
                            className="collapsible-header" 
                            onClick={() => setIsProductSectionOpen(!isProductSectionOpen)}
                            role="button"
                            aria-expanded={isProductSectionOpen}
                        >
                            Gestionar Tipos de Género
                            <span className={`chevron ${isProductSectionOpen ? 'open' : ''}`}>&#9660;</span>
                        </h2>
                        <div className={`collapsible-content ${isProductSectionOpen ? 'open' : ''}`}>
                            <div className="collapsible-content-inner">
                                <form onSubmit={handleAddProductType}>
                                    <div className="form-group">
                                        <label htmlFor="new-product-name">Nombre del producto</label>
                                        <input type="text" id="new-product-name" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Ej: Chorizo" required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="new-product-temp">Temperatura Óptima (°C)</label>
                                        <input type="number" step="0.1" id="new-product-temp" value={newProductTemp} onChange={e => setNewProductTemp(e.target.value)} placeholder="Ej: 4" required />
                                    </div>
                                    <button type="submit" className="btn-submit">Añadir Tipo</button>
                                </form>
                                <div className="units-list">
                                    <h3>Tipos Existentes</h3>
                                    {productTypes.length > 0 ? productTypes.map(p => (
                                        <div key={p.id} className="units-list-item">
                                            <div>
                                                <span>{p.name}</span>
                                                <span className="product-type-temp">Óptima: {p.optimalTemp}°C</span>
                                            </div>
                                            <button className="btn-delete" onClick={() => handleDeleteProductType(p.id)}>Eliminar</button>
                                        </div>
                                    )) : <p>No hay tipos de género.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Historial de Recepciones</h2>
                 <div className="export-controls-container">
                     <h3>Exportar Registros</h3>
                     <div className="export-controls-row">
                        <div className="form-group">
                            <label htmlFor="start-date">Fecha de Inicio</label>
                            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                         <div className="form-group">
                            <label htmlFor="end-date">Fecha de Fin</label>
                            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className="export-buttons">
                            <button className="btn-export btn-pdf" onClick={handleExportPDF} disabled={filteredRecords.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                PDF
                            </button>
                            <button className="btn-export btn-excel" onClick={handleExportExcel} disabled={filteredRecords.length === 0}>
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                Excel
                            </button>
                        </div>
                     </div>
                </div>
                {filteredRecords.length > 0 ? (
                    <div style={{overflowX: 'auto'}}>
                        <table className="user-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Producto</th>
                                    <th>Temp.</th>
                                    <th>Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                            {filteredRecords.map(record => {
                                const isExpanded = expandedRecordId === record.id;
                                const product = productTypesMap.get(record.productTypeId);
                                const supplierName = suppliersMap.get(record.supplierId) || 'N/A';
                                const userName = usersMap.get(record.userId) || 'N/A';
                                const formattedDate = new Date(record.receptionDate).toLocaleDateString('es-ES', { timeZone: 'UTC' });
                                
                                const temp = parseFloat(record.temperature);
                                let tempClass = '';
                                if(product && temp > product.optimalTemp) {
                                    tempClass = 'danger';
                                }

                                return (
                                <React.Fragment key={record.id}>
                                    <tr 
                                        className="summary-row" 
                                        onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                                        aria-expanded={isExpanded}
                                    >
                                        <td data-label="Fecha">{formattedDate}</td>
                                        <td data-label="Producto">{product?.name || 'N/A'}</td>
                                        <td data-label="Temp." className={tempClass}>{record.temperature}°C</td>
                                        <td data-label="Detalles" className="expand-cell">
                                            <span className="expand-indicator">{isExpanded ? 'Ocultar' : 'Ver'}</span>
                                            <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="detail-row">
                                            <td colSpan={4}>
                                                <div className="record-details">
                                                    <div><strong>Proveedor</strong><span>{supplierName}</span></div>
                                                    <div><strong>Temp. Óptima</strong><span>{product?.optimalTemp}°C</span></div>
                                                    <div><strong>Docs OK</strong><span className={record.docsOk ? 'check-icon' : 'cross-icon'}>{record.docsOk ? '✓' : '✗'}</span></div>
                                                    <div><strong>Usuario</strong><span>{userName}</span></div>
                                                    <div className="detail-actions">
                                                        <strong>Acciones</strong>
                                                        <div>
                                                            {record.albaranImage && <button className="btn-view-photo" onClick={() => setViewingImage(record.albaranImage!)}>Ver Foto Albarán</button>}
                                                            <button className="btn-delete" onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                ) : <p>No hay registros para el rango de fechas seleccionado.</p>}
            </div>

            {viewingImage && (
                <div className="image-modal-overlay" onClick={() => setViewingImage(null)}>
                    <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                        <img src={viewingImage} alt="Albarán de recepción" />
                        <button onClick={() => setViewingImage(null)}>Cerrar</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReceptionPage;
