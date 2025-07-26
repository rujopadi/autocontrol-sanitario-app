# Design Document - Sistema de Usuarios Colaborativos

## Overview

El sistema de usuarios colaborativos permitirá que múltiples usuarios trabajen con los mismos datos de empresa, manteniendo la trazabilidad de quién registra cada entrada. La implementación se basa en la estructura existente de usuarios pero añade funcionalidad para crear usuarios asociados a la misma empresa y campos de responsabilidad en todos los registros.

## Architecture

### Data Model Extensions

```typescript
// Extensión del modelo User existente
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'Administrador' | 'Usuario';
  isActive: boolean;
  companyId: string; // Nuevo campo para asociar usuarios a empresa
  createdAt: string;
  createdBy?: string; // ID del usuario que creó este usuario
}

// Extensión para todos los registros existentes
interface BaseRecord {
  // ... campos existentes
  registeredBy: string; // Nombre del usuario que registró
  registeredById: string; // ID del usuario que registró
  registeredAt: string; // Fecha y hora del registro
}
```

### Company Association Strategy

1. **Identificación de Empresa**: Usar el ID del primer usuario registrado como `companyId`
2. **Usuarios Colaboradores**: Todos los usuarios creados por un administrador heredan su `companyId`
3. **Aislamiento de Datos**: Todos los queries filtran por `companyId` del usuario actual

## Components and Interfaces

### 1. Enhanced User Management

**Componente**: `UsersPage.tsx` (modificado)
- Añadir funcionalidad "Crear Usuario Colaborador"
- Mostrar solo usuarios de la misma empresa
- Gestión de estados activo/inactivo

**Nuevas Props**:
```typescript
interface UsersPageProps {
  // ... props existentes
  currentUserCompanyId: string;
  onCreateCollaborator: (userData: CollaboratorData) => void;
}

interface CollaboratorData {
  name: string;
  email: string;
  password: string;
  role: 'Usuario'; // Solo usuarios, no administradores
}
```

### 2. User Selector Component

**Componente**: `UserSelector.tsx` (nuevo)
```typescript
interface UserSelectorProps {
  users: User[];
  selectedUserId: string;
  onUserSelect: (userId: string, userName: string) => void;
  required?: boolean;
  label?: string;
}
```

**Funcionalidad**:
- Dropdown con usuarios activos de la empresa
- Búsqueda por nombre
- Pre-selección automática si solo hay un usuario
- Validación requerida

### 3. Record Registration Enhancement

**Modificaciones en formularios existentes**:
- `ReceptionPage.tsx`
- `StoragePage.tsx`
- `TechnicalSheetsPage.tsx`
- `TraceabilityPage.tsx`
- `IncidentsPage.tsx`
- Todos los formularios de registro

**Cambios requeridos**:
```typescript
// Añadir a todos los formularios
const [registeredBy, setRegisteredBy] = useState('');
const [registeredById, setRegisteredById] = useState('');

// Validación
if (!registeredBy) {
  errors.registeredBy = 'Debe seleccionar quién registra';
}

// Al guardar
const recordData = {
  // ... datos existentes
  registeredBy,
  registeredById,
  registeredAt: new Date().toISOString()
};
```

## Data Models

### Updated Storage Schema

```typescript
// Estructura de localStorage actualizada
interface AppData {
  users: User[];
  companies: Company[]; // Nuevo para gestión de empresas
  
  // Todos los registros existentes con campos adicionales
  receptionRecords: (ReceptionRecord & BaseRecord)[];
  storageRecords: (StorageRecord & BaseRecord)[];
  technicalSheets: (TechnicalSheet & BaseRecord)[];
  traceabilityRecords: (TraceabilityRecord & BaseRecord)[];
  incidents: (Incident & BaseRecord)[];
  // ... otros registros
}

interface Company {
  id: string;
  name: string;
  sanitaryRegistry: string;
  createdAt: string;
  adminUserId: string; // Usuario administrador principal
}
```

### Migration Strategy

