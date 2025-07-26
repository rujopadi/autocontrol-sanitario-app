// Utilidades de validación para el sistema de autocontrol sanitario

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

// Validaciones para incidencias
export const validateIncidentTitle = (title: string): ValidationResult => {
  if (!title.trim()) {
    return { isValid: false, message: 'El título es obligatorio' };
  }
  if (title.trim().length < 3) {
    return { isValid: false, message: 'El título debe tener al menos 3 caracteres' };
  }
  if (title.trim().length > 100) {
    return { isValid: false, message: 'El título no puede exceder 100 caracteres' };
  }
  return { isValid: true, message: '' };
};

export const validateIncidentDescription = (description: string): ValidationResult => {
  if (!description.trim()) {
    return { isValid: false, message: 'La descripción es obligatoria' };
  }
  if (description.trim().length < 10) {
    return { isValid: false, message: 'La descripción debe tener al menos 10 caracteres' };
  }
  if (description.trim().length > 1000) {
    return { isValid: false, message: 'La descripción no puede exceder 1000 caracteres' };
  }
  return { isValid: true, message: '' };
};

export const validateIncidentArea = (area: string): ValidationResult => {
  if (!area.trim()) {
    return { isValid: false, message: 'El área afectada es obligatoria' };
  }
  if (area.trim().length > 50) {
    return { isValid: false, message: 'El área no puede exceder 50 caracteres' };
  }
  return { isValid: true, message: '' };
};

export const validateIncidentDate = (date: string): ValidationResult => {
  if (!date) {
    return { isValid: false, message: 'La fecha de detección es obligatoria' };
  }
  
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Final del día actual
  
  if (selectedDate > today) {
    return { isValid: false, message: 'La fecha de detección no puede ser futura' };
  }
  
  // No permitir fechas muy antiguas (más de 1 año)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (selectedDate < oneYearAgo) {
    return { isValid: false, message: 'La fecha de detección no puede ser anterior a un año' };
  }
  
  return { isValid: true, message: '' };
};

// Validaciones para información de empresa
export const validateCompanyName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, message: 'El nombre de la empresa es obligatorio' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, message: 'El nombre debe tener al menos 2 caracteres' };
  }
  if (name.trim().length > 100) {
    return { isValid: false, message: 'El nombre no puede exceder 100 caracteres' };
  }
  return { isValid: true, message: '' };
};

export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, message: 'El email es obligatorio' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Formato de email inválido' };
  }
  
  return { isValid: true, message: '' };
};

export const validatePhone = (phone: string): ValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, message: 'El teléfono es obligatorio' };
  }
  
  // Remover espacios y caracteres especiales para validación
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Validar formato español (9 dígitos empezando por 6, 7, 8 o 9)
  const phoneRegex = /^[6-9]\d{8}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, message: 'Formato de teléfono inválido (debe ser un móvil español de 9 dígitos)' };
  }
  
  return { isValid: true, message: '' };
};

export const validateCIF = (cif: string): ValidationResult => {
  if (!cif.trim()) {
    return { isValid: false, message: 'El CIF/NIF es obligatorio' };
  }
  
  const cleanCIF = cif.trim().toUpperCase();
  
  // Validar formato CIF (letra + 8 dígitos) o NIF (8 dígitos + letra)
  const cifRegex = /^[A-Z]\d{8}$/;
  const nifRegex = /^\d{8}[A-Z]$/;
  
  if (!cifRegex.test(cleanCIF) && !nifRegex.test(cleanCIF)) {
    return { isValid: false, message: 'Formato CIF/NIF inválido (ej: A12345678 o 12345678Z)' };
  }
  
  return { isValid: true, message: '' };
};

export const validateSanitaryRegistry = (registry: string): ValidationResult => {
  if (!registry.trim()) {
    return { isValid: false, message: 'El registro sanitario es obligatorio' };
  }
  if (registry.trim().length < 5) {
    return { isValid: false, message: 'El registro sanitario debe tener al menos 5 caracteres' };
  }
  if (registry.trim().length > 50) {
    return { isValid: false, message: 'El registro sanitario no puede exceder 50 caracteres' };
  }
  return { isValid: true, message: '' };
};

export const validatePostalCode = (postalCode: string): ValidationResult => {
  if (!postalCode.trim()) {
    return { isValid: false, message: 'El código postal es obligatorio' };
  }
  
  const postalRegex = /^\d{5}$/;
  if (!postalRegex.test(postalCode)) {
    return { isValid: false, message: 'El código postal debe tener 5 dígitos' };
  }
  
  return { isValid: true, message: '' };
};

