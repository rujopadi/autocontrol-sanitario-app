
import React, { useState, useMemo } from 'react';
import { exportToPDF, exportToExcel } from './exportUtils';
import { User, OutgoingRecord, ElaboratedRecord, EstablishmentInfo } from './App';
import { useNotifications } from './NotificationContext';
import UserSelector from './components/UserSelector';

// --- Estados de Formulario ---
type OutgoingFormState = {
    productName: string;
    quantity: string;
    lotIdentifier: string;
    destinationType: 'sucursal' | 'consumidor';
    destination: string;
    date: string;
    userId: string;
}

type ElaboratedFormState = {
    productName: string;
    elaborationDate: string;
    ingredients: {
        name: string;
        supplier: string;
        lot: string;
        quantity: string;
    }[];
    productLot: string;
    destination: string;
    quantitySent: string;
    userId: string;
}

interface TraceabilityPageProps {
    users: User[];
    outgoingRecords: OutgoingRecord[];
    elaboratedRecords: ElaboratedRecord[];
    onAddOutgoingRecord: (record: Omit<OutgoingRecord, 'id'>) => void;
    onDeleteOutgoing: (id: string) => void;
    onAddElaboratedRecord: (record: Omit<ElaboratedRecord, 'id'>) => void;
    onDeleteElaborated: (id: string) => void;
    establishmentInfo: EstablishmentInfo;
}


