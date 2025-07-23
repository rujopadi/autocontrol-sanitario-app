# Sistema de Notificaciones

## Descripción
Sistema de notificaciones moderno que reemplaza los `alert()` nativos del navegador con notificaciones elegantes y personalizables.

## Características
- ✅ 4 tipos de notificaciones: success, error, warning, info
- ✅ Auto-dismiss configurable
- ✅ Notificaciones persistentes para errores críticos
- ✅ Diseño responsive y accesible
- ✅ Animaciones suaves
- ✅ Posibilidad de cerrar manualmente
- ✅ Stack de notificaciones (múltiples a la vez)

## Uso

### Importar el hook
```typescript
import { useNotifications } from './NotificationContext';
```

### Usar en componentes
```typescript
const MyComponent = () => {
  const { success, error, warning, info } = useNotifications();

  const handleSuccess = () => {
    success('Operación exitosa', 'Los datos se han guardado correctamente.');
  };

  const handleError = () => {
    error('Error crítico', 'No se pudo conectar con el servidor.', true); // persistente
  };

  const handleWarning = () => {
    warning('Atención', 'Algunos campos están vacíos.');
  };

  const handleInfo = () => {
    info('Información', 'Nueva actualización disponible.');
  };
};
```

### Métodos disponibles

#### Métodos de conveniencia
- `success(title, message?, duration?)` - Notificación de éxito (verde)
- `error(title, message?, persistent?)` - Notificación de error (rojo)
- `warning(title, message?, duration?)` - Notificación de advertencia (amarillo)
- `info(title, message?, duration?)` - Notificación informativa (azul)

#### Método genérico
```typescript
addNotification({
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message?: string,
  duration?: number,
  persistent?: boolean
});
```

#### Otros métodos
- `removeNotification(id)` - Eliminar notificación específica
- `clearAll()` - Limpiar todas las notificaciones

## Configuración por defecto
- **Success**: 4 segundos
- **Error**: 6 segundos (o persistente si se especifica)
- **Warning**: 5 segundos
- **Info**: 4 segundos

## Implementación completada en:
- ✅ App.tsx (autenticación, CRUD operaciones)
- ✅ Login.tsx (validación de campos)
- ✅ Register.tsx (validación de campos)
- ✅ UsersPage.tsx (gestión de usuarios)
- ✅ ReceptionPage.tsx (recepción y transporte)
- ✅ StoragePage.tsx (almacenamiento)
- ✅ CleaningPage.tsx (limpieza e higiene)

## Pendiente de implementar en:
- TraceabilityPage.tsx
- TechnicalSheetsPage.tsx
- EscandallosPage.tsx
- exportUtils.ts

## Estilos CSS
Los estilos están integrados en `index.css` con:
- Posicionamiento fijo en la esquina superior derecha
- Animaciones de entrada suaves
- Diseño responsive para móviles
- Colores consistentes con el tema de la aplicación