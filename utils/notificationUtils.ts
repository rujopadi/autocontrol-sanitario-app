// Utilidades para notificaciones específicas del sistema
import { NotificationType } from '../NotificationContext';

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

// Templates para incidencias
export const incidentNotifications = {
  created: (title: string): NotificationTemplate => ({
    type: 'success',
    title: 'Incidencia registrada',
    message: `La incidencia "${title}" se ha registrado correctamente.`,
    duration: 4000
  }),

  updated: (title: string): NotificationTemplate => ({
    type: 'info',
    title: 'Incidencia actualizada',
    message: `La incidencia "${title}" se ha actualizado correctamente.`,
    duration: 3000
  }),

  deleted: (title: string): NotificationTemplate => ({
    type: 'success',
    title: 'Incidencia eliminada',
    message: `La incidencia "${title}" se ha eliminado correctamente.`,
    duration: 3000
  }),

  resolved: (title: string): NotificationTemplate => ({
    type: 'success',
    title: 'Incidencia resuelta',
    message: `La incidencia "${title}" ha sido marcada como resuelta.`,
    duration: 4000
  }),

  reopened: (title: string): NotificationTemplate => ({
    type: 'warning',
    title: 'Incidencia reabierta',
    message: `La incidencia "${title}" ha sido reabierta.`,
    duration: 4000
  }),

  criticalCreated: (title: string): NotificationTemplate => ({
    type: 'error',
    title: '¡Incidencia crítica registrada!',
    message: `Se ha registrado una incidencia crítica: "${title}". Requiere atención inmediata.`,
    persistent: true
  }),

  overdue: (title: string, days: number): NotificationTemplate => ({
    type: 'warning',
    title: 'Incidencia vencida',
    message: `La incidencia "${title}" lleva ${days} días sin resolver.`,
    duration: 6000
  })
};

// Templates para acciones correctivas
export const correctiveActionNotifications = {
  created: (incidentTitle: string): NotificationTemplate => ({
    type: 'success',
    title: 'Acción correctiva registrada',
    message: `Se ha añadido una acción correctiva para "${incidentTitle}".`,
    duration: 3000
  }),

  completed: (incidentTitle: string): NotificationTemplate => ({
    type: 'success',
    title: 'Acción correctiva completada',
    message: `Se ha completado una acción correctiva para "${incidentTitle}".`,
    duration: 4000
  }),

  updated: (): NotificationTemplate => ({
    type: 'info',
    title: 'Acción correctiva actualizada',
    message: 'La acción correctiva se ha actualizado correctamente.',
    duration: 3000
  }),

  deleted: (): NotificationTemplate => ({
    type: 'success',
    title: 'Acción correctiva eliminada',
    message: 'La acción correctiva se ha eliminado correctamente.',
    duration: 3000
  }),

  allCompleted: (incidentTitle: string): NotificationTemplate => ({
    type: 'success',
    title: '¡Todas las acciones completadas!',
    message: `Todas las acciones correctivas para "${incidentTitle}" han sido completadas. La incidencia puede ser resuelta.`,
    duration: 5000
  })
};

// Templates para gestión de empresa
export const companyNotifications = {
  updated: (): NotificationTemplate => ({
    type: 'success',
    title: 'Información de empresa actualizada',
    message: 'Los datos de la empresa se han guardado correctamente.',
    duration: 3000
  }),

  validationError: (field: string): NotificationTemplate => ({
    type: 'error',
    title: 'Error de validación',
    message: `Por favor, corrija el campo: ${field}`,
    duration: 4000
  }),

  saveError: (): NotificationTemplate => ({
    type: 'error',
    title: 'Error al guardar',
    message: 'No se pudo guardar la información de la empresa. Inténtelo de nuevo.',
    persistent: true
  })
};

// Templates para gestión de usuarios
export const userNotifications = {
  created: (name: string): NotificationTemplate => ({
    type: 'success',
    title: 'Usuario creado',
    message: `El usuario "${name}" se ha creado correctamente.`,
    duration: 3000
  }),

  updated: (name: string): NotificationTemplate => ({
    type: 'success',
    title: 'Usuario actualizado',
    message: `Los datos de "${name}" se han actualizado correctamente.`,
    duration: 3000
  }),

  deleted: (name: string): NotificationTemplate => ({
    type: 'success',
    title: 'Usuario eliminado',
    message: `El usuario "${name}" ha sido eliminado correctamente.`,
    duration: 3000
  }),

  activated: (name: string): NotificationTemplate => ({
    type: 'success',
    title: 'Usuario activado',
    message: `El usuario "${name}" ha sido activado correctamente.`,
    duration: 3000
  }),

  deactivated: (name: string): NotificationTemplate => ({
    type: 'warning',
    title: 'Usuario desactivado',
    message: `El usuario "${name}" ha sido desactivado correctamente.`,
    duration: 3000
  }),

  permissionDenied: (action: string): NotificationTemplate => ({
    type: 'error',
    title: 'Acción no permitida',
    message: `No tienes permisos para ${action}.`,
    duration: 4000
  }),

  lastAdminWarning: (): NotificationTemplate => ({
    type: 'warning',
    title: 'Último administrador',
    message: 'Debe haber al menos un administrador en el sistema.',
    duration: 5000
  })
};

