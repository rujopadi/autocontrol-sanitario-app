// Utilidades para búsqueda y filtrado

export interface SearchOptions {
  caseSensitive?: boolean;
  exactMatch?: boolean;
  searchFields?: string[];
}

export const searchInText = (text: string, query: string, options: SearchOptions = {}): boolean => {
  if (!query.trim()) return true;
  
  const { caseSensitive = false, exactMatch = false } = options;
  
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchQuery = caseSensitive ? query : query.toLowerCase();
  
  if (exactMatch) {
    return searchText === searchQuery;
  }
  
  return searchText.includes(searchQuery);
};

export const searchInObject = (obj: any, query: string, options: SearchOptions = {}): boolean => {
  if (!query.trim()) return true;
  
  const { searchFields } = options;
  const fieldsToSearch = searchFields || Object.keys(obj);
  
  return fieldsToSearch.some(field => {
    const value = obj[field];
    if (typeof value === 'string') {
      return searchInText(value, query, options);
    }
    if (typeof value === 'number') {
      return searchInText(value.toString(), query, options);
    }
    return false;
  });
};

export const filterArray = <T>(
  array: T[],
  filters: { [key: string]: any },
  searchQuery?: string,
  searchOptions?: SearchOptions
): T[] => {
  return array.filter(item => {
    // Aplicar filtros específicos
    const passesFilters = Object.entries(filters).every(([key, value]) => {
      if (value === '' || value === null || value === undefined) return true;
      
      const itemValue = (item as any)[key];
      
      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }
      
      return itemValue === value;
    });
    
    if (!passesFilters) return false;
    
    // Aplicar búsqueda de texto
    if (searchQuery) {
      return searchInObject(item, searchQuery, searchOptions);
    }
    
    return true;
  });
};

export const sortArray = <T>(
  array: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aValue = (a as any)[sortBy];
    const bValue = (b as any)[sortBy];
    
    if (aValue === bValue) return 0;
    
    let comparison = 0;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
};

export const paginateArray = <T>(
  array: T[],
  page: number,
  pageSize: number
): {
  items: T[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
} => {
  const totalItems = array.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: array.slice(startIndex, endIndex),
    totalPages,
    currentPage,
    totalItems,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1
  };
};

export const highlightText = (text: string, query: string, className: string = 'highlight'): string => {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, `<span class="${className}">$1</span>`);
};

export const createDebouncer = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const getUniqueValues = <T>(array: T[], key: string): any[] => {
  const values = array.map(item => (item as any)[key]);
  return [...new Set(values)].filter(value => value !== null && value !== undefined);
};

export const groupBy = <T>(array: T[], key: string): { [key: string]: T[] } => {
  return array.reduce((groups, item) => {
    const groupKey = (item as any)[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as { [key: string]: T[] });
};

export const fuzzySearch = (text: string, query: string): number => {
  if (!query) return 1;
  if (query === text) return 1;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  if (textLower.includes(queryLower)) {
    return 0.8;
  }
  
  // Algoritmo simple de distancia de Levenshtein
  const matrix: number[][] = [];
  
  for (let i = 0; i <= queryLower.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= textLower.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= queryLower.length; i++) {
    for (let j = 1; j <= textLower.length; j++) {
      if (queryLower.charAt(i - 1) === textLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[queryLower.length][textLower.length];
  const maxLength = Math.max(queryLower.length, textLower.length);
  
  return 1 - (distance / maxLength);
};

export const fuzzySearchArray = <T>(
  array: T[],
  query: string,
  searchFields: string[],
  threshold: number = 0.3
): T[] => {
  if (!query.trim()) return array;
  
  return array
    .map(item => {
      const scores = searchFields.map(field => {
        const value = (item as any)[field];
        if (typeof value === 'string') {
          return fuzzySearch(value, query);
        }
        return 0;
      });
      
      const maxScore = Math.max(...scores);
      return { item, score: maxScore };
    })
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
};