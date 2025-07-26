// Utilidades para manejo de fechas

export const formatDate = (date: string | Date, locale: string = 'es-ES'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
};

export const formatDateTime = (date: string | Date, locale: string = 'es-ES'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(locale);
};

export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'hace unos segundos';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `hace ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `hace ${diffInYears} año${diffInYears > 1 ? 's' : ''}`;
};

export const isToday = (date: string | Date): boolean => {
  const today = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return today.toDateString() === dateObj.toDateString();
};

export const isThisWeek = (date: string | Date): boolean => {
  const today = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return dateObj >= startOfWeek && dateObj <= endOfWeek;
};

export const isThisMonth = (date: string | Date): boolean => {
  const today = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return today.getMonth() === dateObj.getMonth() && today.getFullYear() === dateObj.getFullYear();
};

export const getDaysDifference = (date1: string | Date, date2: string | Date): number => {
  const dateObj1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const dateObj2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const diffInTime = dateObj2.getTime() - dateObj1.getTime();
  return Math.ceil(diffInTime / (1000 * 3600 * 24));
};

export const addDays = (date: string | Date, days: number): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};

export const getWeekRange = (date: string | Date): { start: Date; end: Date } => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  const start = new Date(dateObj);
  start.setDate(dateObj.getDate() - dateObj.getDay());
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const getMonthRange = (date: string | Date): { start: Date; end: Date } => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  const end = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start, end };
};