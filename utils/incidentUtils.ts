// Utilidades específicas para incidencias
import { Incident, IncidentStatus, IncidentSeverity, CorrectiveAction } from '../App';

export interface IncidentStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  averageResolutionTime: number;
  oldestOpenIncident: Incident | null;
}

export const calculateIncidentStats = (incidents: Incident[]): IncidentStats => {
  const stats: IncidentStats = {
    total: incidents.length,
    open: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    averageResolutionTime: 0,
    oldestOpenIncident: null
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;
  let oldestOpenDate: Date | null = null;

  incidents.forEach(incident => {
    // Contar por estado
    switch (incident.status) {
      case 'Abierta':
        stats.open++;
        const incidentDate = new Date(incident.createdAt);
        if (!oldestOpenDate || incidentDate < oldestOpenDate) {
          oldestOpenDate = incidentDate;
          stats.oldestOpenIncident = incident;
        }
        break;
      case 'En Proceso':
        stats.inProgress++;
        break;
      case 'Resuelta':
        stats.resolved++;
        // Calcular tiempo de resolución
        const createdDate = new Date(incident.createdAt);
        const updatedDate = new Date(incident.updatedAt);
        const resolutionTime = updatedDate.getTime() - createdDate.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
        break;
    }

    // Contar por gravedad
    switch (incident.severity) {
      case 'Crítica':
        stats.critical++;
        break;
      case 'Alta':
        stats.high++;
        break;
      case 'Media':
        stats.medium++;
        break;
      case 'Baja':
        stats.low++;
        break;
    }
  });

  // Calcular tiempo promedio de resolución en días
  if (resolvedCount > 0) {
    stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24));
  }

  return stats;
};

export const getIncidentPriorityScore = (incident: Incident): number => {
  const severityScores = {
    'Crítica': 4,
    'Alta': 3,
    'Media': 2,
    'Baja': 1
  };

  const statusScores = {
    'Abierta': 3,
    'En Proceso': 2,
    'Resuelta': 1
  };

  const daysSinceCreated = Math.floor((Date.now() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const ageScore = Math.min(daysSinceCreated / 7, 3); // Máximo 3 puntos por antigüedad

  return severityScores[incident.severity] + statusScores[incident.status] + ageScore;
};

export const sortIncidentsByPriority = (incidents: Incident[]): Incident[] => {
  return [...incidents].sort((a, b) => getIncidentPriorityScore(b) - getIncidentPriorityScore(a));
};

export const getIncidentsByStatus = (incidents: Incident[], status: IncidentStatus): Incident[] => {
  return incidents.filter(incident => incident.status === status);
};

export const getIncidentsBySeverity = (incidents: Incident[], severity: IncidentSeverity): Incident[] => {
  return incidents.filter(incident => incident.severity === severity);
};

export const getIncidentsInDateRange = (incidents: Incident[], startDate: Date, endDate: Date): Incident[] => {
  return incidents.filter(incident => {
    const incidentDate = new Date(incident.detectionDate);
    return incidentDate >= startDate && incidentDate <= endDate;
  });
};

export const getOverdueIncidents = (incidents: Incident[], maxDaysOpen: number = 7): Incident[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDaysOpen);

  return incidents.filter(incident => {
    if (incident.status === 'Resuelta') return false;
    const createdDate = new Date(incident.createdAt);
    return createdDate < cutoffDate;
  });
};

export const getCriticalOpenIncidents = (incidents: Incident[]): Incident[] => {
  return incidents.filter(incident => 
    incident.severity === 'Crítica' && incident.status !== 'Resuelta'
  );
};

export const getIncidentCompletionRate = (incident: Incident): number => {
  if (incident.correctiveActions.length === 0) return 0;
  
  const completedActions = incident.correctiveActions.filter(action => action.status === 'Completada').length;
  return Math.round((completedActions / incident.correctiveActions.length) * 100);
};

export const getIncidentsWithPendingActions = (incidents: Incident[]): Incident[] => {
  return incidents.filter(incident => 
    incident.correctiveActions.some(action => action.status === 'Pendiente')
  );
};

export const getIncidentTrends = (incidents: Incident[], days: number = 30): {
  dates: string[];
  created: number[];
  resolved: number[];
} => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const dates: string[] = [];
  const created: number[] = [];
  const resolved: number[] = [];

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    
    dates.push(dateString);
    
    const createdCount = incidents.filter(incident => 
      incident.createdAt.split('T')[0] === dateString
    ).length;
    
    const resolvedCount = incidents.filter(incident => 
      incident.status === 'Resuelta' && incident.updatedAt.split('T')[0] === dateString
    ).length;
    
    created.push(createdCount);
    resolved.push(resolvedCount);
  }

  return { dates, created, resolved };
};

export const getTopAffectedAreas = (incidents: Incident[], limit: number = 5): Array<{
  area: string;
  count: number;
  percentage: number;
}> => {
  const areaCounts: { [key: string]: number } = {};
  
  incidents.forEach(incident => {
    areaCounts[incident.affectedArea] = (areaCounts[incident.affectedArea] || 0) + 1;
  });

  const sortedAreas = Object.entries(areaCounts)
    .map(([area, count]) => ({
      area,
      count,
      percentage: Math.round((count / incidents.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sortedAreas;
};

export const getIncidentSummary = (incident: Incident): string => {
  const completionRate = getIncidentCompletionRate(incident);
  const daysSinceCreated = Math.floor((Date.now() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  
  let summary = `${incident.severity} - ${incident.status}`;
  
  if (incident.status !== 'Resuelta') {
    summary += ` (${daysSinceCreated} días)`;
  }
  
  if (incident.correctiveActions.length > 0) {
    summary += ` - ${completionRate}% completado`;
  }
  
  return summary;
};

export const canResolveIncident = (incident: Incident): boolean => {
  if (incident.status === 'Resuelta') return false;
  if (incident.correctiveActions.length === 0) return false;
  
  return incident.correctiveActions.every(action => action.status === 'Completada');
};

export const getNextActionDue = (incident: Incident): CorrectiveAction | null => {
  const pendingActions = incident.correctiveActions
    .filter(action => action.status === 'Pendiente')
    .sort((a, b) => new Date(a.implementationDate).getTime() - new Date(b.implementationDate).getTime());
  
  return pendingActions.length > 0 ? pendingActions[0] : null;
};