# Requirements Document

## Introduction

Este spec define las mejoras para la aplicación de Autocontrol Sanitario Pro, enfocándose en dos funcionalidades clave: un módulo de gestión de incidencias que permita registrar problemas y sus soluciones, y una mejora del sistema de gestión de empresa que incluya datos completos de la empresa y gestión avanzada de usuarios con registro sanitario.

## Requirements

### Requirement 1: Módulo de Gestión de Incidencias

**User Story:** Como usuario del sistema de autocontrol sanitario, quiero poder registrar incidencias detectadas durante las inspecciones y documentar las acciones correctivas tomadas, para mantener un historial completo de problemas y soluciones que ayude en auditorías y mejora continua.

#### Acceptance Criteria

1. WHEN un usuario accede al módulo de incidencias THEN el sistema SHALL mostrar una lista de todas las incidencias registradas ordenadas por fecha de creación descendente
2. WHEN un usuario crea una nueva incidencia THEN el sistema SHALL requerir título, descripción, fecha de detección, área afectada, nivel de gravedad y usuario que reporta
3. WHEN se registra una incidencia THEN el sistema SHALL asignar automáticamente un ID único y timestamp de creación
4. WHEN un usuario visualiza una incidencia THEN el sistema SHALL mostrar todos los detalles de la incidencia y el historial de acciones correctivas
5. WHEN un usuario añade una acción correctiva THEN el sistema SHALL requerir descripción de la acción, fecha de implementación, usuario responsable y estado de la acción
6. WHEN se completan todas las acciones correctivas THEN el usuario SHALL poder marcar la incidencia como "Resuelta"
7. WHEN se visualiza el listado de incidencias THEN el sistema SHALL permitir filtrar por estado (Abierta, En Proceso, Resuelta), gravedad, área y rango de fechas
8. WHEN se exportan datos THEN el sistema SHALL incluir las incidencias en los reportes PDF y Excel con formato profesional

### Requirement 2: Gestión Avanzada de Empresa y Usuarios

**User Story:** Como administrador del sistema, quiero gestionar de forma completa los datos de mi empresa incluyendo el registro sanitario y administrar todos los usuarios que tomarán registros, para tener un control centralizado de la información empresarial y del personal autorizado.

#### Acceptance Criteria

1. WHEN un administrador accede a la gestión de empresa THEN el sistema SHALL mostrar un formulario completo con todos los campos de información empresarial
2. WHEN se editan los datos de empresa THEN el sistema SHALL incluir campos para nombre, dirección completa, ciudad, código postal, teléfono, email, CIF/NIF, registro sanitario, y responsable técnico
3. WHEN se guarda la información de empresa THEN el sistema SHALL validar que todos los campos obligatorios estén completos y el formato sea correcto
4. WHEN un administrador accede a gestión de usuarios THEN el sistema SHALL mostrar una lista completa de todos los usuarios con sus roles y estado
5. WHEN se crea un nuevo usuario THEN el sistema SHALL requerir nombre completo, email, contraseña, rol (Administrador, Usuario, Solo Lectura) y estado (Activo, Inactivo)
6. WHEN se edita un usuario existente THEN el sistema SHALL permitir modificar todos los campos excepto el ID, manteniendo historial de cambios
7. WHEN se elimina un usuario THEN el sistema SHALL requerir confirmación y mantener los registros históricos asociados al usuario
8. WHEN un usuario no administrador intenta acceder a gestión de empresa/usuarios THEN el sistema SHALL denegar el acceso y mostrar mensaje de permisos insuficientes
9. WHEN se visualizan los datos en reportes THEN el sistema SHALL incluir la información completa de empresa incluyendo registro sanitario en headers de documentos PDF

### Requirement 3: Integración con Sistema Existente

**User Story:** Como usuario del sistema, quiero que las nuevas funcionalidades se integren perfectamente con el sistema existente, manteniendo la consistencia de diseño y funcionalidad sin afectar las características actuales.

#### Acceptance Criteria

1. WHEN se accede a las nuevas funcionalidades THEN el sistema SHALL mantener el mismo estilo visual y patrones de navegación del sistema existente
2. WHEN se utilizan las notificaciones THEN el sistema SHALL usar el sistema de notificaciones existente para confirmar acciones de incidencias y gestión de usuarios
3. WHEN se exportan datos THEN el sistema SHALL integrar las nuevas funcionalidades con las utilidades de exportación existentes (PDF y Excel)
4. WHEN se realizan operaciones THEN el sistema SHALL mantener la misma arquitectura de manejo de errores y autenticación
5. WHEN un usuario navega entre módulos THEN el sistema SHALL mantener la sesión y contexto de usuario sin interrupciones
6. WHEN se cargan datos THEN el sistema SHALL usar los mismos patrones de carga y estados de loading existentes