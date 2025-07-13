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
 */
export const exportToPDF = (
  title: string, 
  headers: string[], 
  data: (string | number)[][], 
  fileName: string,
  establishmentInfo: EstablishmentInfo
) => {
  try {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    
    // Cabecera del documento
    const establishmentName = establishmentInfo.name || 'Establecimiento';
    const sanitaryRegistry = establishmentInfo.sanitaryRegistry || 'N/R.S.';
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(establishmentName, 14, 15);
    doc.text(`N.R.S: ${sanitaryRegistry}`, doc.internal.pageSize.width - 14, 15, { align: 'right' });
    doc.line(14, 17, doc.internal.pageSize.width - 14, 17); // Línea horizontal

    // Título
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 28);
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 35, // Ajustado startY para la nueva cabecera
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
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    alert("Hubo un error al generar el PDF. Por favor, revise la consola para más detalles.");
  }
};


/**
 * Exporta un array de objetos a un archivo Excel.
 * @param data - Array de objetos a exportar. Cada objeto es una fila.
 * @param fileName - El nombre del archivo a guardar (sin extensión).
 */
export const exportToExcel = (data: any[], fileName: string) => {
    try {
        if (data.length === 0) {
            alert("No hay datos para exportar.");
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
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        alert("Hubo un error al generar el archivo Excel. Por favor, revise la consola para más detalles.");
    }
};
