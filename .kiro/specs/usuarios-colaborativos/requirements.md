# Requirements Document - Sistema de Usuarios Colaborativos

## Introduction

Esta funcionalidad permitirá que el administrador de una empresa pueda crear múltiples usuarios colaboradores que trabajen con los mismos datos de la empresa. Cada registro debe identificar claramente quién lo realizó, manteniendo la trazabilidad y responsabilidad de cada acción. El sistema debe mantener el aislamiento de datos entre empresas diferentes.

## Requirements

### Requirement 1

**User Story:** Como administrador de empresa, quiero poder crear usuarios colaboradores directamente en el sistema, para que puedan ayudar con los registros de control sanitario.

#### Acceptance Criteria

1. WHEN el administrador accede a la gestión de usuarios THEN el sistema SHALL mostrar una opción para "Crear Usuario Colaborador"
2. WHEN el administrador crea un usuario THEN el sistema SHALL asociarlo automáticamente a la misma empresa del administrador
3. WHEN se crea un usuario colaborador THEN el sistema SHALL generar credenciales de acceso (email y contraseña)
4. IF el email ya existe en el sistema THEN el sistema SHALL mostrar un error indicando que el email ya está registrado
5. WHEN se lista usuarios THEN el sistema SHALL mostrar solo usuarios de la misma empresa

### Requirement 2

**User Story:** Como usuario colaborador, quiero poder acceder al sistema con mis credenciales, para trabajar con los datos de mi empresa.

#### Acceptance Criteria

1. WHEN el usuario colaborador inicia sesión THEN el sistema SHALL mostrar los mismos datos de empresa que el administrador
2. WHEN el usuario colaborador accede a cualquier módulo THEN el sistema SHALL mostrar solo datos de su empresa
3. WHEN el usuario colaborador crea registros THEN el sistema SHALL asociarlos a la empresa correspondiente
4. IF el usuario colaborador está desactivado THEN el sistema SHALL impedir su acceso
5. WHEN el usuario colaborador navega por el sistema THEN el sistema SHALL mantener la misma funcionalidad que el administrador

### Requirement 3

**User Story:** Como usuario (administrador o colaborador), quiero que cada registro solicite y muestre claramente quién lo realizó, para mantener la trazabilidad y responsabilidad.

#### Acceptance Criteria

1. WHEN se crea cualquier registro THEN el sistema SHALL mostrar un campo obligatorio "Registrado por" con selector de usuarios activos de la empresa
2. WHEN se guarda un registro THEN el sistema SHALL almacenar el nombre del usuario seleccionado, fecha y hora
3. WHEN se visualiza un registro THEN el sistema SHALL mostrar claramente "Registrado por: [Nombre Usuario]" y la fecha/hora
4. WHEN se exportan datos THEN el sistema SHALL incluir columna "Registrado por" con el nombre del usuario
5. IF solo hay un usuario activo en la empresa THEN el sistema SHALL pre-seleccionarlo pero permitir cambiarlo

### Requirement 4

**User Story:** Como administrador, quiero poder gestionar los permisos y estado de los usuarios colaboradores, para controlar quién puede acceder y registrar datos.

#### Acceptance Criteria

1. WHEN el administrador ve la lista de usuarios THEN el sistema SHALL mostrar opciones para activar/desactivar usuarios colaboradores
2. WHEN se desactiva un usuario THEN el sistema SHALL impedir su acceso pero mantener sus registros históricos
3. WHEN se reactiva un usuario THEN el sistema SHALL restaurar su acceso completo
4. WHEN se elimina un usuario THEN el sistema SHALL mantener sus registros históricos pero marcarlos como "Usuario eliminado"
5. IF un usuario colaborador intenta acceder estando desactivado THEN el sistema SHALL mostrar un mensaje de acceso denegado

### Requirement 5

**User Story:** Como usuario del sistema, quiero que los datos de mi empresa permanezcan completamente aislados de otras empresas, incluso con el sistema de colaboración.

#### Acceptance Criteria

1. WHEN un usuario colaborador accede al sistema THEN el sistema SHALL mostrar solo datos de su empresa
2. WHEN se realizan búsquedas o filtros THEN el sistema SHALL limitar resultados solo a datos de la empresa del usuario
3. WHEN se exportan datos THEN el sistema SHALL incluir solo registros de la empresa del usuario
4. IF hay un error en el sistema THEN el sistema SHALL NEVER mostrar datos de otras empresas
5. WHEN se crean backups o reportes THEN el sistema SHALL mantener la separación de datos por empresa

### Requirement 6

**User Story:** Como usuario, quiero una interfaz clara para seleccionar quién registra cada entrada, para que sea fácil y rápido identificar al responsable.

#### Acceptance Criteria

1. WHEN se abre un formulario de registro THEN el sistema SHALL mostrar un selector desplegable con usuarios activos
2. WHEN se selecciona un usuario THEN el sistema SHALL mostrar su nombre completo y rol
3. WHEN hay muchos usuarios THEN el sistema SHALL incluir funcionalidad de búsqueda en el selector
4. WHEN se guarda sin seleccionar usuario THEN el sistema SHALL mostrar un error de validación
5. IF el usuario actual es el único activo THEN el sistema SHALL pre-seleccionarlo automáticamente

### Requirement 7

**User Story:** Como administrador, quiero poder filtrar y ver qué registros ha hecho cada usuario, para monitorear la actividad del equipo.

#### Acceptance Criteria

1. WHEN se visualizan listas de registros THEN el sistema SHALL mostrar filtros por "Registrado por"
2. WHEN se filtra por usuario THEN el sistema SHALL mostrar solo registros realizados por ese usuario
3. WHEN se exportan datos filtrados THEN el sistema SHALL incluir solo los registros del usuario seleccionado
4. WHEN se visualiza el dashboard THEN el sistema SHALL mostrar estadísticas básicas de registros por usuario
5. IF no hay registros del usuario seleccionado THEN el sistema SHALL mostrar mensaje "No hay registros de este usuario"