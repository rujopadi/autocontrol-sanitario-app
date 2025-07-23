# Configuración rápida para Dokploy

## ✅ Archivos preparados para despliegue

Tu aplicación ya tiene todos los archivos necesarios:

- `Dockerfile` - Configuración de contenedor
- `docker-compose.yml` - Orquestación de servicios
- `nginx.conf` - Servidor web optimizado
- `vite.config.ts` - Build optimizado para producción
- `.dockerignore` - Archivos excluidos del build
- `.env.example` - Template de variables de entorno

## 🚀 Pasos para desplegar en Dokploy

### 1. Subir código a Git
```bash
git add .
git commit -m "Configuración para Dokploy"
git push origin main
```

### 2. En tu panel de Dokploy:

#### Crear aplicación:
- Tipo: **Docker Compose** (recomendado) o **Dockerfile**
- Repository: Tu repositorio de GitHub/GitLab
- Branch: `main`

#### Variables de entorno requeridas:
```
VITE_API_URL=https://tu-backend.tu-dominio.com
VITE_APP_NAME=Autocontrol Sanitario Pro
VITE_APP_VERSION=1.0.0
NODE_ENV=production
```

#### Configuración de puertos:
- Container Port: `80`
- Host Port: `80` (o el que prefieras)

#### Dominio (opcional):
- Domain: `autocontrol.tu-dominio.com`
- SSL: ✅ Habilitado

### 3. Deploy
- Haz clic en **Deploy**
- Monitorea los logs
- Verifica que el contenedor esté corriendo

## 🔧 Configuración específica para tu app

### Backend API
Si tu backend está en otro servidor, asegúrate de:
1. Configurar CORS para permitir tu dominio frontend
2. Usar HTTPS si es posible
3. Actualizar `VITE_API_URL` con la URL correcta

### Base de datos
Si usas base de datos:
1. Asegúrate de que esté accesible desde tu backend
2. Configura las variables de entorno del backend
3. Considera usar Docker volumes para persistencia

## 🧪 Probar localmente (opcional)

Para probar antes de desplegar:

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build

# Construir imagen Docker
docker build -t autocontrol-test .

# Ejecutar contenedor
docker run -d -p 8080:80 autocontrol-test

# Visitar http://localhost:8080
```

## 📋 Checklist pre-despliegue

- [ ] Código subido a Git
- [ ] Variables de entorno configuradas
- [ ] Backend API accesible
- [ ] Dominio configurado (si aplica)
- [ ] SSL habilitado (recomendado)
- [ ] CORS configurado en backend

## 🆘 Solución de problemas

### Build falla:
- Revisa los logs en Dokploy
- Verifica que todas las dependencias estén en package.json
- Asegúrate de que no hay errores de TypeScript

### No conecta con backend:
- Verifica `VITE_API_URL`
- Revisa CORS en el backend
- Confirma que el backend esté corriendo

### 404 en rutas:
- El archivo `nginx.conf` ya está configurado para SPA
- Si persiste, verifica que se esté usando correctamente

## 🔄 Actualizaciones futuras

1. Haz cambios en tu código
2. Commit y push a Git
3. Dokploy redesplegará automáticamente (si configuraste webhooks)
4. O haz clic en "Rebuild" manualmente

## 📊 Monitoreo

Una vez desplegado:
- Revisa logs regularmente
- Monitorea uso de recursos
- Configura alertas si es necesario
- Haz backups de datos importantes

¡Tu aplicación está lista para desplegar en Dokploy! 🎉