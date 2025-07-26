# Design Document

## Overview

Este diseño extiende la aplicación de Autocontrol Sanitario Pro con dos nuevas funcionalidades principales: un módulo completo de gestión de incidencias y una mejora significativa del sistema de gestión de empresa y usuarios. El diseño mantiene la arquitectura existente basada en React + TypeScript con estado local y comunicación con backend REST API.

## Architecture

### System Architecture
La aplicación mantiene su arquitectura actual:
- **Frontend**: React 18 + TypeScript con estado local en App.tsx
- **Backend**: API REST con autenticación JWT
- **Database**: MongoDB (inferido del uso de string IDs)
- **State Management**: React hooks con estado elevado en App.tsx
- **UI Pattern**: Páginas modulares con componentes reutilizables

### New Components Integration
```
App.tsx (Estado principal)
├── Dashboard.tsx (Navegación)
├── IncidentsPage.tsx (Nueva página)
├── CompanyManagementPage.tsx (Nueva página)
└── UsersPage.tsx (Mejorada)
```

## Components and Interfaces

### Data Models

#### Incident Interface
```typescript
export interface Incident {
  id: string;
  title: string;
  description: string;
  detectionDate: string; // ISO string
  affectedArea: string;
  severity: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  status: 'Abierta' | 'En Proceso' | 'Resuelta';
  reportedBy: string; // User ID
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  correctiveActions: CorrectiveAction[];
}

export interface CorrectiveAction {
  id: string;
  incidentId: string;
  description: string;
  implementationDate: string; // ISO string
  responsibleUser: string; // User ID
  status: 'Pendiente' | 'En Progreso' | 'Completada';
  createdAt: string; // ISO string
}
```

#### Enhanced User Interface
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Administrador' | 'Usuario' | 'Solo Lectura';
  isActive: boolean;
  isAdmin?: boolean; // Mantener compatibilidad
  createdAt: string;
  updatedAt: string;
}
```

#### Enhanced EstablishmentInfo Interface
```typescript
export interface EstablishmentInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  cif: string;
  sanitaryRegistry: string;
  technicalResponsible: string;
  updatedAt: string;
}
```

### Component Architecture

#### IncidentsPage Component
```typescript
interface IncidentsPageProps {
  users: User[];
  incidents: Incident[];
  onAddIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'correctiveActions'>) => void;
  onUpdateIncident: (id: string, updates: Partial<Incident>) => void;
  onDeleteIncident: (id: string) => void;
  onAddCorrectiveAction: (action: Omit<CorrectiveAction, 'id' | 'createdAt'>) => void;
  onUpdateCorrectiveAction: (id: string, updates: Partial<CorrectiveAction>) => void;
  onDeleteCorrectiveAction: (id: string) => void;
  establishmentInfo: EstablishmentInfo;
}
```

**Sub-components:**
- `IncidentForm`: Formulario para crear/editar incidencias
- `IncidentList`: Lista filtrable de incidencias
- `IncidentDetails`: Vista detallada con acciones correctivas
- `CorrectiveActionForm`: Formulario para acciones correctivas
- `IncidentFilters`: Controles de filtrado y búsqueda

#### CompanyManagementPage Component
```typescript
interface CompanyManagementPageProps {
  establishmentInfo: EstablishmentInfo;
  onUpdateEstablishmentInfo: (info: EstablishmentInfo) => void;
  currentUser: User;
}
```

**Sub-components:**
- `CompanyInfoForm`: Formulario completo de datos empresariales
- `CompanyInfoDisplay`: Vista de solo lectura de información

#### Enhanced UsersPage Component
Extensión del componente existente con:
- Gestión de roles avanzada
- Control de estado activo/inactivo
- Historial de cambios
- Validaciones mejoradas

## Data Models

### Database Schema Extensions

#### Incidents Collection
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String (required),
  detectionDate: Date (required),
  affectedArea: String (required),
  severity: String (enum: ['Baja', 'Media', 'Alta', 'Crítica']),
  status: String (enum: ['Abierta', 'En Proceso', 'Resuelta']),
  reportedBy: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

#### CorrectiveActions Collection
```javascript
{
  _id: ObjectId,
  incidentId: ObjectId (ref: 'Incident'),
  description: String (required),
  implementationDate: Date (required),
  responsibleUser: ObjectId (ref: 'User'),
  status: String (enum: ['Pendiente', 'En Progreso', 'Completada']),
  createdAt: Date
}
```

#### Enhanced Users Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (hashed),
  role: String (enum: ['Administrador', 'Usuario', 'Solo Lectura']),
  isActive: Boolean (default: true),
  isAdmin: Boolean, // Mantener para compatibilidad
  createdAt: Date,
  updatedAt: Date
}
```

