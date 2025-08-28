# AutoControl Pro - Multi-Tenant SaaS Platform

Sistema de control sanitario y gestión empresarial multi-tenant desarrollado con React, Node.js y MongoDB. Plataforma SaaS completa con autenticación avanzada, gestión de organizaciones, analytics y monitoreo en tiempo real.

## 🚀 Características Principales

### 🏢 **Multi-Tenancy**
- Aislamiento completo de datos por organización
- Gestión de usuarios y roles por organización
- Configuración personalizable por tenant

### 🔐 **Autenticación y Seguridad**
- Sistema de autenticación JWT robusto
- Verificación de email y recuperación de contraseñas
- Rate limiting y protección contra ataques
- Encriptación de datos sensibles
- Auditoría completa de acciones

### 📦 **Gestión Empresarial**
- **Gestión de Almacén**: Control completo de inventario y stock
- **Control de Entregas**: Seguimiento de entregas y recepciones
- **Fichas Técnicas**: Gestión de especificaciones de productos
- **Trazabilidad**: Seguimiento completo del ciclo de vida
- **Gestión de Incidencias**: Registro y seguimiento de incidentes

### 📊 **Analytics y Monitoreo**
- Dashboard de analytics en tiempo real
- Métricas de rendimiento y uso
- Monitoreo de sistema y alertas
- Reportes personalizables
- Tracking de eventos de usuario

### 👥 **Gestión de Organizaciones**
- Invitación y gestión de usuarios
- Roles y permisos granulares
- Configuración de organización
- Dashboard administrativo

### 🔔 **Sistema de Notificaciones**
- Notificaciones en tiempo real
- Alertas por email
- Sistema de webhooks
- Notificaciones push

## 🛠 Tecnologías

### Frontend
- **React 18** con TypeScript
- **Tailwind CSS** para estilos responsivos
- **Lucide React** para iconos
- **Context API** para gestión de estado
- **React Router** para navegación
- **Axios** para peticiones HTTP

### Backend
- **Node.js** con Express.js
- **MongoDB** con Mongoose ODM
- **JWT** para autenticación
- **Bcrypt** para encriptación
- **Helmet** para seguridad
- **Rate Limiting** con express-rate-limit
- **Email Service** con SendGrid/Nodemailer
- **Winston** para logging

### DevOps y Deployment
- **Docker** y Docker Compose
- **Nginx** como reverse proxy
- **PM2** para gestión de procesos
- **MongoDB Atlas** para base de datos en la nube
- **Let's Encrypt** para SSL

## 📋 Prerrequisitos

- **Node.js** 18.x o superior
- **MongoDB** 5.0 o superior
- **npm** o **yarn**
- **Docker** (opcional, para deployment)

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/autocontrol-pro.git
cd autocontrol-pro
```

### 2. Configuración del Backend

```bash
cd backend
npm install
```

Crear archivo `.env`:

```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME="AutoControl Pro"
APP_URL=http://localhost:3001

# Database
MONGODB_URI=mongodb://localhost:27017/autocontrol-pro

# Security
JWT_SECRET=tu-clave-jwt-super-secreta-y-larga
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Email Service (SendGrid example)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=tu-api-key-de-sendgrid
EMAIL_FROM=noreply@tu-dominio.com
EMAIL_FROM_NAME="AutoControl Pro"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_MONITORING=true
ENABLE_ANALYTICS=true

# CORS
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true
```

Inicializar la base de datos:

```bash
node scripts/setup-database.js
node scripts/setup-monitoring.js
```

Iniciar el servidor:

```bash
npm run dev
```

### 3. Configuración del Frontend

```bash
# En el directorio raíz
npm install
npm start
```

La aplicación estará disponible en `http://localhost:3001`

## 🏗 Estructura del Proyecto

```
autocontrol-pro/
├── backend/                    # Servidor Node.js
│   ├── models/                # Modelos de MongoDB
│   │   ├── User.js           # Modelo de usuario
│   │   ├── Organization.js   # Modelo de organización
│   │   ├── AnalyticsEvent.js # Eventos de analytics
│   │   └── ...
│   ├── routes/               # Rutas de la API
│   │   ├── auth.routes.js    # Autenticación
│   │   ├── organization.routes.js
│   │   ├── analytics.routes.js
│   │   ├── monitoring.routes.js
│   │   └── ...
│   ├── middleware/           # Middleware personalizado
│   │   ├── auth-simple.js    # Autenticación JWT
│   │   ├── analytics.js      # Tracking de eventos
│   │   ├── audit.js          # Auditoría
│   │   ├── security.js       # Seguridad
│   │   └── ...
│   ├── services/             # Servicios de negocio
│   │   ├── analyticsService.js
│   │   ├── monitoringService.js
│   │   ├── emailService.js
│   │   └── ...
│   ├── utils/                # Utilidades
│   ├── scripts/              # Scripts de setup
│   ├── docs/                 # Documentación
│   │   ├── API_DOCUMENTATION.md
│   │   ├── USER_GUIDE.md
│   │   ├── ADMIN_GUIDE.md
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── TROUBLESHOOTING.md
│   │   └── FAQ.md
│   └── server.js             # Punto de entrada
├── src/                      # Aplicación React
│   ├── components/           # Componentes React
│   │   ├── auth/            # Componentes de autenticación
│   │   ├── organization/    # Gestión de organizaciones
│   │   ├── admin/           # Dashboards administrativos
│   │   └── ui/              # Componentes UI reutilizables
│   ├── contexts/            # Contextos de React
│   │   ├── AuthContext.tsx
│   │   ├── OrganizationContext.tsx
│   │   └── ...
│   ├── services/            # Servicios de API
│   ├── utils/               # Utilidades del frontend
│   └── App.tsx              # Componente principal
├── nginx/                   # Configuración Nginx
├── docker-compose.prod.yml  # Docker para producción
├── .kiro/specs/            # Especificaciones del proyecto
└── docs/                   # Documentación adicional
```

