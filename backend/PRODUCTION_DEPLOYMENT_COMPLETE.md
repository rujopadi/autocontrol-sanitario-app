# AutoControl Pro - Complete Production Deployment Guide

## 📋 Overview

Esta guía completa cubre todo el proceso de despliegue de AutoControl Pro en un entorno de producción, incluyendo configuración de entorno, SSL, monitoreo, y seguridad.

## 🚀 Quick Start

Para un despliegue rápido y automatizado:

```bash
# Ejecutar el script de configuración completa
cd backend
chmod +x scripts/setup-production-complete.js
sudo node scripts/setup-production-complete.js
```

## 📁 Estructura de Archivos de Producción

```
backend/
├── scripts/
│   ├── setup-production-complete.js      # Script maestro de configuración
│   ├── setup-production-environment.js   # Configuración de entorno
│   ├── setup-ssl-certificates.js         # Configuración SSL
│   ├── setup-health-monitoring.js        # Monitoreo y health checks
│   ├── deploy.sh                         # Script de despliegue
│   ├── health-check.sh                   # Health check automático
│   ├── system-monitoring.sh              # Monitoreo del sistema
│   └── send-alert.sh                     # Sistema de alertas
├── nginx/
│   ├── autocontrol-pro.conf             # Configuración Nginx
│   └── security-headers.conf            # Headers de seguridad
├── systemd/
│   ├── autocontrol-pro.service          # Servicio principal
│   ├── autocontrol-pro-healthcheck.*    # Health check service
│   └── autocontrol-pro-monitoring.*     # Monitoring service
├── config/
│   ├── rsyslog-autocontrol-pro.conf     # Configuración logs
│   ├── fluentd-autocontrol-pro.conf     # Agregación de logs
│   └── logrotate-autocontrol-pro        # Rotación de logs
├── monitoring/
│   └── dashboard.html                   # Dashboard de monitoreo
├── routes/
│   └── health.routes.js                 # Endpoints de health check
├── .env.production.template             # Template de variables
└── .env.production                      # Variables de producción (NO COMMIT)
```

## 🔧 Configuración Paso a Paso

### 1. Preparación del Sistema

#### Requisitos del Sistema
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: 18.x o superior
- **MongoDB**: 5.0+ (recomendado MongoDB Atlas)
- **Nginx**: 1.18+
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **Disco**: Mínimo 20GB SSD
- **CPU**: 2 cores mínimo

#### Instalación de Dependencias
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm nginx git curl systemd

# CentOS/RHEL
sudo yum update
sudo yum install -y nodejs npm nginx git curl systemd
```

### 2. Configuración de Usuario del Sistema

```bash
# Crear usuario del sistema
sudo useradd -r -s /bin/false -d /opt/autocontrol-pro -c "AutoControl Pro System User" autocontrol

# Crear directorios
sudo mkdir -p /opt/autocontrol-pro
sudo mkdir -p /var/log/autocontrol-pro
sudo mkdir -p /var/uploads/autocontrol-pro
sudo mkdir -p /etc/autocontrol-pro

# Configurar permisos
sudo chown -R autocontrol:autocontrol /opt/autocontrol-pro
sudo chown -R autocontrol:autocontrol /var/log/autocontrol-pro
sudo chown -R autocontrol:autocontrol /var/uploads/autocontrol-pro
```

### 3. Configuración de Variables de Entorno

```bash
# Ejecutar configuración interactiva
node scripts/setup-production-environment.js
```

**Variables Críticas a Configurar:**
- `MONGODB_URI`: Conexión a MongoDB Atlas o instancia local
- `JWT_SECRET`: Clave secreta para JWT (generada automáticamente)
- `FRONTEND_URL`: URL del frontend (https://yourdomain.com)
- `BACKEND_URL`: URL del backend (https://api.yourdomain.com)
- `SENDGRID_API_KEY` o configuración SMTP
- `SSL_CERT_PATH` y `SSL_KEY_PATH`

### 4. Configuración SSL/HTTPS

```bash
# Configuración automática con Let's Encrypt
node scripts/setup-ssl-certificates.js

# O configuración manual
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 5. Configuración de Monitoreo

```bash
# Configurar health checks y monitoreo
node scripts/setup-health-monitoring.js
```

**Endpoints de Monitoreo Creados:**
- `GET /health` - Health check básico
- `GET /health/detailed` - Health check detallado
- `GET /ready` - Readiness probe (Kubernetes)
- `GET /live` - Liveness probe (Kubernetes)
- `GET /metrics` - Métricas Prometheus

### 6. Despliegue de la Aplicación

```bash
# Clonar repositorio
git clone https://github.com/yourusername/autocontrol-pro.git /opt/autocontrol-pro
cd /opt/autocontrol-pro

# Ejecutar script de despliegue
./backend/deploy.sh
```

## 🔒 Configuración de Seguridad

### Firewall (UFW)
```bash
# Configurar firewall básico
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Fail2Ban
```bash
# Instalar y configurar Fail2Ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Headers de Seguridad
Los headers de seguridad se configuran automáticamente en Nginx:
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection`
- `Content-Security-Policy`

## 📊 Monitoreo y Logging

### Logs del Sistema
```bash
# Ver logs de la aplicación
sudo journalctl -u autocontrol-pro -f

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs específicos de AutoControl Pro
sudo tail -f /var/log/autocontrol-pro/application.log
```

### Dashboard de Monitoreo
Accesible en: `https://yourdomain.com/monitoring/dashboard.html`

