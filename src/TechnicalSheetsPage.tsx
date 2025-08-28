import React, { useState } from 'react';
import { TechnicalSheet, Ingredient, EstablishmentInfo } from './types';

// --- Interfaces ---
interface IngredientFormState extends Omit<Ingredient, 'id'> {
    id: string; // Temp ID for form state
}

interface TechnicalSheetsPageProps {
    sheets: TechnicalSheet[];
    onAddSheet: (sheet: Omit<TechnicalSheet, 'id'>) => void;
    onDeleteSheet: (id: string) => void;
    establishmentInfo: EstablishmentInfo;
}


// --- Component ---
const TechnicalSheetsPage: React.FC<TechnicalSheetsPageProps> = ({ sheets, onAddSheet, onDeleteSheet, establishmentInfo }) => {
    // --- State ---
    const [isCreateFormOpen, setIsCreateFormOpen] = useState(true);
    const [expandedSheetId, setExpandedSheetId] = useState<string | null>(sheets.length > 0 ? sheets[0].id : null);

    const initialFormState = {
        productName: '',
        ingredients: [{ id: `ing-${Date.now()}`, name: '', lot: '', isAllergen: false }],
        elaboration: '',
        presentation: '',
        shelfLife: '',
        labeling: ''
    };
    const [formState, setFormState] = useState(initialFormState);
    
    // --- Form Handlers ---
    const handleIngredientChange = (id: string, field: keyof Omit<IngredientFormState, 'id'>, value: any) => {
        const newIngredients = formState.ingredients.map(ing => {
            if (ing.id === id) {
                return { ...ing, [field]: value };
            }
            return ing;
        });
        setFormState(prev => ({ ...prev, ingredients: newIngredients }));
    };

    const handleAddIngredient = () => {
        setFormState(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { id: `ing-${Date.now()}`, name: '', lot: '', isAllergen: false }]
        }));
    };

    const handleRemoveIngredient = (id: string) => {
        if (formState.ingredients.length <= 1) return;
        const newIngredients = formState.ingredients.filter(ing => ing.id !== id);
        setFormState(prev => ({ ...prev, ingredients: newIngredients }));
    };
    
    const handleFormChange = (field: keyof Omit<typeof formState, 'ingredients'>, value: string) => {
         setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.productName.trim() || formState.ingredients.some(i => !i.name.trim() || !i.lot.trim())) {
            alert('Por favor, complete la denominación y todos los campos de los ingredientes.');
            return;
        }

        onAddSheet({
            productName: formState.productName,
            ingredients: formState.ingredients.map(({id, ...rest}) => rest), // remove temp id
            elaboration: formState.elaboration,
            presentation: formState.presentation,
            shelfLife: formState.shelfLife,
            labeling: formState.labeling
        });

        // setExpandedSheetId(Date.now()); // A bit of a hack to ensure the new one might be visible, but IDs change.
        setFormState(initialFormState); // Reset form
        setIsCreateFormOpen(false);
    };

    const handleDeleteSheet = (id: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar esta ficha técnica?')) {
            onDeleteSheet(id);
        }
    };


    return (
        <>
            <div className="page-header-with-org">
                <h1>Fichas Técnicas de Productos</h1>
                <div className="org-context">
                    <span className="org-label">Organización:</span>
                    <span className="org-name">{establishmentInfo.name || 'Mi Organización'}</span>
                </div>
            </div>
            <div className="page-grid">
                <div className="card">
                    <h2
                        className="collapsible-header"
                        onClick={() => setIsCreateFormOpen(!isCreateFormOpen)}
                        role="button"
                        aria-expanded={isCreateFormOpen}
                    >
                        Crear Nueva Ficha Técnica
                        <span className={`chevron ${isCreateFormOpen ? 'open' : ''}`}>&#9660;</span>
                    </h2>
                    <div className={`collapsible-content ${isCreateFormOpen ? 'open' : ''}`}>
                        <div className="collapsible-content-inner">
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label htmlFor="prod-name">Denominación del producto</label>
                                    <input type="text" id="prod-name" value={formState.productName} onChange={e => handleFormChange('productName', e.target.value)} required placeholder="Ej: Chorizo casero"/>
                                </div>
                                
                                <h3 className="parts-header">Ingredientes</h3>
                                {formState.ingredients.map((ing, index) => (
                                    <div key={ing.id} className="part-entry">
                                        <div className="part-entry-inputs" style={{gridTemplateColumns: '2fr 1fr auto', alignItems: 'center'}}>
                                            <div className="form-group"><label>Ingrediente {index+1}</label><input type="text" value={ing.name} onChange={e => handleIngredientChange(ing.id, 'name', e.target.value)} required placeholder="Ej: Carne de cerdo"/></div>
                                            <div className="form-group"><label>Nº Lote</label><input type="text" value={ing.lot} onChange={e => handleIngredientChange(ing.id, 'lot', e.target.value)} required placeholder="Ej: LOTE-123"/></div>
                                            <div className="form-group-checkbox" style={{paddingTop: '20px'}}><input type="checkbox" checked={ing.isAllergen} onChange={e => handleIngredientChange(ing.id, 'isAllergen', e.target.checked)} id={`allergen-${ing.id}`}/><label htmlFor={`allergen-${ing.id}`}>Alérgeno</label></div>
                                        </div>
                                        <button type="button" className="btn-delete" onClick={() => handleRemoveIngredient(ing.id)} disabled={formState.ingredients.length <= 1}>×</button>
                                    </div>
                                ))}
                                <button type="button" className="btn-add-part" onClick={handleAddIngredient}>+ Añadir Ingrediente</button>

                                <div className="form-group">
                                    <label htmlFor="elaboration">Descripción de la elaboración</label>
                                    <textarea id="elaboration" rows={4} value={formState.elaboration} onChange={e => handleFormChange('elaboration', e.target.value)} placeholder="Pasos del proceso de elaboración..."></textarea>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="presentation">Presentación comercial</label>
                                    <textarea id="presentation" rows={2} value={formState.presentation} onChange={e => handleFormChange('presentation', e.target.value)} placeholder="Ej: Bandejas de 500g, envasado al vacío..."></textarea>
                                </div>
                                <div className="costing-form-grid">
                                    <div className="form-group">
                                        <label htmlFor="shelfLife">Vida útil</label>
                                        <input type="text" id="shelfLife" value={formState.shelfLife} onChange={e => handleFormChange('shelfLife', e.target.value)} placeholder="Ej: 7 días"/>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="labeling">Etiquetado</label>
                                        <input type="text" id="labeling" value={formState.labeling} onChange={e => handleFormChange('labeling', e.target.value)} placeholder="Ej: Contiene sulfitos..."/>
                                    </div>
                                </div>
                                
                                <button type="submit" className="btn-submit">Guardar Ficha Técnica</button>
                            </form>
                        </div>
                    </div>
                </div>

                 <div className="costing-results-column">
                    {sheets.length > 0 ? sheets.map(sheet => {
                         const isExpanded = expandedSheetId === sheet.id;
                        return (
                             <div key={sheet.id} className="card costing-card">
                                <div 
                                    className="collapsible-header"
                                    onClick={() => setExpandedSheetId(isExpanded ? null : sheet.id)}
                                    role="button"
                                    aria-expanded={isExpanded}
                                >
                                    <h2 style={{borderBottom: 'none', paddingBottom: 0, marginBottom: 0}}>{sheet.productName}</h2>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                                        <div onClick={e => e.stopPropagation()}>
                                            {/* Edit button can be added here in the future */}
                                            <button className="btn-delete" onClick={() => handleDeleteSheet(sheet.id)}>Eliminar</button>
                                        </div>
                                        <span className={`chevron ${isExpanded ? 'open' : ''}`}>&#9660;</span>
                                    </div>
                                </div>
                                <div className={`collapsible-content ${isExpanded ? 'open' : ''}`}>
                                    <div className="collapsible-content-inner">
                                        <div className="record-details" style={{gridTemplateColumns: '1fr'}}>
                                            <div>
                                                <strong>Ingredientes</strong>
                                                <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: '5px 0' }}>
                                                    {sheet.ingredients.map((ing, index) => (
                                                        <li key={index}>
                                                            {ing.isAllergen ? <strong>{ing.name}</strong> : ing.name} (Lote: {ing.lot})
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div><strong>Elaboración</strong><span>{sheet.elaboration || 'N/A'}</span></div>
                                            <div><strong>Presentación Comercial</strong><span>{sheet.presentation || 'N/A'}</span></div>
                                            <div><strong>Vida Útil</strong><span>{sheet.shelfLife || 'N/A'}</span></div>
                                            <div><strong>Etiquetado</strong><span>{sheet.labeling || 'N/A'}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : <div className="card"><p>No hay fichas técnicas creadas.</p></div>}
                 </div>

            </div>
        </>
    );
};

export default TechnicalSheetsPage;
