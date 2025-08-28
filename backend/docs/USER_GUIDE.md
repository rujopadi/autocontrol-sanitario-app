# Guía de Usuario - Autocontrol Sanitario Pro

## Introducción

Bienvenido a Autocontrol Sanitario Pro, la plataforma SaaS líder para la gestión de controles sanitarios en establecimientos alimentarios. Esta guía te ayudará a aprovechar al máximo todas las funcionalidades del sistema.

## Tabla de Contenidos

1. [Primeros Pasos](#primeros-pasos)
2. [Gestión de Organización](#gestión-de-organización)
3. [Gestión de Usuarios](#gestión-de-usuarios)
4. [Registros de Control](#registros-de-control)
5. [Análisis y Reportes](#análisis-y-reportes)
6. [Configuración](#configuración)
7. [Solución de Problemas](#solución-de-problemas)

## Primeros Pasos

### Registro de Cuenta

1. **Accede al portal de registro**: Visita [https://app.autocontrolpro.com/register](https://app.autocontrolpro.com/register)

2. **Completa el formulario**:
   - **Nombre completo**: Tu nombre y apellidos
   - **Email**: Dirección de correo electrónico (será tu usuario)
   - **Contraseña**: Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números
   - **Nombre de la organización**: El nombre de tu establecimiento o empresa

3. **Verifica tu email**: Revisa tu bandeja de entrada y haz clic en el enlace de verificación

4. **Completa tu perfil**: Añade información adicional sobre tu establecimiento

### Primer Inicio de Sesión

1. **Accede al sistema**: Visita [https://app.autocontrolpro.com/login](https://app.autocontrolpro.com/login)

2. **Introduce tus credenciales**:
   - Email registrado
   - Contraseña

3. **Explora el dashboard**: Familiarízate con la interfaz principal

## Gestión de Organización

### Configuración Básica

#### Información del Establecimiento

1. **Accede a Configuración** → **Organización**

2. **Completa los datos básicos**:
   - **Nombre del establecimiento**
   - **Dirección completa**
   - **Teléfono de contacto**
   - **Email de contacto**
   - **CIF/NIF**
   - **Registro sanitario**
   - **Responsable técnico**

3. **Guarda los cambios**

#### Personalización Visual

1. **Sube tu logo**: Formatos admitidos: PNG, JPG (máximo 2MB)

2. **Configura colores corporativos**:
   - Color principal
   - Color secundario

3. **Vista previa**: Revisa cómo se verá tu marca en los reportes

### Gestión de Suscripción

#### Planes Disponibles

- **Plan Gratuito**: Hasta 5 usuarios, 500MB almacenamiento
- **Plan Básico**: Hasta 25 usuarios, 5GB almacenamiento, soporte prioritario
- **Plan Premium**: Usuarios ilimitados, 20GB almacenamiento, funciones avanzadas

#### Cambiar Plan

1. **Accede a** → **Configuración** → **Suscripción**
2. **Selecciona el plan deseado**
3. **Completa el proceso de pago**
4. **Confirma la actualización**

## Gestión de Usuarios

### Roles y Permisos

#### Tipos de Usuario

- **Administrador**: Acceso completo al sistema
- **Usuario**: Puede crear y gestionar registros
- **Solo Lectura**: Solo puede visualizar información

#### Permisos por Rol

| Función | Admin | Usuario | Solo Lectura |
|---------|-------|---------|--------------|
| Ver registros | ✅ | ✅ | ✅ |
| Crear registros | ✅ | ✅ | ❌ |
| Editar registros | ✅ | ✅ | ❌ |
| Eliminar registros | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Configurar organización | ✅ | ❌ | ❌ |
| Ver análisis | ✅ | ✅ | ✅ |
| Exportar datos | ✅ | ✅ | ❌ |

### Invitar Usuarios

1. **Accede a** → **Usuarios** → **Invitar Usuario**

2. **Completa el formulario**:
   - **Email del usuario**
   - **Nombre completo**
   - **Rol asignado**
   - **Mensaje personalizado** (opcional)

3. **Envía la invitación**

4. **El usuario recibirá un email** con instrucciones para activar su cuenta

### Gestionar Usuarios Existentes

#### Editar Usuario

1. **Lista de usuarios** → **Selecciona usuario** → **Editar**
2. **Modifica la información necesaria**
3. **Guarda los cambios**

#### Desactivar Usuario

1. **Lista de usuarios** → **Selecciona usuario** → **Desactivar**
2. **Confirma la acción**
3. **El usuario perderá acceso inmediatamente**

#### Cambiar Rol

1. **Lista de usuarios** → **Selecciona usuario** → **Cambiar Rol**
2. **Selecciona el nuevo rol**
3. **Confirma el cambio**

## Registros de Control

### Tipos de Registro

#### Registro de Recepción de Mercancías

**Información requerida**:
- Fecha y hora de recepción
- Proveedor
- Tipo de producto
- Temperatura de recepción
- Estado de la documentación
- Observaciones
- Foto del albarán (opcional)

#### Registro de Temperaturas

**Información requerida**:
- Fecha y hora
- Equipo de medición
- Temperatura registrada
- Ubicación
- Responsable
- Acciones correctivas (si aplica)

#### Registro de Limpieza y Desinfección

**Información requerida**:
- Fecha y hora
- Área/equipo limpiado
- Productos utilizados
- Responsable
- Verificación
- Observaciones

### Crear Nuevo Registro

1. **Accede a** → **Registros** → **Nuevo Registro**

2. **Selecciona el tipo de registro**

3. **Completa todos los campos obligatorios**:
   - Los campos marcados con (*) son obligatorios
   - Utiliza el formato de fecha correcto
   - Añade observaciones detalladas

4. **Adjunta documentos** (si es necesario):
   - Fotos
   - Documentos PDF
   - Certificados

5. **Guarda el registro**

### Buscar y Filtrar Registros

#### Filtros Disponibles

- **Por fecha**: Rango de fechas específico
- **Por tipo**: Tipo de registro
- **Por responsable**: Usuario que creó el registro
- **Por producto**: Tipo de producto o área
- **Por estado**: Conforme/No conforme

#### Búsqueda Avanzada

1. **Accede a** → **Registros** → **Búsqueda Avanzada**

2. **Combina múltiples filtros**:
   - Fecha de inicio y fin
   - Palabras clave en observaciones
   - Rangos de temperatura
   - Estado de conformidad

3. **Aplica filtros** y revisa resultados

### Editar Registros

1. **Localiza el registro** en la lista
2. **Haz clic en "Editar"**
3. **Modifica los campos necesarios**
4. **Añade una nota explicativa** del cambio
5. **Guarda los cambios**

**Nota**: Todos los cambios quedan registrados en el historial de auditoría.

## Análisis y Reportes

### Dashboard Principal

#### Métricas Clave

- **Registros del día**: Número de registros creados hoy
- **Registros del mes**: Total mensual
- **Incidencias**: Registros no conformes
- **Tendencias**: Gráficos de evolución

#### Widgets Personalizables

1. **Configura tu dashboard**:
   - Arrastra y suelta widgets
   - Cambia el tamaño de los gráficos
   - Selecciona métricas relevantes

2. **Widgets disponibles**:
   - Gráfico de registros por día
   - Distribución por tipo
   - Top proveedores
   - Alertas de temperatura
   - Cumplimiento por área

### Reportes Automáticos

#### Tipos de Reporte

- **Reporte Diario**: Resumen de actividad del día
- **Reporte Semanal**: Análisis semanal con tendencias
- **Reporte Mensual**: Informe completo mensual
- **Reporte de Incidencias**: Solo registros no conformes
- **Reporte por Proveedor**: Análisis por proveedor

#### Generar Reporte

1. **Accede a** → **Reportes** → **Generar Reporte**

2. **Selecciona parámetros**:
   - Tipo de reporte
   - Rango de fechas
   - Filtros específicos
   - Formato (PDF, Excel, CSV)

3. **Genera el reporte**

4. **Descarga o envía por email**

### Exportación de Datos

#### Formatos Disponibles

- **PDF**: Para reportes oficiales
- **Excel**: Para análisis adicional
- **CSV**: Para integración con otros sistemas
- **JSON**: Para desarrolladores

#### Proceso de Exportación

1. **Selecciona los registros** a exportar
2. **Elige el formato** deseado
3. **Configura opciones** (campos incluidos, filtros)
4. **Inicia la exportación**
5. **Descarga el archivo** generado

## Configuración

### Configuración General

#### Preferencias de Usuario

1. **Accede a** → **Mi Perfil** → **Preferencias**

2. **Configura**:
   - **Idioma**: Español, Inglés, Catalán
   - **Zona horaria**: Selecciona tu ubicación
   - **Formato de fecha**: DD/MM/YYYY o MM/DD/YYYY
   - **Notificaciones**: Email, push, en aplicación

#### Configuración de Notificaciones

**Tipos de notificación**:
- Nuevos registros creados
- Incidencias detectadas
- Recordatorios de tareas
- Actualizaciones del sistema
- Reportes programados

**Canales disponibles**:
- Email
- Notificaciones push
- SMS (plan premium)

### Configuración Avanzada

#### Campos Personalizados

1. **Accede a** → **Configuración** → **Campos Personalizados**

2. **Añade nuevos campos**:
   - Nombre del campo
   - Tipo de dato (texto, número, fecha, lista)
   - Obligatorio/opcional
   - Valores por defecto

3. **Asigna a tipos de registro**

#### Plantillas de Registro

1. **Crea plantillas** para registros frecuentes
2. **Define valores por defecto**
3. **Configura campos obligatorios**
4. **Asigna a usuarios específicos**

### Integraciones

#### APIs Disponibles

- **API REST**: Integración completa
- **Webhooks**: Notificaciones en tiempo real
- **Exportación automática**: Envío programado de datos

#### Configurar Integración

1. **Accede a** → **Configuración** → **Integraciones**
2. **Selecciona el tipo de integración**
3. **Configura parámetros de conexión**
4. **Prueba la conexión**
5. **Activa la integración**

## Solución de Problemas

### Problemas Comunes

#### No puedo iniciar sesión

**Posibles causas y soluciones**:

1. **Contraseña incorrecta**:
   - Utiliza "Olvidé mi contraseña"
   - Revisa mayúsculas/minúsculas
   - Verifica que no esté activado Caps Lock

2. **Email no verificado**:
   - Revisa tu bandeja de entrada
   - Busca en spam/promociones
   - Solicita nuevo email de verificación

3. **Cuenta desactivada**:
   - Contacta con tu administrador
   - Verifica el estado de tu suscripción

#### Los registros no se guardan

**Posibles causas y soluciones**:

1. **Campos obligatorios vacíos**:
   - Revisa que todos los campos marcados con (*) estén completos
   - Verifica el formato de fechas y números

2. **Problemas de conexión**:
   - Verifica tu conexión a internet
   - Recarga la página
   - Intenta desde otro navegador

3. **Límite de almacenamiento**:
   - Revisa tu plan actual
   - Elimina archivos innecesarios
   - Considera actualizar tu plan

#### No recibo notificaciones

**Posibles causas y soluciones**:

1. **Configuración de notificaciones**:
   - Revisa tus preferencias de notificación
   - Verifica que el email esté correcto
   - Comprueba la carpeta de spam

2. **Filtros de email**:
   - Añade noreply@autocontrolpro.com a contactos
   - Configura filtros para evitar spam
   - Verifica reglas de tu servidor de email

### Contacto y Soporte

#### Canales de Soporte

- **Email**: support@autocontrolpro.com
- **Chat en vivo**: Disponible en la aplicación
- **Teléfono**: +34 900 123 456 (horario comercial)
- **Centro de ayuda**: https://help.autocontrolpro.com

#### Información a Incluir

Cuando contactes con soporte, incluye:

1. **Descripción detallada** del problema
2. **Pasos para reproducir** el error
3. **Capturas de pantalla** (si aplica)
4. **Navegador y versión** utilizada
5. **Hora aproximada** del incidente

#### Tiempos de Respuesta

- **Plan Gratuito**: 48-72 horas
- **Plan Básico**: 24 horas
- **Plan Premium**: 4-8 horas
- **Emergencias críticas**: 1-2 horas (solo Premium)

### Recursos Adicionales

#### Documentación Técnica

- **API Documentation**: https://docs.autocontrolpro.com/api
- **Guías de integración**: https://docs.autocontrolpro.com/integrations
- **Changelog**: https://docs.autocontrolpro.com/changelog

#### Comunidad

- **Foro de usuarios**: https://community.autocontrolpro.com
- **Webinars mensuales**: Registro en la aplicación
- **Newsletter**: Actualizaciones y consejos

#### Formación

- **Videos tutoriales**: https://learn.autocontrolpro.com
- **Cursos online**: Disponibles para usuarios Premium
- **Certificación**: Programa de certificación oficial

---

## Apéndices

### Apéndice A: Atajos de Teclado

| Acción | Atajo |
|--------|-------|
| Nuevo registro | Ctrl + N |
| Buscar | Ctrl + F |
| Guardar | Ctrl + S |
| Exportar | Ctrl + E |
| Ayuda | F1 |

### Apéndice B: Formatos de Fecha

- **España**: DD/MM/YYYY (15/01/2024)
- **Internacional**: YYYY-MM-DD (2024-01-15)
- **Estados Unidos**: MM/DD/YYYY (01/15/2024)

### Apéndice C: Límites por Plan

| Característica | Gratuito | Básico | Premium |
|----------------|----------|--------|---------|
| Usuarios | 5 | 25 | Ilimitado |
| Almacenamiento | 500MB | 5GB | 20GB |
| Registros/mes | 1,000 | 10,000 | Ilimitado |
| Exportaciones/mes | 5 | 50 | Ilimitado |
| Soporte | Email | Email + Chat | Teléfono |

---

*Última actualización: 15 de enero de 2024*
*Versión: 1.0.0*