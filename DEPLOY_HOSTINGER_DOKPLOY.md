# Despliegue en Hostinger VPS con Dokploy

## ✅ Estado actual
- ✅ Build funciona correctamente
- ✅ Dockerfile configurado
- ✅ docker-compose.yml listo
- ✅ nginx.conf optimizado
- ✅ Sistema de notificaciones implementado

## 🚀 Pasos para desplegar

### 1. Subir código a repositorio Git

#### Opción A: Crear nuevo repositorio en GitHub
1. Ve a https://github.com/new
2. Nombre: `autocontrol-sanitario-app`
3. Público o privado (tu elección)
4. No inicializar con README (ya tienes archivos)

#### Opción B: Usar repositorio existente
Si ya tienes uno, asegúrate de tener acceso.

### 2. Configurar repositorio local
```bash
# Si es nuevo repositorio:
git remote set-url origin https://github.com/TU-USUARIO/autocontrol-sanitario-app.git

# Hacer push
git push -u origin main
```

### 3. En tu panel de Dokploy (Hostinger)

#### 3.1 Crear nueva aplicación
1. Accede a tu Dokploy: `https://tu-vps-ip:3000`
2. Click en "Create Application"
3. Selecciona "Docker Compose"

#### 3.2 Configurar repositorio
- **Repository URL**: `https://github.com/TU-USUARIO/autocontrol-sanitario-app.git`
- **Branch**: `main`
- **Build Path**: `/` (raíz del proyecto)
- **Docker Compose File**: `docker-compose.yml`

#### 3.3 Variables de entorno IMPORTANTES
```env
VITE_API_URL=https://tu-backend.tu-dominio.com
VITE_APP_NAME=Autocontrol Sanitario Pro
VITE_APP_VERSION=1.0.0
NODE_ENV=production
```

⚠️ **IMPORTANTE**: Cambia `tu-backend.tu-dominio.com` por la URL real de tu backend.

#### 3.4 Configurar dominio (opcional)
- **Domain**: `autocontrol.tu-dominio.com`
- **SSL**: ✅ Habilitado (recomendado)

#### 3.5 Configurar puertos
- **Container Port**: `80`
- **Host Port**: `80` (o el que prefieras)

### 4. Deploy
1. Click en "Deploy"
2. Monitorea los logs en tiempo real
3. Espera a que termine el build (puede tomar 2-5 minutos)

### 5. Verificar despliegue
- Accede a `http://tu-vps-ip` o `https://tu-dominio.com`
- Verifica que la aplicación carga
- Prueba el sistema de notificaciones
- Intenta hacer login (fallará sin backend, pero la UI debe funcionar)

## 🔧 Configuración específica para tu setup

### Backend requerido
Tu aplicación necesita un backend con estos endpoints:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth` (verificar token)
- `GET /api/users`
- `POST /api/users`
- `GET /api/establishment`
- `POST /api/establishment`
- `GET /api/records/delivery`
- `POST /api/records/delivery`
- `DELETE /api/records/delivery/:id`

### Base de datos
- MongoDB (recomendado por los IDs string)
- O cualquier base de datos que soporte tu backend

## 🆘 Solución de problemas

### Build falla en Dokploy
- Revisa los logs en tiempo real
- Verifica que todas las dependencias estén en package.json
- Asegúrate de que el repositorio sea accesible

### Aplicación no carga
- Verifica que el contenedor esté corriendo
- Revisa los logs del contenedor
- Confirma que el puerto esté correctamente mapeado

### Error de CORS
- Configura CORS en tu backend para permitir tu dominio frontend
- Ejemplo: `https://autocontrol.tu-dominio.com`

### Variables de entorno no funcionan
- Asegúrate de que empiecen con `VITE_`
- Reconstruye la aplicación después de cambiar variables
- Las variables se inyectan en build time, no runtime

## 📊 Monitoreo post-despliegue

### Logs
```bash
# En tu VPS, ver logs del contenedor
docker logs nombre-contenedor-frontend
```

### Métricas
- CPU y memoria en panel de Dokploy
- Tiempo de respuesta
- Errores en logs

### Actualizaciones
1. Haz cambios en tu código local
2. Commit y push a Git
3. Dokploy redesplegará automáticamente (si configuraste webhooks)
4. O haz click en "Rebuild" manualmente

## 🎯 Próximos pasos

1. **Desplegar frontend** (este paso)
2. **Desplegar backend** (siguiente paso)
3. **Configurar base de datos**
4. **Configurar dominio y SSL**
5. **Configurar backups**

¡Tu aplicación está lista para producción! 🚀