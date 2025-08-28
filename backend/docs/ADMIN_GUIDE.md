# Guía de Administración - Autocontrol Sanitario Pro

## Introducción

Esta guía está dirigida a administradores del sistema Autocontrol Sanitario Pro. Aquí encontrarás información detallada sobre la configuración, gestión y mantenimiento de la plataforma.

## Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Gestión de Usuarios y Organizaciones](#gestión-de-usuarios-y-organizaciones)
3. [Monitoreo del Sistema](#monitoreo-del-sistema)
4. [Análisis y Métricas](#análisis-y-métricas)
5. [Seguridad](#seguridad)
6. [Mantenimiento](#mantenimiento)
7. [Solución de Problemas](#solución-de-problemas)
8. [Configuración Avanzada](#configuración-avanzada)

## Configuración Inicial

### Requisitos del Sistema

#### Servidor de Aplicación
- **CPU**: Mínimo 2 cores, recomendado 4+ cores
- **RAM**: Mínimo 4GB, recomendado 8GB+
- **Almacenamiento**: Mínimo 20GB SSD
- **Sistema Operativo**: Ubuntu 20.04+ / CentOS 8+ / Docker

#### Base de Datos
- **MongoDB**: Versión 5.0+
- **RAM**: Mínimo 2GB dedicada
- **Almacenamiento**: SSD recomendado
- **Conexiones**: Configurar pool de conexiones

#### Red y Seguridad
- **HTTPS**: Certificado SSL válido
- **Firewall**: Puertos 80, 443 abiertos
- **CDN**: Recomendado para archivos estáticos
- **Backup**: Estrategia de respaldo automático

### Instalación

#### Usando Docker (Recomendado)

1. **Clona el repositorio**:
```bash
git clone https://github.com/autocontrolpro/backend.git
cd backend
```

2. **Configura variables de entorno**:
```bash
cp .env.production.example .env.production
# Edita .env.production con tus valores
```

3. **Inicia los servicios**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. **Verifica la instalación**:
```bash
curl http://localhost:5000/health
```

#### Instalación Manual

1. **Instala Node.js 18+**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Instala MongoDB**:
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

3. **Configura la aplicación**:
```bash
npm install
npm run setup:db
npm run start:prod
```

### Configuración de Variables de Entorno

#### Variables Críticas

```bash
# Aplicación
NODE_ENV=production
PORT=5000
APP_VERSION=1.0.0

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/autocontrol-prod

# Seguridad
JWT_SECRET=tu-clave-jwt-super-segura-minimo-32-caracteres
JWT_REFRESH_SECRET=tu-clave-refresh-super-segura

# Email
EMAIL_API_KEY=tu-clave-sendgrid
EMAIL_FROM=noreply@tudominio.com

# CORS
FRONTEND_URL=https://tudominio.com
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com

# Monitoreo
ENABLE_MONITORING=true
ENABLE_ANALYTICS=true
MONITORING_INTERVAL=60000
```

#### Variables de Seguridad

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_AUDIT_LOGGING=true

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
```

## Gestión de Usuarios y Organizaciones

### Panel de Administración

#### Acceso al Panel

1. **Inicia sesión** con una cuenta de administrador
2. **Accede a** `/admin` en tu navegador
3. **Verifica permisos** de super administrador

#### Funciones Principales

- **Gestión de organizaciones**: Crear, editar, desactivar
- **Gestión de usuarios**: Administrar usuarios de todas las organizaciones
- **Configuración global**: Ajustes que afectan todo el sistema
- **Monitoreo**: Métricas y alertas del sistema
- **Auditoría**: Logs de todas las acciones

### Gestión de Organizaciones

#### Crear Nueva Organización

```bash
# Usando CLI
npm run admin:create-org -- --name "Nueva Empresa" --email "admin@empresa.com"

# O usando API
curl -X POST http://localhost:5000/api/admin/organizations \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nueva Empresa",
    "adminEmail": "admin@empresa.com",
    "plan": "basic"
  }'
```

#### Configurar Límites por Organización

```javascript
// Ejemplo de configuración de límites
{
  "organizationId": "org_123",
  "limits": {
    "maxUsers": 25,
    "maxStorage": 5368709120, // 5GB en bytes
    "maxApiCalls": 50000,
    "maxRecords": 10000
  },
  "features": {
    "analytics": true,
    "exports": true,
    "integrations": false,
    "customFields": true
  }
}
```

#### Migrar Organización

```bash
# Migrar datos de una organización a otra
npm run admin:migrate-org -- --from org_old --to org_new --backup true
```

### Gestión de Usuarios

#### Usuarios Super Administrador

```bash
# Crear super admin
npm run admin:create-superadmin -- --email "admin@sistema.com" --name "Super Admin"

# Listar super admins
npm run admin:list-superadmins

# Revocar permisos
npm run admin:revoke-superadmin -- --email "admin@sistema.com"
```

#### Gestión Masiva de Usuarios

```bash
# Desactivar usuarios inactivos (más de 90 días)
npm run admin:cleanup-users -- --inactive-days 90

# Exportar lista de usuarios
npm run admin:export-users -- --format csv --output users.csv

# Importar usuarios desde CSV
npm run admin:import-users -- --file users.csv --dry-run
```

## Monitoreo del Sistema

### Dashboard de Monitoreo

#### Acceso al Dashboard

- **URL**: `http://tu-servidor:5000/monitoring`
- **Autenticación**: Token de administrador requerido
- **Actualización**: Automática cada 30 segundos

#### Métricas Principales

1. **Estado del Sistema**:
   - CPU, memoria, disco
   - Estado de la base de datos
   - Tiempo de respuesta

2. **Métricas de Aplicación**:
   - Requests por minuto
   - Tasa de errores
   - Usuarios activos

3. **Métricas de Negocio**:
   - Organizaciones activas
   - Registros creados
   - Uso de almacenamiento

### Configuración de Alertas

#### Umbrales de Alerta

```javascript
// config/monitoring.js
module.exports = {
  thresholds: {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 },
    responseTime: { warning: 1000, critical: 3000 },
    errorRate: { warning: 5, critical: 10 }
  },
  notifications: {
    email: ['admin@tudominio.com'],
    slack: 'webhook-url',
    sms: '+34123456789' // Solo plan premium
  }
};
```

#### Configurar Notificaciones

```bash
# Email
npm run admin:setup-alerts -- --email admin@tudominio.com --type all

# Slack
npm run admin:setup-alerts -- --slack webhook-url --type critical

# SMS (requiere configuración adicional)
npm run admin:setup-alerts -- --sms +34123456789 --type critical
```

### Logs del Sistema

#### Ubicación de Logs

```bash
# Logs de aplicación
tail -f logs/combined.log

# Logs de errores
tail -f logs/error.log

# Logs de acceso
tail -f logs/access.log

# Logs de auditoría
tail -f logs/audit.log

# Logs de monitoreo
tail -f logs/monitoring.log
```

#### Análisis de Logs

```bash
# Errores más frecuentes
grep "ERROR" logs/error.log | awk '{print $4}' | sort | uniq -c | sort -nr

# IPs con más requests
awk '{print $1}' logs/access.log | sort | uniq -c | sort -nr | head -10

# Endpoints más utilizados
awk '{print $7}' logs/access.log | sort | uniq -c | sort -nr | head -10
```

## Análisis y Métricas

### Analytics del Sistema

#### Métricas Globales

```bash
# Obtener métricas del sistema
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/admin/analytics/system

# Métricas por organización
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/admin/analytics/organizations

# Usuarios más activos
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/admin/analytics/users/active
```

#### Reportes Automáticos

```bash
# Configurar reporte diario
npm run admin:setup-reports -- --type daily --email admin@tudominio.com

# Reporte semanal de uso
npm run admin:generate-report -- --type usage --period week --format pdf

# Reporte mensual de facturación
npm run admin:generate-report -- --type billing --period month --format excel
```

### Optimización de Rendimiento

#### Análisis de Consultas

```javascript
// Habilitar profiling en MongoDB
db.setProfilingLevel(2, { slowms: 100 });

// Ver consultas lentas
db.system.profile.find().sort({ ts: -1 }).limit(5);

// Crear índices optimizados
db.deliveryRecords.createIndex({ organizationId: 1, createdAt: -1 });
db.users.createIndex({ organizationId: 1, email: 1 });
```

#### Optimización de Memoria

```bash
# Monitorear uso de memoria
npm run admin:memory-usage

# Limpiar caché
npm run admin:clear-cache

# Optimizar base de datos
npm run admin:optimize-db
```

## Seguridad

### Configuración de Seguridad

#### Firewall y Red

```bash
# Configurar UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5000/tcp  # Solo acceso interno
sudo ufw enable

# Configurar fail2ban
sudo apt-get install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# Editar jail.local para configurar reglas
```

#### SSL/TLS

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Renovación automática
sudo crontab -e
# Añadir: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Configuración de Nginx

```nginx
# /etc/nginx/sites-available/autocontrol
server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;
    
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
    
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Auditoría de Seguridad

#### Logs de Auditoría

```bash
# Ver intentos de login fallidos
grep "login_failed" logs/audit.log | tail -20

# Accesos de administrador
grep "admin_action" logs/audit.log | tail -20

# Cambios en configuración
grep "config_change" logs/audit.log | tail -20
```

#### Análisis de Seguridad

```bash
# Ejecutar análisis de seguridad
npm run admin:security-scan

# Verificar configuración
npm run admin:security-check

# Generar reporte de seguridad
npm run admin:security-report -- --format pdf --output security-report.pdf
```

## Mantenimiento

### Tareas de Mantenimiento

#### Backup Automático

```bash
# Configurar backup diario
npm run admin:setup-backup -- --schedule "0 2 * * *" --retention 30

# Backup manual
npm run admin:backup -- --type full --compress true

# Restaurar backup
npm run admin:restore -- --file backup-2024-01-15.tar.gz --confirm
```

#### Limpieza de Datos

```bash
# Limpiar logs antiguos
npm run admin:cleanup-logs -- --days 30

# Limpiar archivos temporales
npm run admin:cleanup-temp

# Limpiar datos de analytics antiguos
npm run admin:cleanup-analytics -- --days 90
```

#### Actualizaciones

```bash
# Verificar actualizaciones
npm run admin:check-updates

# Actualizar dependencias
npm run admin:update-deps

# Actualizar aplicación
npm run admin:update -- --version 1.1.0 --backup true
```

### Monitoreo de Salud

#### Health Checks

```bash
# Verificar estado general
curl http://localhost:5000/health

# Verificar base de datos
curl http://localhost:5000/api/monitoring/health

# Verificar servicios externos
npm run admin:health-check -- --external
```

#### Métricas de Rendimiento

```bash
# Estadísticas de uso
npm run admin:stats

# Rendimiento de la base de datos
npm run admin:db-stats

# Uso de recursos
npm run admin:resource-usage
```

## Solución de Problemas

### Problemas Comunes

#### Base de Datos

**Problema**: Conexión lenta a MongoDB
```bash
# Verificar índices
npm run admin:check-indexes

# Optimizar consultas
npm run admin:optimize-queries

# Verificar configuración
npm run admin:db-config-check
```

**Problema**: Espacio en disco insuficiente
```bash
# Verificar uso de disco
df -h

# Limpiar logs antiguos
npm run admin:cleanup-logs -- --days 7

# Comprimir backups
npm run admin:compress-backups
```

#### Rendimiento

**Problema**: Alta latencia en API
```bash
# Verificar carga del servidor
top
htop

# Analizar logs de rendimiento
npm run admin:performance-analysis

# Optimizar configuración
npm run admin:optimize-config
```

**Problema**: Memoria insuficiente
```bash
# Verificar uso de memoria
free -h

# Reiniciar servicios
npm run admin:restart-services

# Optimizar configuración de Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Herramientas de Diagnóstico

#### Scripts de Diagnóstico

```bash
# Diagnóstico completo
npm run admin:diagnose

# Verificar configuración
npm run admin:config-check

# Test de conectividad
npm run admin:connectivity-test

# Verificar permisos
npm run admin:permissions-check
```

#### Logs de Debug

```bash
# Habilitar modo debug
export DEBUG=autocontrol:*
npm start

# Logs detallados
export LOG_LEVEL=debug
npm start

# Profiling de rendimiento
export NODE_ENV=profiling
npm start
```

## Configuración Avanzada

### Escalabilidad

#### Load Balancing

```nginx
# /etc/nginx/nginx.conf
upstream autocontrol_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    location /api/ {
        proxy_pass http://autocontrol_backend;
    }
}
```

#### Clustering

```javascript
// cluster.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  require('./server.js');
}
```

#### Redis para Caché

```javascript
// config/redis.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

module.exports = client;
```

### Integración con Servicios Externos

#### Configurar CDN

```javascript
// config/cdn.js
module.exports = {
  enabled: process.env.CDN_ENABLED === 'true',
  url: process.env.CDN_URL || 'https://cdn.tudominio.com',
  regions: ['eu-west-1', 'us-east-1'],
  cache: {
    static: '1y',
    api: '5m',
    images: '30d'
  }
};
```

#### Configurar Elasticsearch

```javascript
// config/elasticsearch.js
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD
  }
});

module.exports = client;
```

### Personalización

#### Temas Personalizados

```javascript
// config/themes.js
module.exports = {
  default: {
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    fontFamily: 'Inter, sans-serif'
  },
  custom: {
    // Configuración personalizada por organización
    organizationId: {
      primaryColor: '#custom-color',
      logo: 'custom-logo.png'
    }
  }
};
```

#### Plugins

```javascript
// plugins/custom-plugin.js
module.exports = {
  name: 'custom-plugin',
  version: '1.0.0',
  init: (app) => {
    app.use('/api/custom', require('./routes'));
  },
  hooks: {
    'user:created': (user) => {
      // Lógica personalizada
    }
  }
};
```

---

## Contacto y Soporte

### Soporte Técnico

- **Email**: admin-support@autocontrolpro.com
- **Teléfono**: +34 900 123 456 (24/7 para emergencias)
- **Slack**: Canal #admin-support
- **Documentación**: https://docs.autocontrolpro.com/admin

### Recursos Adicionales

- **Repositorio**: https://github.com/autocontrolpro/backend
- **Issues**: https://github.com/autocontrolpro/backend/issues
- **Changelog**: https://docs.autocontrolpro.com/changelog
- **Status Page**: https://status.autocontrolpro.com

---

*Última actualización: 15 de enero de 2024*
*Versión: 1.0.0*