#### Enhanced Establishment Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  address: String (required),
  city: String (required),
  postalCode: String (required),
  phone: String (required),
  email: String (required),
  cif: String (required),
  sanitaryRegistry: String (required),
  technicalResponsible: String (required),
  updatedAt: Date
}
```

## Error Handling

### Client-Side Error Handling
- Mantener el patrón existente con `useNotifications` hook
- Validación de formularios con mensajes específicos
- Manejo de estados de carga y error en operaciones async
- Confirmaciones para acciones destructivas

### Server-Side Error Handling
- Validación de datos de entrada
- Manejo de errores de base de datos
- Respuestas de error consistentes con formato JSON
- Logging de errores para debugging

### Validation Rules

#### Incident Validation
- `title`: Requerido, mínimo 3 caracteres, máximo 100
- `description`: Requerido, mínimo 10 caracteres, máximo 1000
- `affectedArea`: Requerido, máximo 50 caracteres
- `severity`: Debe ser uno de los valores enum
- `detectionDate`: Fecha válida, no futura

#### Company Info Validation
- `name`: Requerido, mínimo 2 caracteres
- `email`: Formato de email válido
- `phone`: Formato de teléfono español
- `cif`: Formato CIF/NIF válido
- `sanitaryRegistry`: Requerido, formato alfanumérico

#### User Validation
- `email`: Formato válido, único en sistema
- `name`: Requerido, mínimo 2 caracteres
- `role`: Debe ser uno de los valores enum
- `password`: Mínimo 6 caracteres (solo en creación/cambio)

## Testing Strategy

### Unit Testing
- Componentes de formulario con validaciones
- Funciones de utilidad para formateo de datos
- Hooks personalizados para manejo de estado
- Validadores de datos

### Integration Testing
- Flujos completos de CRUD para incidencias
- Integración con sistema de notificaciones
- Exportación de datos con nuevas funcionalidades
- Autenticación y autorización

### User Acceptance Testing
- Flujo completo de gestión de incidencias
- Gestión de empresa por administradores
- Gestión de usuarios con diferentes roles
- Exportación de reportes incluyendo nuevos datos

### API Testing
- Endpoints de incidencias (CRUD)
- Endpoints de acciones correctivas (CRUD)
- Endpoint de actualización de empresa
- Endpoints de usuarios mejorados
- Validación de permisos por rol

## UI/UX Design Patterns

### Consistent Design Language
- Mantener el sistema de cards existente
- Usar los mismos patrones de formulario
- Conservar el sistema de colores y tipografía
- Aplicar los mismos patrones de navegación

### Responsive Design
- Tablas responsivas para listados de incidencias
- Formularios adaptables en móviles
- Navegación optimizada para diferentes pantallas

### Accessibility
- Labels apropiados en formularios
- Navegación por teclado
- Contraste adecuado en elementos de estado
- Mensajes de error claros y descriptivos

## Security Considerations

### Authorization
- Verificar permisos de administrador para gestión de empresa
- Control de acceso basado en roles para usuarios
- Validar propiedad de incidencias para edición
- Proteger endpoints sensibles en backend

### Data Protection
- Sanitización de inputs en formularios
- Validación de datos en cliente y servidor
- Encriptación de contraseñas de usuarios
- Logging seguro sin datos sensibles

## Performance Considerations

### Client-Side Optimization
- Lazy loading de componentes grandes
- Memoización de cálculos costosos
- Paginación para listas grandes de incidencias
- Debouncing en filtros de búsqueda

### Server-Side Optimization
- Índices apropiados en base de datos
- Paginación en endpoints de listado
- Caching de datos de empresa
- Optimización de queries con populate

## Migration Strategy

### Database Migration
- Scripts para crear nuevas colecciones
- Migración de datos existentes de usuarios
- Actualización de esquema de establishment
- Índices para nuevas funcionalidades

### Code Migration
- Extensión gradual de interfaces existentes
- Mantener compatibilidad con código actual
- Actualización progresiva de componentes
- Testing exhaustivo de regresión