export const validateAddress = (address: string): ValidationResult => {
  if (!address.trim()) {
    return { isValid: false, message: 'La dirección es obligatoria' };
  }
  if (address.trim().length < 5) {
    return { isValid: false, message: 'La dirección debe tener al menos 5 caracteres' };
  }
  if (address.trim().length > 200) {
    return { isValid: false, message: 'La dirección no puede exceder 200 caracteres' };
  }
  return { isValid: true, message: '' };
};

// Validaciones para usuarios
export const validateUserName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, message: 'El nombre es obligatorio' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, message: 'El nombre debe tener al menos 2 caracteres' };
  }
  if (name.trim().length > 100) {
    return { isValid: false, message: 'El nombre no puede exceder 100 caracteres' };
  }
  return { isValid: true, message: '' };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, message: 'La contraseña es obligatoria' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }
  if (password.length > 50) {
    return { isValid: false, message: 'La contraseña no puede exceder 50 caracteres' };
  }
  return { isValid: true, message: '' };
};

// Función para validar un objeto completo
export const validateIncident = (incident: any): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  const titleValidation = validateIncidentTitle(incident.title || '');
  if (!titleValidation.isValid) errors.title = titleValidation.message;
  
  const descriptionValidation = validateIncidentDescription(incident.description || '');
  if (!descriptionValidation.isValid) errors.description = descriptionValidation.message;
  
  const areaValidation = validateIncidentArea(incident.affectedArea || '');
  if (!areaValidation.isValid) errors.affectedArea = areaValidation.message;
  
  const dateValidation = validateIncidentDate(incident.detectionDate || '');
  if (!dateValidation.isValid) errors.detectionDate = dateValidation.message;
  
  return errors;
};

export const validateCompanyInfo = (info: any): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  const nameValidation = validateCompanyName(info.name || '');
  if (!nameValidation.isValid) errors.name = nameValidation.message;
  
  const emailValidation = validateEmail(info.email || '');
  if (!emailValidation.isValid) errors.email = emailValidation.message;
  
  const phoneValidation = validatePhone(info.phone || '');
  if (!phoneValidation.isValid) errors.phone = phoneValidation.message;
  
  const cifValidation = validateCIF(info.cif || '');
  if (!cifValidation.isValid) errors.cif = cifValidation.message;
  
  const registryValidation = validateSanitaryRegistry(info.sanitaryRegistry || '');
  if (!registryValidation.isValid) errors.sanitaryRegistry = registryValidation.message;
  
  const postalValidation = validatePostalCode(info.postalCode || '');
  if (!postalValidation.isValid) errors.postalCode = postalValidation.message;
  
  const addressValidation = validateAddress(info.address || '');
  if (!addressValidation.isValid) errors.address = addressValidation.message;
  
  if (!info.city?.trim()) errors.city = 'La ciudad es obligatoria';
  if (!info.technicalResponsible?.trim()) errors.technicalResponsible = 'El responsable técnico es obligatorio';
  
  return errors;
};

export const validateUser = (user: any, isEdit: boolean = false): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  const nameValidation = validateUserName(user.name || '');
  if (!nameValidation.isValid) errors.name = nameValidation.message;
  
  const emailValidation = validateEmail(user.email || '');
  if (!emailValidation.isValid) errors.email = emailValidation.message;
  
  if (!isEdit) {
    const passwordValidation = validatePassword(user.password || '');
    if (!passwordValidation.isValid) errors.password = passwordValidation.message;
  }
  
  return errors;
};

// Utilidad para mostrar errores de confirmación
export const getConfirmationMessage = (action: string, itemName: string): string => {
  const messages: { [key: string]: string } = {
    delete: `¿Está seguro de que desea eliminar "${itemName}"? Esta acción no se puede deshacer.`,
    deactivate: `¿Está seguro de que desea desactivar al usuario "${itemName}"?`,
    activate: `¿Está seguro de que desea activar al usuario "${itemName}"?`,
    resolve: `¿Está seguro de que desea marcar la incidencia "${itemName}" como resuelta?`,
    reopen: `¿Está seguro de que desea reabrir la incidencia "${itemName}"?`
  };
  
  return messages[action] || `¿Está seguro de que desea ${action} "${itemName}"?`;
};