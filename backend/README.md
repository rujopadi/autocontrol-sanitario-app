# Autocontrol Sanitario Pro - Backend

Backend API para el sistema de autocontrol sanitario desarrollado con Node.js, Express y MongoDB.

## 🚀 Características

- ✅ Autenticación JWT
- ✅ Gestión de usuarios con roles
- ✅ CRUD de registros de recepción
- ✅ Información del establecimiento
- ✅ Middleware de seguridad
- ✅ Validación de datos
- ✅ Dockerizado para despliegue

## 🛠️ Tecnologías

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Base de datos**: MongoDB
- **Autenticación**: JWT + bcryptjs
- **Containerización**: Docker

## 📦 Instalación local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

## 🐳 Despliegue con Docker

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

## 📋 Variables de entorno

- `MONGO_URI`: Conexión a MongoDB
- `JWT_SECRET`: Secreto para tokens JWT
- `PORT`: Puerto del servidor (default: 5000)
- `NODE_ENV`: Entorno (development/production)

## 🔗 Endpoints principales

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth` - Obtener usuario actual

### Usuarios
- `GET /api/users` - Listar usuarios (Admin)
- `POST /api/users` - Crear usuario (Admin)
- `PUT /api/users/:id` - Actualizar usuario (Admin)
- `DELETE /api/users/:id` - Eliminar usuario (Admin)

### Establecimiento
- `GET /api/establishment` - Obtener información
- `POST /api/establishment` - Actualizar información

### Registros de recepción
- `GET /api/records/delivery` - Listar registros
- `POST /api/records/delivery` - Crear registro
- `DELETE /api/records/delivery/:id` - Eliminar registro

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración
- Middleware de autenticación
- Validación de permisos por rol
- CORS configurado