# Despliegue del Backend en Dokploy

## 🚀 Pasos para desplegar

### 1. Crear repositorio en GitHub
- Nombre: `autocontrol-sanitario-backend`
- Subir el código del backend

### 2. En Dokploy - Crear aplicación backend
1. **Create Application** → **Docker Compose**
2. **Repository**: `https://github.com/rujopadi/autocontrol-sanitario-backend`
3. **Branch**: `main`
4. **Build Path**: `/`

### 3. Variables de entorno CRÍTICAS
```env
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambialo
NODE_ENV=production
MONGO_URI=mongodb://mongodb:27017/autocontrol-sanitario
PORT=5000
```

⚠️ **IMPORTANTE**: Cambia `JWT_SECRET` por algo seguro como: `mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789`

### 4. Configuración de red
- El backend y MongoDB estarán en la misma red Docker
- MongoDB será accesible internamente como `mongodb:27017`

### 5. Una vez desplegado el backend
1. **Actualizar frontend** con la URL del backend
2. **Variables de entorno del frontend**:
   ```env
   VITE_API_URL=https://tu-backend-url.traefik.me
   ```

### 6. Probar la conexión
- Backend: `https://tu-backend-url.traefik.me`
- Debería mostrar: "API para Autocontrol Sanitario Pro funcionando."

## 🔧 Configuración del frontend

Una vez que el backend esté funcionando, actualiza el frontend:

1. **En Dokploy** → **Frontend App** → **Environment Variables**
2. **Cambiar**:
   ```env
   VITE_API_URL=https://tu-backend-url.traefik.me
   ```
3. **Rebuild** el frontend

## 🧪 Probar la integración

1. **Accede al frontend**
2. **Intenta registrarte** - debería funcionar
3. **Inicia sesión** - debería funcionar
4. **Navega por la app** - todas las funciones deberían funcionar

## 📊 Monitoreo

### Logs del backend
```bash
docker logs nombre-contenedor-backend
```

### Logs de MongoDB
```bash
docker logs nombre-contenedor-mongodb
```

### Verificar conexión a BD
El backend mostrará: "MongoDB Conectado..." en los logs

## 🆘 Solución de problemas

### Backend no inicia
- Verificar variables de entorno
- Revisar logs de Docker
- Confirmar que MongoDB esté corriendo

### Frontend no conecta con backend
- Verificar `VITE_API_URL`
- Confirmar CORS en backend
- Revisar logs de red

### Error de autenticación
- Verificar `JWT_SECRET`
- Confirmar que sea el mismo en todas las instancias

## 🔒 Seguridad post-despliegue

1. **Cambiar JWT_SECRET** por uno único y seguro
2. **Configurar HTTPS** para el backend
3. **Configurar backups** de MongoDB
4. **Monitorear logs** regularmente