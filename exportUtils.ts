import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { EstablishmentInfo } from './App'; // Importar interfaz

/**
 * Exporta datos a un archivo PDF con un aspecto limpio y profesional.
 * @param title - El título del documento.
 * @param headers - Un array de strings para las cabeceras de la tabla.
 * @param data - Un array de arrays, donde cada array interno es una fila.
 * @param fileName - El nombre del archivo a guardar (sin extensión).
 * @param establishmentInfo - Objeto con los detalles del establecimiento para añadir a la cabecera.
 * @param onSuccess - Callback para notificación de éxito.
 * @param onError - Callback para notificación de error.
 */
export const exportToPDF = (
  title: string, 
  headers: string[], 
  data: (string | number)[][], 
  fileName: string,
  establishmentInfo: EstablishmentInfo,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) => {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    
    // Cabecera del documento con información completa
    const establishmentName = establishmentInfo.name || 'Establecimiento';
    const sanitaryRegistry = establishmentInfo.sanitaryRegistry || 'N.R.S.';
    const cif = establishmentInfo.cif || '';
    const address = establishmentInfo.address || '';
    const city = establishmentInfo.city || '';
    const postalCode = establishmentInfo.postalCode || '';
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(establishmentName, 14, 15);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    if (address) {
      doc.text(`${address}, ${city} ${postalCode}`, 14, 22);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`N.R.S: ${sanitaryRegistry}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });
    if (cif) {
      doc.text(`CIF: ${cif}`, doc.internal.pageSize.width - 14, 22, { align: 'right' });
    }
    
    doc.line(14, 26, doc.internal.pageSize.width - 14, 26); // Línea horizontal

    // Título
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 34);
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 41, // Ajustado startY para la nueva cabecera extendida
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [0, 90, 156], // --primary-color
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: (data) => {
        // Pie de página
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
      }
    });

    doc.save(`${fileName}_${new Date().toISOString().slice(0,10)}.pdf`);
    onSuccess?.(`PDF "${fileName}" generado correctamente.`);
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    onError?.("Hubo un error al generar el PDF. Por favor, revise la consola para más detalles.");
  }
};


/**
 * Exporta un array de objetos a un archivo Excel.
 * @param data - Array de objetos a exportar. Cada objeto es una fila.
 * @param fileName - El nombre del archivo a guardar (sin extensión).
 * @param onSuccess - Callback para notificación de éxito.
 * @param onError - Callback para notificación de error.
 */
export const exportToExcel = (
    data: any[], 
    fileName: string,
    onSuccess?: (message: string) => void,
    onError?: (message: string) => void
) => {
    try {
        if (data.length === 0) {
            onError?.("No hay datos para exportar.");
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');
        
        // Autoajustar columnas calculando el ancho máximo para cada una
        const colWidths = Object.keys(data[0]).map(key => ({
             wch: Math.max(
                key.length, 
                ...data.map(row => String(row[key] || '').length)
            ) + 2
        }));

        worksheet["!cols"] = colWidths;

        XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0,10)}.xlsx`);
        onSuccess?.(`Excel "${fileName}" generado correctamente.`);
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        onError?.("Hubo un error al generar el archivo Excel. Por favor, revise la consola para más detalles.");
    }
};
/**
 * Exporta incidencias a PDF con formato específico para incidencias
 * @param incidents - Array de incidencias a exportar
 * @param establishmentInfo - Información del establecimiento
 * @param usersMap - Mapa de usuarios para resolver nombres
 * @param onSuccess - Callback de éxito
 * @param onError - Callback de error
 */
export const exportIncidentsToPDF = (
  incidents: any[],
  establishmentInfo: EstablishmentInfo,
  usersMap: Map<string, string>,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) => {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    
    // Cabecera del documento con información completa
    const establishmentName = establishmentInfo.name || 'Establecimiento';
    const sanitaryRegistry = establishmentInfo.sanitaryRegistry || 'N.R.S.';
    const cif = establishmentInfo.cif || '';
    const address = establishmentInfo.address || '';
    const city = establishmentInfo.city || '';
    const postalCode = establishmentInfo.postalCode || '';
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(establishmentName, 14, 15);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    if (address) {
      doc.text(`${address}, ${city} ${postalCode}`, 14, 22);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`N.R.S: ${sanitaryRegistry}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });
    if (cif) {
      doc.text(`CIF: ${cif}`, doc.internal.pageSize.width - 14, 22, { align: 'right' });
    }
    
    doc.line(14, 26, doc.internal.pageSize.width - 14, 26);

    // Título
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Registro de Incidencias', 14, 34);
    
    // Estadísticas resumidas
    const totalIncidents = incidents.length;
    const openIncidents = incidents.filter(i => i.status === 'Abierta').length;
    const inProgressIncidents = incidents.filter(i => i.status === 'En Proceso').length;
    const resolvedIncidents = incidents.filter(i => i.status === 'Resuelta').length;
    const criticalIncidents = incidents.filter(i => i.severity === 'Crítica').length;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total: ${totalIncidents} | Abiertas: ${openIncidents} | En Proceso: ${inProgressIncidents} | Resueltas: ${resolvedIncidents} | Críticas: ${criticalIncidents}`, 14, 42);

    // Preparar datos para la tabla
    const headers = ["Fecha", "Título", "Área", "Gravedad", "Estado", "Reportado por", "Acciones"];
    const data = incidents.map(incident => [
      new Date(incident.detectionDate).toLocaleDateString('es-ES'),
      incident.title.length > 30 ? incident.title.substring(0, 30) + '...' : incident.title,
      incident.affectedArea,
      incident.severity,
      incident.status,
      usersMap.get(incident.reportedBy) || 'N/A',
      incident.correctiveActions.length.toString()
    ]);
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 48,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [220, 53, 69], // Color rojo para incidencias
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        1: { cellWidth: 40 }, // Título más ancho
        2: { cellWidth: 25 }, // Área
        3: { cellWidth: 20 }, // Gravedad
        4: { cellWidth: 20 }, // Estado
        5: { cellWidth: 25 }, // Usuario
        6: { cellWidth: 15, halign: 'center' } // Acciones centrado
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
      }
    });

    doc.save(`registro_incidencias_${new Date().toISOString().slice(0,10)}.pdf`);
    onSuccess?.('PDF de incidencias generado correctamente.');
  } catch (error) {
    console.error("Error exporting incidents to PDF:", error);
    onError?.("Hubo un error al generar el PDF de incidencias.");
  }
};