// Templates para exportación
export const exportNotifications = {
  pdfSuccess: (fileName: string): NotificationTemplate => ({
    type: 'success',
    title: 'PDF generado',
    message: `El archivo "${fileName}" se ha generado correctamente.`,
    duration: 3000
  }),

  excelSuccess: (fileName: string): NotificationTemplate => ({
    type: 'success',
    title: 'Excel generado',
    message: `El archivo "${fileName}" se ha generado correctamente.`,
    duration: 3000
  }),

  exportError: (format: string): NotificationTemplate => ({
    type: 'error',
    title: 'Error en exportación',
    message: `No se pudo generar el archivo ${format}. Inténtelo de nuevo.`,
    duration: 5000
  }),

  noData: (): NotificationTemplate => ({
    type: 'warning',
    title: 'Sin datos para exportar',
    message: 'No hay datos disponibles para exportar con los filtros seleccionados.',
    duration: 4000
  })
};

// Templates para validación
export const validationNotifications = {
  formErrors: (errorCount: number): NotificationTemplate => ({
    type: 'error',
    title: 'Errores en el formulario',
    message: `Por favor, corrija ${errorCount} error${errorCount > 1 ? 'es' : ''} en el formulario.`,
    duration: 5000
  }),

  requiredFields: (): NotificationTemplate => ({
    type: 'warning',
    title: 'Campos requeridos',
    message: 'Por favor, complete todos los campos obligatorios.',
    duration: 4000
  }),

  invalidFormat: (field: string): NotificationTemplate => ({
    type: 'error',
    title: 'Formato inválido',
    message: `El formato del campo "${field}" no es válido.`,
    duration: 4000
  })
};

// Templates para sistema general
export const systemNotifications = {
  connectionError: (): NotificationTemplate => ({
    type: 'error',
    title: 'Error de conexión',
    message: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
    persistent: true
  }),

  sessionExpired: (): NotificationTemplate => ({
    type: 'warning',
    title: 'Sesión expirada',
    message: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
    persistent: true
  }),

  unsavedChanges: (): NotificationTemplate => ({
    type: 'warning',
    title: 'Cambios sin guardar',
    message: 'Tiene cambios sin guardar. ¿Está seguro de que desea salir?',
    persistent: true
  }),

  operationSuccess: (operation: string): NotificationTemplate => ({
    type: 'success',
    title: 'Operación exitosa',
    message: `${operation} se ha completado correctamente.`,
    duration: 3000
  }),

  operationError: (operation: string): NotificationTemplate => ({
    type: 'error',
    title: 'Error en operación',
    message: `No se pudo completar: ${operation}. Inténtelo de nuevo.`,
    duration: 5000
  })
};

// Función helper para mostrar notificaciones con templates
export const showNotification = (
  notificationFunction: (title: string, message?: string, durationOrPersistent?: number | boolean) => void,
  template: NotificationTemplate
) => {
  if (template.persistent) {
    notificationFunction(template.title, template.message, true);
  } else {
    notificationFunction(template.title, template.message, template.duration);
  }
};

// Función para crear notificaciones personalizadas
export const createCustomNotification = (
  type: NotificationType,
  title: string,
  message?: string,
  options?: {
    duration?: number;
    persistent?: boolean;
  }
): NotificationTemplate => ({
  type,
  title,
  message,
  duration: options?.duration || 4000,
  persistent: options?.persistent || false
});

// Función para notificaciones de progreso
export const createProgressNotification = (
  operation: string,
  progress: number
): NotificationTemplate => ({
  type: 'info',
  title: `${operation} en progreso`,
  message: `Completado: ${progress}%`,
  duration: 1000
});

// Función para notificaciones de confirmación
export const createConfirmationNotification = (
  action: string,
  callback: () => void
): NotificationTemplate => ({
  type: 'warning',
  title: 'Confirmar acción',
  message: `¿Está seguro de que desea ${action}?`,
  persistent: true
});