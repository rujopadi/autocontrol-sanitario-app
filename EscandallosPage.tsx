
import React, { useState, useEffect } from 'react';
import { Costing, CostingPart } from './App';
import { useNotifications } from './NotificationContext';

// Type for the form state for both creating and editing
type CostingFormState = {
    productName: string;
    totalWeight: string;
    pricePerKg: string;
    parts: {
        _id?: string; // To track original ID during edit
        name: string;
        weight: string;
        saleType: 'weight' | 'unit';
        quantity: string;
    }[];
};

interface EscandallosPageProps {
    costings: Costing[];
    onSetCostings: (costings: Costing[] | ((prevState: Costing[]) => Costing[])) => void;
}

const EscandallosPage: React.FC<EscandallosPageProps> = ({ costings, onSetCostings }) => {
    const { warning } = useNotifications();

    // --- STATE MANAGEMENT ---
    const [isCreateFormOpen, setIsCreateFormOpen] = useState(true);
    const [expandedCostingId, setExpandedCostingId] = useState<string | null>(costings.length > 0 ? costings[0].id : null);

    const [createForm, setCreateForm] = useState<CostingFormState>({
        productName: '',
        totalWeight: '',
        pricePerKg: '',
        parts: [{ name: '', weight: '', saleType: 'weight', quantity: '' }]
    });

    const [editingCostingId, setEditingCostingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<CostingFormState | null>(null);

    useEffect(() => {
        // If the expanded costing is deleted, collapse everything or expand the first one.
        if (expandedCostingId && !costings.some(c => c.id === expandedCostingId)) {
            setExpandedCostingId(costings.length > 0 ? costings[0].id : null);
        }
    }, [costings, expandedCostingId]);

    // --- FORM HANDLERS (CREATE) ---
    const handleCreatePartChange = (index: number, field: keyof CostingFormState['parts'][0], value: any) => {
        const newParts = [...createForm.parts];
        newParts[index] = { ...newParts[index], [field]: value };
        setCreateForm({ ...createForm, parts: newParts });
    };
    const handleAddCreatePart = () => {
        setCreateForm({ ...createForm, parts: [...createForm.parts, { name: '', weight: '', saleType: 'weight', quantity: '' }] });
    };
    const handleRemoveCreatePart = (index: number) => {
        const newParts = createForm.parts.filter((_, i) => i !== index);
        setCreateForm({ ...createForm, parts: newParts });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !createForm.productName.trim() ||
            !createForm.totalWeight.trim() ||
            !createForm.pricePerKg.trim() ||
            createForm.parts.some(p => !p.name.trim() || !p.weight.trim() || (p.saleType === 'unit' && (!p.quantity.trim() || parseInt(p.quantity) <= 0)))
        ) {
            warning('Campos requeridos', 'Por favor, complete todos los campos del producto y sus partes.');
            return;
        }

        const calculatedPurchasePrice = parseFloat(createForm.pricePerKg) * parseFloat(createForm.totalWeight);

        const newCosting: Costing = {
            id: String(Date.now()),
            productName: createForm.productName.trim(),
            totalWeight: parseFloat(createForm.totalWeight),
            purchasePrice: calculatedPurchasePrice,
            parts: createForm.parts.map((p, index) => ({
                id: String(Date.now() + index),
                name: p.name.trim(),
                weight: parseFloat(p.weight),
                saleType: p.saleType,
                quantity: p.saleType === 'unit' ? parseInt(p.quantity, 10) : undefined
            })),
            salePrices: {}
        };

        onSetCostings(prev => [newCosting, ...prev]);
        setExpandedCostingId(newCosting.id); // Expand the new one
        setCreateForm({ productName: '', totalWeight: '', pricePerKg: '', parts: [{ name: '', weight: '', saleType: 'weight', quantity: '' }] });
    };

    // --- FORM HANDLERS (EDIT) ---
    const handleStartEdit = (costing: Costing) => {
        setExpandedCostingId(costing.id); // Ensure card is open when editing
        setEditingCostingId(costing.id);
        const purchasePricePerKg = costing.totalWeight > 0 ? (costing.purchasePrice / costing.totalWeight).toFixed(2) : '';
        setEditForm({
            productName: costing.productName,
            totalWeight: String(costing.totalWeight),
            pricePerKg: purchasePricePerKg,
            parts: costing.parts.map(p => ({
                _id: p.id,
                name: p.name,
                weight: String(p.weight),
                saleType: p.saleType,
                quantity: p.quantity ? String(p.quantity) : ''
            }))
        });
    };

    const handleCancelEdit = () => {
        setEditingCostingId(null);
        setEditForm(null);
    };

    const handleEditFormChange = (field: keyof Omit<CostingFormState, 'parts'>, value: string) => {
        if (editForm) setEditForm({ ...editForm, [field]: value });
    };

    const handleEditPartChange = (index: number, field: keyof CostingFormState['parts'][0], value: any) => {
        if (editForm) {
            const newParts = [...editForm.parts];
            newParts[index] = { ...newParts[index], [field]: value };
            setEditForm({ ...editForm, parts: newParts });
        }
    };

    const handleAddEditPart = () => {
        if (editForm) setEditForm({ ...editForm, parts: [...editForm.parts, { name: '', weight: '', saleType: 'weight', quantity: '' }] });
    };

    const handleRemoveEditPart = (index: number) => {
        if (editForm) {
            const newParts = editForm.parts.filter((_, i) => i !== index);
            setEditForm({ ...editForm, parts: newParts });
        }
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editForm || !editingCostingId) return;

        if (
            !editForm.productName.trim() ||
            !editForm.totalWeight.trim() ||
            !editForm.pricePerKg.trim() ||
            editForm.parts.some(p => !p.name.trim() || !p.weight.trim() || (p.saleType === 'unit' && (!p.quantity.trim() || parseInt(p.quantity) <= 0)))
        ) {
            warning('Campos requeridos', 'Por favor, complete todos los campos para guardar los cambios.');
            return;
        }

        const originalCosting = costings.find(c => c.id === editingCostingId);
        if (!originalCosting) return;

        const calculatedPurchasePrice = parseFloat(editForm.pricePerKg) * parseFloat(editForm.totalWeight);

        const newParts: CostingPart[] = editForm.parts.map((p, index) => ({
            id: p._id || String(Date.now() + index),
            name: p.name.trim(),
            weight: parseFloat(p.weight),
            saleType: p.saleType,
            quantity: p.saleType === 'unit' ? parseInt(p.quantity, 10) : undefined
        }));

        const newPartIds = new Set(newParts.map(p => p.id));
        const newSalePrices = { ...originalCosting.salePrices };
        Object.keys(newSalePrices).forEach(partIdStr => {
            if (!newPartIds.has(partIdStr)) {
                delete newSalePrices[partIdStr];
            }
        });

        const updatedCosting: Costing = {
            ...originalCosting,
            productName: editForm.productName.trim(),
            totalWeight: parseFloat(editForm.totalWeight),
            purchasePrice: calculatedPurchasePrice,
            parts: newParts,
            salePrices: newSalePrices
        };

        onSetCostings(prev => prev.map(c => c.id === editingCostingId ? updatedCosting : c));
        handleCancelEdit();
    };


    // --- DISPLAY HANDLERS ---
    const handleSalePriceChange = (costingId: string, partId: string, value: string) => {
        onSetCostings(prevCostings => prevCostings.map(c => {
            if (c.id === costingId) {
                const newSalePrices = { ...c.salePrices, [partId]: value };
                return { ...c, salePrices: newSalePrices };
            }
            return c;
        }));
    };

    const handleDeleteCosting = (id: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este escandallo?')) {
            onSetCostings(prev => prev.filter(c => c.id !== id));
        }
    };

    return (
        <>
            <h1>Escandallos de Productos</h1>
            <div className="page-grid">
                <div className="card">
                    <h2
                        className="collapsible-header"
                        onClick={() => setIsCreateFormOpen(!isCreateFormOpen)}
                        role="button"
                        aria-expanded={isCreateFormOpen}
                    >
                        Crear Nuevo Escandallo
                        <span className={`chevron ${isCreateFormOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isCreateFormOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner">
                            <form onSubmit={handleCreateSubmit}>
                                <div className="form-group">
                                    <label htmlFor="prod-name">Nombre del Producto a escandallar</label>
                                    <input type="text" id="prod-name" value={createForm.productName} onChange={e => setCreateForm({ ...createForm, productName: e.target.value })} required placeholder="Ej: Costillar de cerdo" />
                                </div>
                                <div className="costing-form-grid">
                                    <div className="form-group">
                                        <label htmlFor="prod-weight">Peso Total (kg)</label>
                                        <input type="number" step="0.001" id="prod-weight" value={createForm.totalWeight} onChange={e => setCreateForm({ ...createForm, totalWeight: e.target.value })} required placeholder="Ej: 11.5" />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="prod-price-kg">Precio Compra por Kilo (€/kg)</label>
                                        <input type="number" step="0.01" id="prod-price-kg" value={createForm.pricePerKg} onChange={e => setCreateForm({ ...createForm, pricePerKg: e.target.value })} required placeholder="Ej: 4.78" />
                                    </div>
                                </div>

                                <h3 className="parts-header">Partes del Producto</h3>
                                {createForm.parts.map((part, index) => (
                                    <div key={index} className="part-entry">
                                        <div className="part-entry-inputs">
                                            <div className="form-group"><label>Nombre Parte {index + 1}</label><input type="text" value={part.name} onChange={e => handleCreatePartChange(index, 'name', e.target.value)} required placeholder="Ej: Chuletas" /></div>
                                            <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.001" value={part.weight} onChange={e => handleCreatePartChange(index, 'weight', e.target.value)} required placeholder="Ej: 7.2" /></div>
                                            <div className="form-group"><label>Tipo de Venta</label><select value={part.saleType} onChange={e => handleCreatePartChange(index, 'saleType', e.target.value)}><option value="weight">Por Peso (kg)</option><option value="unit">Por Unidad</option></select></div>
                                            {part.saleType === 'unit' && (<div className="form-group"><label>Cantidad (uds)</label><input type="number" step="1" min="1" value={part.quantity} onChange={e => handleCreatePartChange(index, 'quantity', e.target.value)} required placeholder="Ej: 16" /></div>)}
                                        </div>
                                        <button type="button" className="btn-delete" onClick={() => handleRemoveCreatePart(index)} disabled={createForm.parts.length <= 1}>×</button>
                                    </div>
                                ))}
                                <button type="button" className="btn-add-part" onClick={handleAddCreatePart}>+ Añadir Otra Parte</button>

                                <button type="submit" className="btn-submit">Crear Escandallo</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div className="costing-results-column">
                    {costings.length > 0 ?
                        costings.map(costing => {
                            if (editingCostingId === costing.id && editForm) {
                                return (
                                    // --- EDIT FORM RENDER ---
                                    <div key={costing.id} className="card">
                                        <h2>Editando: {editForm.productName}</h2>
                                        <form onSubmit={handleSaveEdit}>
                                            <div className="form-group">
                                                <label htmlFor="edit-prod-name">Nombre del Producto</label>
                                                <input type="text" id="edit-prod-name" value={editForm.productName} onChange={e => handleEditFormChange('productName', e.target.value)} required />
                                            </div>
                                            <div className="costing-form-grid">
                                                <div className="form-group"><label htmlFor="edit-prod-weight">Peso Total (kg)</label><input type="number" step="0.001" id="edit-prod-weight" value={editForm.totalWeight} onChange={e => handleEditFormChange('totalWeight', e.target.value)} required /></div>
                                                <div className="form-group"><label htmlFor="edit-prod-price-kg">Precio Compra por Kilo (€/kg)</label><input type="number" step="0.01" id="edit-prod-price-kg" value={editForm.pricePerKg} onChange={e => handleEditFormChange('pricePerKg', e.target.value)} required /></div>
                                            </div>
                                            <h3 className="parts-header">Partes del Producto</h3>
                                            {editForm.parts.map((part, index) => (
                                                <div key={index} className="part-entry">
                                                    <div className="part-entry-inputs">
                                                        <div className="form-group"><label>Nombre Parte {index + 1}</label><input type="text" value={part.name} onChange={e => handleEditPartChange(index, 'name', e.target.value)} required /></div>
                                                        <div className="form-group"><label>Peso (kg)</label><input type="number" step="0.001" value={part.weight} onChange={e => handleEditPartChange(index, 'weight', e.target.value)} required /></div>
                                                        <div className="form-group"><label>Tipo de Venta</label><select value={part.saleType} onChange={e => handleEditPartChange(index, 'saleType', e.target.value)}><option value="weight">Por Peso (kg)</option><option value="unit">Por Unidad</option></select></div>
                                                        {part.saleType === 'unit' && (<div className="form-group"><label>Cantidad (uds)</label><input type="number" step="1" min="1" value={part.quantity} onChange={e => handleEditPartChange(index, 'quantity', e.target.value)} required /></div>)}
                                                    </div>
                                                    <button type="button" className="btn-delete" onClick={() => handleRemoveEditPart(index)} disabled={editForm.parts.length <= 1}>×</button>
                                                </div>
                                            ))}
                                            <button type="button" className="btn-add-part" onClick={handleAddEditPart}>+ Añadir Otra Parte</button>
                                            <div className="edit-form-actions">
                                                <button type="button" onClick={handleCancelEdit} className="btn-cancel">Cancelar</button>
                                                <button type="submit" className="btn-submit">Guardar Cambios</button>
                                            </div>
                                        </form>
                                    </div>
                                )
                            } else {
                                const isExpanded = expandedCostingId === costing.id;
                                const calculated = {
                                    totalSaleRevenue: 0,
                                    partsData: [] as { part: Costing['parts'][0]; salePrice: number; revenue: number }[]
                                };

                                costing.parts.forEach(part => {
                                    const salePrice = parseFloat(costing.salePrices[part.id]) || 0;
                                    const revenue = part.saleType === 'unit' ? salePrice * (part.quantity || 0) : salePrice * part.weight;
                                    calculated.totalSaleRevenue += revenue;
                                    calculated.partsData.push({ part, salePrice, revenue });
                                });

                                const profit = calculated.totalSaleRevenue - costing.purchasePrice;
                                const yieldPercent = costing.purchasePrice > 0 ? (profit / costing.purchasePrice) * 100 : 0;

                                const totalPartsWeight = costing.parts.reduce((sum, p) => sum + p.weight, 0);
                                const weightDifference = costing.totalWeight - totalPartsWeight;

                                const purchasePricePerKg = costing.totalWeight > 0 ? (costing.purchasePrice / costing.totalWeight).toFixed(2) : '0.00';

                                return (
                                    <div key={costing.id} className="card costing-card">
                                        <div
                                            className="collapsible-header"
                                            onClick={() => setExpandedCostingId(isExpanded ? null : costing.id)}
                                            role="button"
                                            aria-expanded={isExpanded}
                                        >
                                            <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>{costing.productName}</h2>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div onClick={e => e.stopPropagation()}>
                                                    <button className="btn-edit" onClick={() => handleStartEdit(costing)} style={{ marginRight: 0 }}>Editar</button>
                                                    <button className="btn-delete" onClick={() => handleDeleteCosting(costing.id)}>Eliminar</button>
                                                </div>
                                                <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                            </div>
                                        </div>
                                        <div className={`collapsible-content ${isExpanded ? 'open' : ''}`}>
                                            <div className="collapsible-content-inner">
                                                <p style={{ marginTop: '15px' }}>Coste de Compra: <strong>{costing.purchasePrice.toFixed(2)}€</strong> ({costing.totalWeight}kg @ {purchasePricePerKg}€/kg)</p>

                                                <table className="user-table costing-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Parte</th>
                                                            <th>Peso (kg) / Cantidad</th>
                                                            <th>Precio Venta</th>
                                                            <th>Ingreso (€)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {calculated.partsData.map(({ part, revenue }) => (
                                                            <tr key={part.id}>
                                                                <td data-label="Parte">{part.name}</td>
                                                                <td data-label="Peso (kg) / Cantidad">
                                                                    {part.weight.toFixed(3)}kg
                                                                    {part.saleType === 'unit' && <div className="part-meta-info">({part.quantity} uds)</div>}
                                                                </td>
                                                                <td data-label="Precio Venta">
                                                                    <div className="price-input-wrapper">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="price-input"
                                                                            placeholder="0.00"
                                                                            value={costing.salePrices[part.id] || ''}
                                                                            onChange={(e) => handleSalePriceChange(costing.id, part.id, e.target.value)}
                                                                        />
                                                                        <span className="price-unit-label">{part.saleType === 'unit' ? '€/ud' : '€/kg'}</span>
                                                                    </div>
                                                                </td>
                                                                <td data-label="Ingreso (€)">{revenue.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {Math.abs(weightDifference) > 0.001 && (
                                                    <p className="weight-warning">
                                                        ¡Atención! El peso total de las partes ({totalPartsWeight.toFixed(3)}kg) no coincide con el peso total del producto ({costing.totalWeight}kg). Diferencia: {weightDifference.toFixed(3)}kg.
                                                    </p>
                                                )}

                                                <div className="costing-summary">
                                                    <div>Ingresos Totales: <span>{calculated.totalSaleRevenue.toFixed(2)}€</span></div>
                                                    <div className={profit >= 0 ? 'profit' : 'loss'}>
                                                        Beneficio / Pérdida:
                                                        <span>{profit.toFixed(2)}€</span>
                                                    </div>
                                                    <div className={profit >= 0 ? 'profit' : 'loss'}>
                                                        Rendimiento:
                                                        <span>{yieldPercent.toFixed(2)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        }) :
                        <div className="card"><p>No hay escandallos creados. Use el formulario para añadir el primero.</p></div>
                    }
                </div>
            </div>
        </>
    )
};

export default EscandallosPage;