// --- Componente ---
const TraceabilityPage: React.FC<TraceabilityPageProps> = ({
    users, outgoingRecords, elaboratedRecords, 
    onAddOutgoingRecord, onDeleteOutgoing, onAddElaboratedRecord, onDeleteElaborated,
    establishmentInfo
}) => {
    const { warning, success } = useNotifications();
    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    // Estados colapsables
    const [isOutgoingFormOpen, setIsOutgoingFormOpen] = useState(true);
    const [isElaboratedFormOpen, setIsElaboratedFormOpen] = useState(false);
    const [expandedOutgoingId, setExpandedOutgoingId] = useState<string | null>(null);
    const [expandedElaboratedId, setExpandedElaboratedId] = useState<string | null>(null);

    // Estado para sección de Salidas
    const [outgoingForm, setOutgoingForm] = useState<OutgoingFormState>({
        productName: '', quantity: '', lotIdentifier: '', destinationType: 'consumidor', destination: '', date: new Date().toISOString().slice(0,10), userId: users.length > 0 ? String(users[0].id) : ''
    });
    const [outgoingStartDate, setOutgoingStartDate] = useState('');
    const [outgoingEndDate, setOutgoingEndDate] = useState('');

    // Estado para sección de Elaborados
    const [elaboratedForm, setElaboratedForm] = useState<ElaboratedFormState>({
        productName: '', elaborationDate: new Date().toISOString().slice(0,10), ingredients: [{name: '', supplier: '', lot: '', quantity: ''}], productLot: '', destination: '', quantitySent: '', userId: users.length > 0 ? String(users[0].id) : ''
    });
    const [elaboratedStartDate, setElaboratedStartDate] = useState('');
    const [elaboratedEndDate, setElaboratedEndDate] = useState('');

    // Estados para trazabilidad
    const [registeredById, setRegisteredById] = useState('');
    const [registeredBy, setRegisteredBy] = useState('');

    // Obtener usuarios de la empresa
    const companyUsers = users.filter(user => user.companyId === establishmentInfo.id);


    // --- Lógica de Filtrado ---
    const filteredOutgoingRecords = useMemo(() => {
        return outgoingRecords.filter(record => {
            if (!outgoingStartDate && !outgoingEndDate) return true;
            const recordDate = new Date(record.date);
            if (outgoingStartDate && new Date(outgoingStartDate) > recordDate) return false;
            if (outgoingEndDate && new Date(outgoingEndDate) > recordDate) return false;
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [outgoingRecords, outgoingStartDate, outgoingEndDate]);

    const filteredElaboratedRecords = useMemo(() => {
        return elaboratedRecords.filter(record => {
            if (!elaboratedStartDate && !elaboratedEndDate) return true;
            const recordDate = new Date(record.elaborationDate);
            if (elaboratedStartDate && new Date(elaboratedStartDate) > recordDate) return false;
            if (elaboratedEndDate && new Date(elaboratedEndDate) > recordDate) return false;
            return true;
        }).sort((a, b) => new Date(b.elaborationDate).getTime() - new Date(a.elaborationDate).getTime());
    }, [elaboratedRecords, elaboratedStartDate, elaboratedEndDate]);


    // --- Handlers para Salidas ---
    const handleOutgoingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!outgoingForm.productName || !outgoingForm.quantity || !outgoingForm.lotIdentifier || !outgoingForm.destination || !outgoingForm.userId) {
            warning('Campos requeridos', 'Por favor, complete todos los campos de salida.');
            return;
        }
        onAddOutgoingRecord({
            ...outgoingForm,
            userId: outgoingForm.userId,
            registeredBy,
            registeredById,
            registeredAt: new Date().toISOString()
        });

        // Mostrar notificación de éxito
        success('Registro guardado correctamente', 'El registro de salida se ha guardado exitosamente.');

        // Resetear formulario
        setOutgoingForm({ productName: '', quantity: '', lotIdentifier: '', destinationType: 'consumidor', destination: '', date: new Date().toISOString().slice(0,10), userId: outgoingForm.userId });
        setRegisteredBy('');
        setRegisteredById('');
    };

    const handleOutgoingChange = (field: keyof OutgoingFormState, value: any) => {
        setOutgoingForm(prev => ({...prev, [field]: value}));
    };

    const handleDeleteOutgoing = (id: string) => {
        if(window.confirm('¿Eliminar este registro de salida?')) {
            onDeleteOutgoing(id);
        }
    };
    
    const handleExportOutgoingPDF = () => {
        const headers = ["Fecha", "Producto", "Lote/ID", "Cantidad", "Destino", "Tipo Destino", "Usuario"];
        const data = filteredOutgoingRecords.map(r => [
            new Date(r.date).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
            r.productName,
            r.lotIdentifier,
            r.quantity,
            r.destination,
            r.destinationType,
            usersMap.get(r.userId) || 'N/A'
        ]);
        exportToPDF("Historial de Salidas", headers, data, "historial_salidas", establishmentInfo);
    };

    const handleExportOutgoingExcel = () => {
        const data = filteredOutgoingRecords.map(r => ({
            "Fecha": new Date(r.date).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
            "Producto": r.productName,
            "Lote/ID": r.lotIdentifier,
            "Cantidad": r.quantity,
            "Destino": r.destination,
            "Tipo Destino": r.destinationType,
            "Usuario": usersMap.get(r.userId) || 'N/A'
        }));
        exportToExcel(data, "historial_salidas");
    };


    // --- Handlers para Elaborados ---
    const handleElaboratedSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!elaboratedForm.productName || !elaboratedForm.productLot || elaboratedForm.ingredients.some(i => !i.name || !i.lot || !i.quantity)) {
            warning('Campos requeridos', 'Por favor, complete al menos el nombre del producto, el lote y los detalles de los ingredientes.');
            return;
        }
        onAddElaboratedRecord({
            productName: elaboratedForm.productName,
            elaborationDate: elaboratedForm.elaborationDate,
            productLot: elaboratedForm.productLot,
            ingredients: elaboratedForm.ingredients,
            destination: elaboratedForm.destination,
            quantitySent: elaboratedForm.quantitySent,
            userId: elaboratedForm.userId,
            registeredBy,
            registeredById,
            registeredAt: new Date().toISOString()
        });

        // Mostrar notificación de éxito
        success('Registro guardado correctamente', 'El registro de elaboración se ha guardado exitosamente.');

        // Resetear formulario
        setElaboratedForm({ productName: '', elaborationDate: new Date().toISOString().slice(0,10), ingredients: [{name: '', supplier: '', lot: '', quantity: ''}], productLot: '', destination: '', quantitySent: '', userId: elaboratedForm.userId });
        setRegisteredBy('');
        setRegisteredById('');
    };

    const handleElaboratedChange = (field: keyof Omit<ElaboratedFormState, 'ingredients'>, value: any) => {
        setElaboratedForm(prev => ({...prev, [field]: value}));
    };
    
    const handleIngredientChange = (index: number, field: keyof ElaboratedFormState['ingredients'][0], value: any) => {
        const newIngredients = [...elaboratedForm.ingredients];
        newIngredients[index] = { ...newIngredients[index], [field]: value };
        setElaboratedForm(prev => ({ ...prev, ingredients: newIngredients }));
    };

    const handleAddIngredient = () => {
        setElaboratedForm(prev => ({ ...prev, ingredients: [...prev.ingredients, {name: '', supplier: '', lot: '', quantity: ''}] }));
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = elaboratedForm.ingredients.filter((_, i) => i !== index);
        setElaboratedForm(prev => ({ ...prev, ingredients: newIngredients }));
    };

    const handleDeleteElaborated = (id: string) => {
        if(window.confirm('¿Eliminar este registro de producto elaborado?')) {
            onDeleteElaborated(id);
        }
    };

    const handleExportElaboratedPDF = () => {
        const headers = ["Fecha", "Producto Elaborado", "Lote Producto", "Ingredientes", "Destino", "Cantidad", "Usuario"];
        const data = filteredElaboratedRecords.map(r => [
            new Date(r.elaborationDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
            r.productName,
            r.productLot,
            r.ingredients.map(i => `${i.name} (Lote: ${i.lot})`).join(', '),
            r.destination,
            r.quantitySent,
            usersMap.get(r.userId) || 'N/A'
        ]);
        exportToPDF("Historial de Productos Elaborados", headers, data, "historial_elaborados", establishmentInfo);
    };

    const handleExportElaboratedExcel = () => {
        const data = filteredElaboratedRecords.flatMap(r => 
            r.ingredients.map(ing => ({
                "Fecha Elaboración": new Date(r.elaborationDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
                "Producto Elaborado": r.productName,
                "Lote Producto": r.productLot,
                "Destino Lote": r.destination,
                "Cantidad Enviada": r.quantitySent,
                "Ingrediente": ing.name,
                "Proveedor Ingrediente": ing.supplier,
                "Lote Ingrediente": ing.lot,
                "Cantidad Ingrediente": ing.quantity,
                "Usuario": usersMap.get(r.userId) || 'N/A'
            }))
        );
        if(data.length === 0) { // Manejar caso sin ingredientes
             const emptyData = filteredElaboratedRecords.map(r => ({
                "Fecha Elaboración": new Date(r.elaborationDate).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
                "Producto Elaborado": r.productName,
                "Lote Producto": r.productLot,
                "Destino Lote": r.destination,
                "Cantidad Enviada": r.quantitySent,
                "Usuario": usersMap.get(r.userId) || 'N/A'
            }));
            exportToExcel(emptyData, "historial_elaborados");
            return;
        }
        exportToExcel(data, "historial_elaborados");
    };


    return (
        <>
            <h1>Trazabilidad</h1>
            <div className="page-grid">
                {/* --- Formulario de Salida --- */}
                <div className="card">
                     <h2 
                        className="collapsible-header" 
                        onClick={() => setIsOutgoingFormOpen(!isOutgoingFormOpen)}
                        role="button"
                        aria-expanded={isOutgoingFormOpen}
                    >
                        Trazabilidad de Artículos (Salida)
                        <span className={`chevron ${isOutgoingFormOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isOutgoingFormOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner">
                            <form onSubmit={handleOutgoingSubmit}>
                                <div className="form-group">
                                    <label htmlFor="out-product">Producto / Cantidad</label>
                                    <div style={{display: 'flex', gap: '10px'}}>
                                        <input type="text" id="out-product" placeholder="Ej: Chuletas de cordero" value={outgoingForm.productName} onChange={e => handleOutgoingChange('productName', e.target.value)} required style={{flex: 2}}/>
                                        <input type="text" placeholder="Ej: 5 kg" value={outgoingForm.quantity} onChange={e => handleOutgoingChange('quantity', e.target.value)} required style={{flex: 1}}/>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="out-lot">Lote / Crotal / Albarán</label>
                                    <input type="text" id="out-lot" placeholder="Identificador del producto" value={outgoingForm.lotIdentifier} onChange={e => handleOutgoingChange('lotIdentifier', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="out-date">Fecha / Destino</label>
                                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                        <input type="date" id="out-date" value={outgoingForm.date} onChange={e => handleOutgoingChange('date', e.target.value)} required style={{flex: 1}}/>
                                        <select value={outgoingForm.destinationType} onChange={e => handleOutgoingChange('destinationType', e.target.value as 'sucursal' | 'consumidor')} style={{flex: 1.2}}>
                                            <option value="consumidor">Consumidor Final</option>
                                            <option value="sucursal">Transporte a Sucursal</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                     <label htmlFor="out-destination">Nombre del Destino</label>
                                    <input type="text" id="out-destination" placeholder="Ej: Cliente #502, Sucursal Centro" value={outgoingForm.destination} onChange={e => handleOutgoingChange('destination', e.target.value)} required />
                                </div>
                                 <div className="form-group">
                                    <label htmlFor="out-user">Usuario</label>
                                    <select id="out-user" value={outgoingForm.userId} onChange={e => handleOutgoingChange('userId', e.target.value)} required>
                                        {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="btn-submit">Registrar Salida</button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* --- Formulario de Elaborados --- */}
                <div className="card">
                     <h2 
                        className="collapsible-header" 
                        onClick={() => setIsElaboratedFormOpen(!isElaboratedFormOpen)}
                        role="button"
                        aria-expanded={isElaboratedFormOpen}
                    >
                        Trazabilidad de Producto Elaborado
                        <span className={`chevron ${isElaboratedFormOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isElaboratedFormOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner">
                            <form onSubmit={handleElaboratedSubmit}>
                                 <div className="form-group">
                                    <label htmlFor="elab-name">Nombre del Producto Elaborado</label>
                                    <input type="text" id="elab-name" placeholder="Ej: Hamburguesa de ternera" value={elaboratedForm.productName} onChange={e => handleElaboratedChange('productName', e.target.value)} required/>
                                </div>
                                 <div className="costing-form-grid">
                                    <div className="form-group">
                                        <label htmlFor="elab-date">Fecha de Elaboración</label>
                                        <input type="date" id="elab-date" value={elaboratedForm.elaborationDate} onChange={e => handleElaboratedChange('elaborationDate', e.target.value)} required/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="elab-lot">Lote del Producto</label>
                                        <input type="text" id="elab-lot" placeholder="Ej: HBG-20240521" value={elaboratedForm.productLot} onChange={e => handleElaboratedChange('productLot', e.target.value)} required/>
                                    </div>
                                </div>
                                <h3 className="parts-header">Ingredientes Utilizados</h3>
                                {elaboratedForm.ingredients.map((ing, index) => (
                                     <div key={index} className="part-entry">
                                        <div className="part-entry-inputs" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))'}}>
                                            <div className="form-group"><label>Ingrediente</label><input type="text" value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} required placeholder="Ej: Carne picada"/></div>
                                            <div className="form-group"><label>Proveedor</label><input type="text" value={ing.supplier} onChange={e => handleIngredientChange(index, 'supplier', e.target.value)} placeholder="Opcional"/></div>
                                            <div className="form-group"><label>Lote</label><input type="text" value={ing.lot} onChange={e => handleIngredientChange(index, 'lot', e.target.value)} required placeholder="Lote ingrediente"/></div>
                                            <div className="form-group"><label>Cantidad</label><input type="text" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', e.target.value)} required placeholder="Ej: 10 kg"/></div>
                                        </div>
                                        <button type="button" className="btn-delete" onClick={() => handleRemoveIngredient(index)} disabled={elaboratedForm.ingredients.length <= 1}>×</button>
                                    </div>
                                ))}
                                <button type="button" className="btn-add-part" onClick={handleAddIngredient}>+ Añadir Ingrediente</button>

                                <h3 className="parts-header">Destino del Lote Creado</h3>
                                 <div className="costing-form-grid">
                                    <div className="form-group">
                                        <label htmlFor="elab-dest">Destino</label>
                                        <input type="text" id="elab-dest" value={elaboratedForm.destination} onChange={e => handleElaboratedChange('destination', e.target.value)} placeholder="Ej: Venta directa"/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="elab-qsent">Cantidad</label>
                                        <input type="text" id="elab-qsent" value={elaboratedForm.quantitySent} onChange={e => handleElaboratedChange('quantitySent', e.target.value)} placeholder="Ej: 15 kg"/>
                                    </div>
                                </div>
                                 <div className="form-group">
                                    <label htmlFor="elab-user">Usuario</label>
                                    <select id="elab-user" value={elaboratedForm.userId} onChange={e => handleElaboratedChange('userId', e.target.value)} required>
                                        {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="btn-submit">Registrar Elaboración</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Tabla Historial de Salidas --- */}
            <div className="card">
                <h2>Historial de Salidas</h2>
                <div className="export-controls-container">
                     <h3>Exportar Registros de Salida</h3>
                     <div className="export-controls-row">
                        <div className="form-group">
                            <label htmlFor="start-date-out">Fecha de Inicio</label>
                            <input type="date" id="start-date-out" value={outgoingStartDate} onChange={e => setOutgoingStartDate(e.target.value)} />
                        </div>
                         <div className="form-group">
                            <label htmlFor="end-date-out">Fecha de Fin</label>
                            <input type="date" id="end-date-out" value={outgoingEndDate} onChange={e => setOutgoingEndDate(e.target.value)} />
                        </div>
                        <div className="export-buttons">
                            <button className="btn-export btn-pdf" onClick={handleExportOutgoingPDF} disabled={filteredOutgoingRecords.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                PDF
                            </button>
                            <button className="btn-export btn-excel" onClick={handleExportOutgoingExcel} disabled={filteredOutgoingRecords.length === 0}>
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                Excel
                            </button>
                        </div>
                     </div>
                </div>
                <div style={{overflowX: 'auto'}}>
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Producto</th>
                                <th>Lote/ID</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOutgoingRecords.length > 0 ? filteredOutgoingRecords.map(r => {
                                const isExpanded = expandedOutgoingId === r.id;
                                const formattedDate = new Date(r.date).toLocaleDateString('es-ES', { timeZone: 'UTC' });
                                return (
                                    <React.Fragment key={r.id}>
                                        <tr className="summary-row" onClick={() => setExpandedOutgoingId(isExpanded ? null : r.id)} aria-expanded={isExpanded}>
                                            <td data-label="Fecha">{formattedDate}</td>
                                            <td data-label="Producto">{r.productName}</td>
                                            <td data-label="Lote/ID">{r.lotIdentifier}</td>
                                            <td data-label="Detalles" className="expand-cell">
                                                <span className="expand-indicator">{isExpanded ? 'Ocultar' : 'Ver'}</span>
                                                <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="detail-row">
                                                <td colSpan={4}>
                                                    <div className="record-details">
                                                        <div><strong>Cantidad</strong><span>{r.quantity}</span></div>
                                                        <div><strong>Destino</strong><span>{r.destination} <span className="part-meta-info">({r.destinationType})</span></span></div>
                                                        <div><strong>Usuario</strong><span>{usersMap.get(r.userId) || 'N/A'}</span></div>
                                                        <div className="detail-actions">
                                                            <strong>Acciones</strong>
                                                            <div>
                                                                <button className="btn-delete" onClick={() => handleDeleteOutgoing(r.id)}>Eliminar</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr><td colSpan={4} style={{textAlign: 'center', padding: '20px'}}>No hay registros de salida para el rango de fechas seleccionado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* --- Tabla Historial de Elaborados --- */}
            <div className="card">
                <h2>Historial de Productos Elaborados</h2>
                <div className="export-controls-container">
                     <h3>Exportar Registros de Elaborados</h3>
                     <div className="export-controls-row">
                        <div className="form-group">
                            <label htmlFor="start-date-elab">Fecha de Inicio</label>
                            <input type="date" id="start-date-elab" value={elaboratedStartDate} onChange={e => setElaboratedStartDate(e.target.value)} />
                        </div>
                         <div className="form-group">
                            <label htmlFor="end-date-elab">Fecha de Fin</label>
                            <input type="date" id="end-date-elab" value={elaboratedEndDate} onChange={e => setElaboratedEndDate(e.target.value)} />
                        </div>
                        <div className="export-buttons">
                            <button className="btn-export btn-pdf" onClick={handleExportElaboratedPDF} disabled={filteredElaboratedRecords.length === 0}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                PDF
                            </button>
                            <button className="btn-export btn-excel" onClick={handleExportElaboratedExcel} disabled={filteredElaboratedRecords.length === 0}>
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                Excel
                            </button>
                        </div>
                     </div>
                </div>
                <div style={{overflowX: 'auto'}}>
                     <table className="user-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Producto Elaborado</th>
                                <th>Lote</th>
                                <th>Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredElaboratedRecords.length > 0 ? filteredElaboratedRecords.map(r => {
                                const isExpanded = expandedElaboratedId === r.id;
                                const formattedDate = new Date(r.elaborationDate).toLocaleDateString('es-ES', { timeZone: 'UTC' });
                                return (
                                    <React.Fragment key={r.id}>
                                        <tr className="summary-row" onClick={() => setExpandedElaboratedId(isExpanded ? null : r.id)} aria-expanded={isExpanded}>
                                            <td data-label="Fecha">{formattedDate}</td>
                                            <td data-label="Producto Elaborado">{r.productName}</td>
                                            <td data-label="Lote">{r.productLot}</td>
                                            <td data-label="Detalles" className="expand-cell">
                                                <span className="expand-indicator">{isExpanded ? 'Ocultar' : 'Ver'}</span>
                                                <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="detail-row">
                                                <td colSpan={4}>
                                                    <div className="record-details">
                                                        <div style={{gridColumn: '1 / -1'}}>
                                                            <strong>Ingredientes</strong>
                                                            <ul style={{paddingLeft: '20px', margin: '5px 0 0', fontSize: '14px'}}>
                                                                {r.ingredients.map((ing, idx) => <li key={idx}><strong>{ing.quantity}</strong> de {ing.name} (Proveedor: {ing.supplier || 'N/A'}, Lote: {ing.lot})</li>)}
                                                            </ul>
                                                        </div>
                                                        <div><strong>Destino</strong><span>{r.destination}</span></div>
                                                        <div><strong>Cantidad Enviada</strong><span>{r.quantitySent}</span></div>
                                                        <div><strong>Usuario</strong><span>{usersMap.get(r.userId) || 'N/A'}</span></div>
                                                        <div className="detail-actions">
                                                            <strong>Acciones</strong>
                                                            <div>
                                                                <button className="btn-delete" onClick={() => handleDeleteElaborated(r.id)}>Eliminar</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr><td colSpan={4} style={{textAlign: 'center', padding: '20px'}}>No hay registros de productos elaborados para el rango de fechas seleccionado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default TraceabilityPage;