### Health Checks Automáticos
- **Frecuencia**: Cada 2 minutos
- **Auto-restart**: Después de 3 fallos consecutivos
- **Logs**: `/var/log/autocontrol-pro/healthcheck.log`

### Monitoreo del Sistema
- **CPU, Memoria, Disco**: Cada 5 minutos
- **Alertas**: Configurables via webhook
- **Logs**: `/var/log/autocontrol-pro/monitoring.log`

## 🔄 Backup y Recuperación

### Backup Automático
```bash
# Configurar backups automáticos
node scripts/setup-automated-backups.js

# Backup manual
node scripts/backup-database.js create
```

### Configuración de Backup
- **Frecuencia**: Diario a las 2:00 AM
- **Retención**: 30 días
- **Encriptación**: AES-256
- **Ubicación**: `/opt/backups/autocontrol-pro/`

### Restauración
```bash
# Listar backups disponibles
node scripts/backup-database.js list

# Restaurar backup específico
node scripts/backup-database.js restore backup_20241201_020000.tar.gz.enc
```

## 🚀 Despliegue de Actualizaciones

### Proceso de Actualización
```bash
# 1. Crear backup
node scripts/backup-database.js create

# 2. Ejecutar despliegue
./deploy.sh

# 3. Verificar health check
curl -f https://api.yourdomain.com/health
```

### Rollback
```bash
# En caso de problemas, restaurar backup
sudo systemctl stop autocontrol-pro
node scripts/backup-database.js restore latest
sudo systemctl start autocontrol-pro
```

## 📈 Optimización de Rendimiento

### Base de Datos
- **Índices**: Configurados automáticamente para consultas multi-tenant
- **Connection Pooling**: Máximo 10 conexiones
- **Query Optimization**: Filtrado automático por organización

### Nginx
- **Gzip**: Habilitado para todos los assets
- **Caching**: Headers de cache para archivos estáticos
- **Rate Limiting**: 100 requests/15min por IP

### Node.js
- **Clustering**: Configurado para usar todos los cores disponibles
- **Memory Limits**: Configurado según recursos del servidor
- **Garbage Collection**: Optimizado para producción

## 🔍 Troubleshooting

### Problemas Comunes

#### Servicio no inicia
```bash
# Verificar logs
sudo journalctl -u autocontrol-pro -n 50

# Verificar configuración
node -c /opt/autocontrol-pro/backend/server.js

# Verificar permisos
sudo chown -R autocontrol:autocontrol /opt/autocontrol-pro
```

#### SSL/HTTPS no funciona
```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados
sudo certbot renew

# Verificar configuración Nginx
sudo nginx -t
```

#### Base de datos no conecta
```bash
# Verificar variables de entorno
grep MONGODB_URI /opt/autocontrol-pro/backend/.env.production

# Test de conexión
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(console.error)"
```

#### Alto uso de memoria
```bash
# Verificar procesos
ps aux | grep node

# Verificar logs de memoria
grep -i "memory" /var/log/autocontrol-pro/monitoring.log

# Reiniciar servicio
sudo systemctl restart autocontrol-pro
```

### Comandos de Diagnóstico
```bash
# Estado general del sistema
./scripts/system-monitoring.sh

# Test SSL
./test-ssl.sh yourdomain.com

# Verificar health checks
curl -s https://api.yourdomain.com/health/detailed | jq

# Verificar métricas
curl -s https://api.yourdomain.com/metrics
```

## 📞 Soporte y Mantenimiento

### Tareas de Mantenimiento Regular

#### Diarias
- [ ] Verificar logs de errores
- [ ] Comprobar health checks
- [ ] Revisar uso de recursos

#### Semanales
- [ ] Verificar backups
- [ ] Actualizar dependencias de seguridad
- [ ] Revisar métricas de rendimiento

#### Mensuales
- [ ] Renovar certificados SSL (automático)
- [ ] Limpiar logs antiguos
- [ ] Revisar y actualizar configuraciones
- [ ] Test de restauración de backup

### Contacto de Soporte
- **Documentación**: [GitHub Wiki](https://github.com/yourusername/autocontrol-pro/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/autocontrol-pro/issues)
- **Email**: support@autocontrolpro.com

## 📋 Checklist de Despliegue

### Pre-Despliegue
- [ ] Servidor configurado con requisitos mínimos
- [ ] DNS configurado apuntando al servidor
- [ ] MongoDB Atlas o instancia configurada
- [ ] Certificados SSL obtenidos
- [ ] Variables de entorno configuradas
- [ ] Firewall configurado

### Despliegue
- [ ] Código clonado y dependencias instaladas
- [ ] Servicios systemd instalados y habilitados
- [ ] Nginx configurado y funcionando
- [ ] SSL/HTTPS funcionando correctamente
- [ ] Health checks respondiendo
- [ ] Logs configurados y funcionando

### Post-Despliegue
- [ ] Aplicación accesible desde internet
- [ ] Registro de usuarios funcionando
- [ ] Email de verificación funcionando
- [ ] Backups automáticos configurados
- [ ] Monitoreo externo configurado
- [ ] Documentación actualizada
- [ ] Equipo entrenado en procedimientos

---

**🎉 ¡Felicitaciones! Tu instancia de AutoControl Pro está lista para producción.**

Para soporte adicional, consulta la documentación completa o contacta al equipo de desarrollo.