# 🚀 Despliegue Backend en Dokploy - Paso a Paso

## ⚠️ IMPORTANTE: Recrear desde Cero

El backend actual no funciona porque tiene problemas de configuración. Necesitas **ELIMINAR** la aplicación actual y crear una nueva.

## 📋 Pasos Detallados

### 1. 🗑️ Eliminar Aplicación Backend Actual
1. Ve a tu panel de **Dokploy**
2. Busca tu aplicación backend actual
3. Haz clic en **"Settings"** o **"Configuración"**
4. Busca la opción **"Delete Application"** o **"Eliminar Aplicación"**
5. **Confirma la eliminación**

### 2. ➕ Crear Nueva Aplicación Backend

#### 2.1 Crear Aplicación
1. En Dokploy, haz clic en **"Create Application"**
2. Selecciona **"Docker Compose"** (NO solo Dockerfile)
3. Configura:
   - **Name**: `autocontrol-backend`
   - **Repository**: `https://github.com/rujopadi/autocontrol-sanitario-backend`
   - **Branch**: `main`
   - **Build Path**: `/` (raíz)

#### 2.2 Variables de Entorno CRÍTICAS
Configura estas variables exactamente así:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongodb:27017/autocontrol-sanitario
JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789
```

⚠️ **IMPORTANTE**: Usa exactamente estas variables, especialmente el `JWT_SECRET`.

### 3. 🚀 Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que termine el proceso (puede tomar 2-5 minutos)
3. **NO cierres la ventana** hasta que termine

### 4. 🔍 Verificar Logs

1. Ve a **"Logs"** o **"Container Logs"**
2. Busca estos mensajes de éxito:

```
🚀 Iniciando servidor backend...
📊 Variables de entorno:
- NODE_ENV: production
- PORT: 5000
- MONGO_URI: Configurado
- JWT_SECRET: Configurado
🚀 Servidor corriendo en el puerto 5000
📡 Environment: production
🌐 CORS: Enabled for all origins
MongoDB Conectado...
```

### 5. 🧪 Probar el Backend

Una vez desplegado, prueba estas URLs en tu navegador:

- **Health Check**: `http://tu-nueva-url-backend.traefik.me/health`
- **CORS Test**: `http://tu-nueva-url-backend.traefik.me/api/cors-test`
- **Root**: `http://tu-nueva-url-backend.traefik.me/`

**Respuesta esperada** (health check):
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "uptime": 123.45,
  "cors": "enabled"
}
```

### 6. 🔄 Actualizar Frontend

Si el backend funciona pero tiene una URL diferente:

1. Ve a tu aplicación **frontend** en Dokploy
2. Actualiza la variable de entorno:
   ```env
   VITE_API_URL=http://tu-nueva-url-backend.traefik.me
   ```
3. **Rebuild** el frontend

## 🆘 Si Algo Sale Mal

### Backend no inicia
- Revisa los logs del contenedor
- Verifica que todas las variables de entorno están configuradas
- Asegúrate de usar **Docker Compose**, no solo Dockerfile

### URLs no responden
- Verifica que el contenedor esté corriendo
- Revisa la configuración de Traefik
- Comprueba que el puerto 5000 esté mapeado correctamente

### Error de MongoDB
- El MongoDB se creará automáticamente
- Si hay errores, verifica la variable `MONGO_URI`

## ✅ Resultado Esperado

Después de seguir estos pasos:
- ✅ Backend responde en todas las URLs
- ✅ No hay errores CORS
- ✅ Puedes registrarte en la aplicación
- ✅ Todas las funciones funcionan correctamente

## 📞 Próximo Paso

Una vez que el backend funcione correctamente, prueba **registrarte** en tu aplicación frontend. El error CORS debería desaparecer completamente.