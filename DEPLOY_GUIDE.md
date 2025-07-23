# Guía de Despliegue en Dokploy

## Prerrequisitos
- Servidor con Dokploy instalado
- Acceso SSH al servidor
- Dominio configurado (opcional pero recomendado)
- Backend API desplegado (si aplica)

## Paso 1: Preparar el repositorio

### 1.1 Subir código a Git
```bash
git add .
git commit -m "Preparar para despliegue en Dokploy"
git push origin main
```

### 1.2 Verificar archivos necesarios
Asegúrate de que tienes estos archivos en tu repositorio:
- ✅ `Dockerfile`
- ✅ `docker-compose.yml`
- ✅ `nginx.conf`
- ✅ `.dockerignore`
- ✅ `vite.config.ts` (actualizado)
- ✅ `.env.example`

## Paso 2: Configurar en Dokploy

### 2.1 Crear nueva aplicación
1. Accede a tu panel de Dokploy
2. Haz clic en "Create Application"
3. Selecciona "Docker Compose" o "Dockerfile"

### 2.2 Configurar repositorio
- **Repository URL**: `https://github.com/tu-usuario/tu-repo.git`
- **Branch**: `main`
- **Build Path**: `/` (raíz del proyecto)

### 2.3 Configurar variables de entorno
En la sección "Environment Variables", añade:

```env
VITE_API_URL=https://tu-backend-api.tu-dominio.com
VITE_APP_NAME=Autocontrol Sanitario Pro
VITE_APP_VERSION=1.0.0
NODE_ENV=production
```

### 2.4 Configurar puertos
- **Container Port**: `80`
- **Host Port**: `80` (o el que prefieras)

### 2.5 Configurar dominio (opcional)
Si tienes un dominio:
- **Domain**: `tu-app.tu-dominio.com`
- **SSL**: Habilitar (recomendado)

## Paso 3: Desplegar

### 3.1 Iniciar despliegue
1. Haz clic en "Deploy"
2. Dokploy clonará tu repositorio
3. Construirá la imagen Docker
4. Iniciará el contenedor

### 3.2 Monitorear el proceso
- Revisa los logs en tiempo real
- Verifica que no hay errores de build
- Confirma que el contenedor está corriendo

## Paso 4: Verificar despliegue

### 4.1 Acceder a la aplicación
- Visita `http://tu-servidor:puerto` o `https://tu-dominio.com`
- Verifica que la aplicación carga correctamente
- Prueba el login y funcionalidades básicas

### 4.2 Verificar conectividad con backend
- Intenta hacer login
- Verifica que las operaciones CRUD funcionan
- Revisa la consola del navegador para errores

## Paso 5: Configuración SSL (Recomendado)

### 5.1 Con dominio propio
Dokploy puede configurar SSL automáticamente con Let's Encrypt:
1. Ve a la configuración de tu aplicación
2. Habilita SSL/TLS
3. Dokploy generará el certificado automáticamente

### 5.2 Sin dominio (IP directa)
Si usas solo IP, considera usar un proxy reverso como Cloudflare.

## Paso 6: Configuración de backend (si aplica)

Si tu backend está en el mismo servidor:

### 6.1 Desplegar backend
1. Crea otra aplicación en Dokploy para el backend
2. Configura las variables de entorno del backend
3. Asegúrate de que la base de datos esté accesible

### 6.2 Configurar comunicación
- Backend en puerto 5000: `http://localhost:5000`
- Frontend apunta a: `https://tu-backend.tu-dominio.com`

## Comandos útiles

### Verificar contenedor
```bash
docker ps
docker logs nombre-contenedor
```

### Reconstruir aplicación
En Dokploy:
1. Ve a tu aplicación
2. Haz clic en "Rebuild"
3. O haz push a tu repositorio para auto-deploy

### Acceder al contenedor
```bash
docker exec -it nombre-contenedor sh
```

## Solución de problemas comunes

### Error: Cannot connect to backend
- Verifica la variable `VITE_API_URL`
- Asegúrate de que el backend esté corriendo
- Revisa los CORS en el backend

### Error: Build failed
- Revisa los logs de build en Dokploy
- Verifica que todas las dependencias estén en package.json
- Asegúrate de que no hay errores de TypeScript

### Error: 404 en rutas
- Verifica que nginx.conf esté configurado correctamente
- Asegúrate de que el SPA routing esté habilitado

### Error: Variables de entorno no funcionan
- Verifica que las variables empiecen con `VITE_`
- Reconstruye la aplicación después de cambiar variables
- Las variables se inyectan en build time, no runtime

## Actualizaciones

### Despliegue automático
Configura webhooks en tu repositorio para que Dokploy redesplegue automáticamente cuando hagas push.

### Despliegue manual
1. Haz push de tus cambios
2. Ve a Dokploy
3. Haz clic en "Rebuild" en tu aplicación

## Monitoreo

### Logs
- Revisa los logs regularmente en Dokploy
- Configura alertas si es necesario

### Métricas
- Monitorea el uso de CPU y memoria
- Verifica el tiempo de respuesta

### Backups
- Configura backups regulares si tienes datos importantes
- Considera usar volúmenes Docker para persistencia

## Seguridad

### Recomendaciones
- Usa HTTPS siempre que sea posible
- Mantén Dokploy actualizado
- Revisa los logs de seguridad regularmente
- Configura un firewall apropiado

### Variables sensibles
- Nunca hardcodees API keys en el código
- Usa variables de entorno para configuración sensible
- Considera usar secretos de Docker para datos muy sensibles