/**
 * Exporta incidencias a Excel con formato específico para incidencias
 * @param incidents - Array de incidencias a exportar
 * @param usersMap - Mapa de usuarios para resolver nombres
 * @param onSuccess - Callback de éxito
 * @param onError - Callback de error
 */
export const exportIncidentsToExcel = (
  incidents: any[],
  usersMap: Map<string, string>,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) => {
  try {
    if (incidents.length === 0) {
      onError?.("No hay incidencias para exportar.");
      return;
    }

    // Preparar datos para Excel con información detallada
    const data = incidents.map(incident => ({
      "Fecha de Detección": new Date(incident.detectionDate).toLocaleDateString('es-ES'),
      "Título": incident.title,
      "Descripción": incident.description,
      "Área Afectada": incident.affectedArea,
      "Gravedad": incident.severity,
      "Estado": incident.status,
      "Reportado por": usersMap.get(incident.reportedBy) || 'N/A',
      "Acciones Correctivas": incident.correctiveActions.length,
      "Acciones Completadas": incident.correctiveActions.filter((a: any) => a.status === 'Completada').length,
      "Fecha de Creación": new Date(incident.createdAt).toLocaleDateString('es-ES'),
      "Última Actualización": new Date(incident.updatedAt).toLocaleDateString('es-ES')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Incidencias');
    
    // Autoajustar columnas
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length, 
        ...data.map(row => String(row[key as keyof typeof row] || '').length)
      ) + 2
    }));

    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `registro_incidencias_${new Date().toISOString().slice(0,10)}.xlsx`);
    onSuccess?.('Excel de incidencias generado correctamente.');
  } catch (error) {
    console.error("Error exporting incidents to Excel:", error);
    onError?.("Hubo un error al generar el archivo Excel de incidencias.");
  }
};

/**
 * Exporta reporte detallado de incidencias con acciones correctivas a PDF
 * @param incidents - Array de incidencias a exportar
 * @param establishmentInfo - Información del establecimiento
 * @param usersMap - Mapa de usuarios para resolver nombres
 * @param onSuccess - Callback de éxito
 * @param onError - Callback de error
 */
export const exportDetailedIncidentsReport = (
  incidents: any[],
  establishmentInfo: EstablishmentInfo,
  usersMap: Map<string, string>,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) => {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    
    // Cabecera del documento
    const establishmentName = establishmentInfo.name || 'Establecimiento';
    const sanitaryRegistry = establishmentInfo.sanitaryRegistry || 'N.R.S.';
    const cif = establishmentInfo.cif || '';
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(establishmentName, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`N.R.S: ${sanitaryRegistry}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });
    if (cif) {
      doc.text(`CIF: ${cif}`, doc.internal.pageSize.width - 14, 22, { align: 'right' });
    }
    
    doc.line(14, 26, doc.internal.pageSize.width - 14, 26);

    // Título
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('Reporte Detallado de Incidencias', 14, 34);
    
    let yPosition = 45;
    
    incidents.forEach((incident, index) => {
      // Verificar si necesitamos una nueva página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Información de la incidencia
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(`${index + 1}. ${incident.title}`, 14, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha: ${new Date(incident.detectionDate).toLocaleDateString('es-ES')} | Área: ${incident.affectedArea} | Gravedad: ${incident.severity} | Estado: ${incident.status}`, 14, yPosition);
      yPosition += 6;
      
      doc.text(`Reportado por: ${usersMap.get(incident.reportedBy) || 'N/A'}`, 14, yPosition);
      yPosition += 8;
      
      // Descripción
      doc.setFontSize(9);
      const descriptionLines = doc.splitTextToSize(incident.description, 180);
      doc.text(descriptionLines, 14, yPosition);
      yPosition += descriptionLines.length * 4 + 5;
      
      // Acciones correctivas
      if (incident.correctiveActions.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.text('Acciones Correctivas:', 14, yPosition);
        yPosition += 6;
        
        incident.correctiveActions.forEach((action: any, actionIndex: number) => {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`${actionIndex + 1}. ${action.description}`, 20, yPosition);
          yPosition += 4;
          doc.text(`   Fecha: ${new Date(action.implementationDate).toLocaleDateString('es-ES')} | Responsable: ${usersMap.get(action.responsibleUser) || 'N/A'} | Estado: ${action.status}`, 20, yPosition);
          yPosition += 6;
        });
      }
      
      yPosition += 5;
      doc.line(14, yPosition, doc.internal.pageSize.width - 14, yPosition);
      yPosition += 8;
    });

    doc.save(`reporte_detallado_incidencias_${new Date().toISOString().slice(0,10)}.pdf`);
    onSuccess?.('Reporte detallado de incidencias generado correctamente.');
  } catch (error) {
    console.error("Error exporting detailed incidents report:", error);
    onError?.("Hubo un error al generar el reporte detallado de incidencias.");
  }
};