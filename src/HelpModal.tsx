import React, { useState } from 'react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    page: string;
}

const HelpAccordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="help-accordion-item">
            <div className="help-accordion-header" onClick={() => setIsOpen(!isOpen)} role="button" aria-expanded={isOpen}>
                <span>{title}</span>
                <span className={`chevron ${isOpen ? 'open' : ''}`}>&#9660;</span>
            </div>
            {isOpen && (
                <div className="help-accordion-content">
                    {children}
                </div>
            )}
        </div>
    );
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, page }) => {
    if (!isOpen) return null;

    const getHelpContent = () => {
        switch (page) {
            case 'Panel Principal':
                return (
                    <>
                        <p>El <strong>Panel Principal</strong> le ofrece una vista rápida del estado de su negocio.</p>
                        <HelpAccordion title="¿Qué significan los widgets?">
                            <p>Cada tarjeta o "widget" resume información importante de los diferentes módulos:</p>
                            <ul>
                                <li><strong>Controles Pendientes Hoy:</strong> Muestra cuántas tareas de limpieza frecuente (de la sección Limpieza e Higiene) están vencidas o vencen hoy. Le ayuda a no olvidar ninguna tarea programada.</li>
                                <li><strong>Alertas de Temperatura:</strong> Indica el número de cámaras de almacenamiento cuya última temperatura registrada está fuera del rango óptimo que usted definió. Un número mayor que cero requiere su atención inmediata.</li>
                                <li><strong>Recepciones de Hoy:</strong> Es un contador simple de cuántas entregas de proveedores ha registrado en el día actual.</li>
                            </ul>
                        </HelpAccordion>
                    </>
                );
            case 'Recepción y Transporte':
                return (
                    <>
                        <p>Este módulo es para registrar y consultar todas las materias primas que llegan a su establecimiento.</p>
                        <HelpAccordion title="Cómo registrar una nueva recepción">
                            <p>El formulario principal "Registrar Recepción" es para documentar una nueva entrega.</p>
                            <ul>
                                <li>Seleccione el proveedor, el tipo de producto, la fecha y el usuario.</li>
                                <li>Introduzca la <strong>temperatura de entrega</strong> que midió en el producto. La app le mostrará la temperatura óptima como referencia.</li>
                                <li>Marque si la documentación (albaranes, etc.) es correcta.</li>
                                <li>Puede hacer una <strong>foto del albarán</strong> para tener un registro visual.</li>
                                <li>Pulse "Guardar Registro".</li>
                            </ul>
                        </HelpAccordion>
                        <HelpAccordion title="Cómo gestionar proveedores y productos">
                           <p>En la segunda columna, encontrará dos secciones colapsables:</p>
                            <ul>
                                <li><strong>Gestionar Proveedores:</strong> Aquí puede añadir o eliminar proveedores de su lista.</li>
                                <li><strong>Gestionar Tipos de Género:</strong> Le permite definir los productos que recibe y su temperatura óptima de conservación. Estos datos son cruciales para las alertas automáticas.</li>
                            </ul>
                        </HelpAccordion>
                         <HelpAccordion title="Consultar el historial">
                           <p>La tabla "Historial de Recepciones" muestra todos los registros guardados.</p>
                            <ul>
                                <li>Por defecto, las filas están colapsadas. Haga clic en una para <strong>ver todos los detalles</strong>.</li>
                                <li>Use los <strong>filtros de fecha</strong> para encontrar registros en un período específico.</li>
                                <li>Use los botones <strong>PDF</strong> y <strong>Excel</strong> para descargar los registros que está viendo.</li>
                            </ul>
                        </HelpAccordion>
                    </>
                );
            case 'Almacenamiento':
                 return (
                    <>
                        <p>Aquí puede llevar un control de la temperatura y condiciones de sus cámaras frigoríficas, expositoras y de secado.</p>
                        <HelpAccordion title="Registrar un control de temperatura">
                            <p>En el formulario "Registrar Control":</p>
                            <ul>
                                <li>Seleccione la cámara, la fecha/hora y el usuario.</li>
                                <li>Introduzca la <strong>temperatura</strong> medida.</li>
                                <li>Si la cámara es de <strong>secado</strong>, también deberá registrar la <strong>humedad</strong>.</li>
                                <li>Marque las casillas de verificación correspondientes al orden, rotación y picado.</li>
                                <li>Pulse "Guardar Registro".</li>
                            </ul>
                        </HelpAccordion>
                        <HelpAccordion title="Gestionar cámaras">
                           <p>En la sección "Gestionar Cámaras", puede añadir nuevas unidades de almacenamiento o eliminar las existentes.</p>
                            <ul>
                                <li>Al añadir una cámara, es muy importante definir su <strong>rango de temperatura óptima (mínima y máxima)</strong>. Esto activará las alertas en el Panel Principal si un registro está fuera de este rango.</li>
                                <li>También puede especificar si es una cámara normal, expositora o de secado.</li>
                            </ul>
                        </HelpAccordion>
                         <HelpAccordion title="Consultar el historial">
                           <p>La tabla "Historial de Controles" funciona de manera similar a la de Recepción. Puede expandir filas para ver detalles, filtrar por fecha y exportar los datos a PDF o Excel.</p>
                        </HelpAccordion>
                    </>
                );
            case 'Fichas Técnicas':
                return (
                     <>
                        <p>Este módulo le permite crear y gestionar las fichas técnicas detalladas de sus productos elaborados.</p>
                        <HelpAccordion title="Crear una nueva ficha técnica">
                            <p>Rellene el formulario con toda la información del producto:</p>
                            <ul>
                                <li><strong>Denominación:</strong> El nombre comercial del producto.</li>
                                <li><strong>Ingredientes:</strong> Pulse "+ Añadir Ingrediente" para añadir filas. Para cada uno, introduzca su nombre, lote y marque la casilla si es un <strong>alérgeno</strong> (se mostrará en negrita).</li>
                                <li><strong>Elaboración:</strong> Describa el proceso de fabricación.</li>
                                <li><strong>Presentación, Vida Útil y Etiquetado:</strong> Complete los campos restantes con la información para el consumidor.</li>
                                <li>Pulse "Guardar Ficha Técnica".</li>
                            </ul>
                        </HelpAccordion>
                         <HelpAccordion title="Consultar y eliminar fichas">
                           <p>Las fichas creadas aparecen a la derecha como tarjetas colapsables.</p>
                            <ul>
                                <li>Haga clic en una tarjeta para expandirla y ver todos los detalles.</li>
                                <li>Puede eliminar una ficha con el botón "Eliminar".</li>
                            </ul>
                        </HelpAccordion>
                    </>
                );
            default:
                return <p>Bienvenido al centro de ayuda. Navegue a un módulo específico para ver instrucciones detalladas.</p>;
        }
    };

    return (
        <div className="help-modal-overlay" onClick={onClose}>
            <div className="help-modal-content" onClick={e => e.stopPropagation()}>
                <div className="help-modal-header">
                    <h2>Centro de Ayuda: {page}</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Cerrar">&times;</button>
                </div>
                <div className="help-modal-body">
                    {getHelpContent()}
                </div>
            </div>
        </div>
    );
};

export default HelpModal;