```typescript
// Función para migrar datos existentes
function migrateExistingData() {
  const users = getStoredUsers();
  const currentUser = getCurrentUser();
  
  // Asignar companyId a usuarios existentes
  users.forEach(user => {
    if (!user.companyId) {
      user.companyId = currentUser.id; // Usar ID del usuario actual como empresa
    }
  });
  
  // Migrar registros existentes
  const allRecords = getAllRecords();
  allRecords.forEach(record => {
    if (!record.registeredBy) {
      record.registeredBy = currentUser.name;
      record.registeredById = currentUser.id;
      record.registeredAt = record.date || new Date().toISOString();
    }
  });
  
  saveUpdatedData();
}
```

## Error Handling

### Validation Rules

1. **Usuario Selector**: Siempre requerido en formularios
2. **Email Único**: Validar que email no existe en todo el sistema
3. **Empresa Válida**: Verificar que usuario pertenece a empresa correcta
4. **Usuario Activo**: Solo usuarios activos pueden ser seleccionados

### Error Messages

```typescript
const ERROR_MESSAGES = {
  USER_REQUIRED: 'Debe seleccionar quién registra esta información',
  EMAIL_EXISTS: 'Este email ya está registrado en el sistema',
  USER_INACTIVE: 'El usuario seleccionado está inactivo',
  COMPANY_MISMATCH: 'Error de seguridad: datos de empresa incorrecta',
  INVALID_PERMISSIONS: 'No tiene permisos para realizar esta acción'
};
```

## Testing Strategy

### Unit Tests

1. **UserSelector Component**
   - Renderizado correcto con lista de usuarios
   - Funcionalidad de búsqueda
   - Validación de selección requerida
   - Pre-selección automática

2. **User Management**
   - Creación de usuarios colaboradores
   - Filtrado por empresa
   - Activación/desactivación

3. **Data Isolation**
   - Verificar filtrado por companyId
   - Prevenir acceso a datos de otras empresas

### Integration Tests

1. **Complete Registration Flow**
   - Crear usuario colaborador
   - Iniciar sesión como colaborador
   - Registrar datos con usuario seleccionado
   - Verificar trazabilidad

2. **Multi-User Scenarios**
   - Múltiples usuarios registrando simultáneamente
   - Cambio de usuario responsable
   - Filtrado por usuario en listas

### Manual Testing Checklist

- [ ] Crear usuario colaborador desde administrador
- [ ] Login como usuario colaborador
- [ ] Verificar acceso solo a datos de empresa
- [ ] Registrar entrada con selector de usuario
- [ ] Verificar trazabilidad en listados
- [ ] Exportar datos con información de usuario
- [ ] Desactivar usuario y verificar restricciones
- [ ] Filtrar registros por usuario responsable

## Implementation Notes

### Phase 1: Core Infrastructure
1. Migrar datos existentes con companyId
2. Actualizar modelo User con campos adicionales
3. Implementar UserSelector component
4. Modificar autenticación para incluir companyId

### Phase 2: Form Integration
1. Añadir UserSelector a todos los formularios
2. Actualizar validaciones
3. Modificar funciones de guardado
4. Actualizar visualización de registros

### Phase 3: User Management
1. Mejorar UsersPage con funcionalidad colaboradores
2. Implementar activación/desactivación
3. Añadir filtros por usuario en listados
4. Actualizar exportaciones

### Security Considerations

1. **Data Isolation**: Todos los queries deben filtrar por companyId
2. **User Validation**: Verificar que usuario pertenece a empresa correcta
3. **Permission Checks**: Solo administradores pueden crear/gestionar usuarios
4. **Audit Trail**: Mantener registro de quién crea/modifica usuarios

### Performance Considerations

1. **Lazy Loading**: Cargar usuarios solo cuando se necesite el selector
2. **Caching**: Cache de usuarios activos para evitar re-renders
3. **Debounced Search**: Búsqueda con delay en UserSelector
4. **Optimized Filtering**: Índices eficientes para filtrado por empresa