## 📚 Documentación

### Para Desarrolladores
- [📖 Documentación de API](backend/docs/API_DOCUMENTATION.md)
- [🚀 Guía de Deployment](backend/docs/DEPLOYMENT_GUIDE.md)
- [🔧 Troubleshooting](backend/docs/TROUBLESHOOTING.md)

### Para Usuarios
- [👤 Guía de Usuario](backend/docs/USER_GUIDE.md)
- [⚙️ Guía de Administrador](backend/docs/ADMIN_GUIDE.md)
- [❓ FAQ](backend/docs/FAQ.md)

## 🔌 API Endpoints Principales

### Autenticación
```
POST /api/auth/register          # Registro de organización
POST /api/auth/login             # Inicio de sesión
POST /api/auth/verify-email      # Verificación de email
POST /api/auth/forgot-password   # Recuperar contraseña
POST /api/auth/reset-password    # Restablecer contraseña
POST /api/auth/refresh-token     # Renovar token
```

### Organizaciones
```
GET    /api/organizations        # Obtener organización
PUT    /api/organizations        # Actualizar organización
GET    /api/organizations/users  # Listar usuarios
POST   /api/organizations/invite # Invitar usuario
PUT    /api/organizations/users/:id/role # Cambiar rol
```

### Analytics
```
GET    /api/analytics/dashboard  # Dashboard de analytics
GET    /api/analytics/realtime   # Métricas en tiempo real
GET    /api/analytics/events     # Eventos de analytics
POST   /api/analytics/track      # Trackear evento
```

### Monitoreo
```
GET    /api/monitoring/health    # Estado del sistema
GET    /api/monitoring/status    # Estado detallado (Admin)
GET    /api/monitoring/dashboard # Dashboard de monitoreo (Admin)
GET    /api/monitoring/alerts    # Alertas del sistema (Admin)
```

## 🐳 Deployment con Docker

### Desarrollo
```bash
docker-compose up -d
```

### Producción
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Con Nginx y SSL
```bash
# Configurar SSL con Let's Encrypt
sudo certbot --nginx -d tu-dominio.com

# Iniciar servicios
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Características de Monitoreo

### System Health Monitoring
- Monitoreo de CPU, memoria y disco
- Estado de conexión a base de datos
- Alertas automáticas por umbrales
- Dashboard en tiempo real

### Analytics Avanzados
- Tracking de eventos de usuario
- Métricas de rendimiento de API
- Análisis de uso por organización
- Reportes personalizables

### Auditoría y Seguridad
- Log completo de acciones de usuario
- Monitoreo de intentos de acceso
- Alertas de seguridad
- Cumplimiento de regulaciones

## 🔒 Seguridad

### Medidas Implementadas
- **Autenticación JWT** con refresh tokens
- **Rate limiting** por IP y usuario
- **Validación de entrada** en todos los endpoints
- **Encriptación** de contraseñas con bcrypt
- **Headers de seguridad** con Helmet
- **CORS** configurado correctamente
- **Auditoría** completa de acciones

### Compliance
- **GDPR** compliant
- **SOC 2** ready
- **ISO 27001** aligned

## 🚀 Roadmap

### Próximas Características
- [ ] **Mobile App** (React Native)
- [ ] **API v2** con GraphQL
- [ ] **Integraciones** con ERP externos
- [ ] **BI Dashboard** avanzado
- [ ] **Machine Learning** para predicciones
- [ ] **Multi-idioma** completo

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Contribución
- Seguir las convenciones de código establecidas
- Escribir tests para nuevas funcionalidades
- Actualizar documentación cuando sea necesario
- Usar commits semánticos

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

### Canales de Soporte
- **Email**: soporte@autocontrol.pro
- **GitHub Issues**: [Crear issue](https://github.com/tu-usuario/autocontrol-pro/issues)
- **Documentación**: [Docs completas](backend/docs/)
- **Community Forum**: [Foro de la comunidad](https://community.autocontrol.pro)

### Soporte Empresarial
Para soporte empresarial 24/7, planes personalizados y consultoría:
- **Email**: enterprise@autocontrol.pro
- **Teléfono**: +1 (555) 123-4567

---

**AutoControl Pro** - Transformando la gestión empresarial con tecnología de vanguardia 🚀