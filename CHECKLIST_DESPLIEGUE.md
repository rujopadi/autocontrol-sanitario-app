# ✅ Checklist de Despliegue Backend

## Antes de Empezar
- [ ] Repositorio backend actualizado en GitHub ✅ (Ya hecho)
- [ ] Cambios confirmados y subidos ✅ (Ya hecho)

## En Dokploy

### 1. Eliminar Backend Actual
- [ ] Ir a Dokploy
- [ ] Buscar aplicación backend actual
- [ ] Eliminar aplicación completamente

### 2. Crear Nueva Aplicación
- [ ] Create Application
- [ ] Seleccionar **Docker Compose**
- [ ] Repository: `https://github.com/rujopadi/autocontrol-sanitario-backend`
- [ ] Branch: `main`
- [ ] Build Path: `/`

### 3. Variables de Entorno
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `MONGO_URI=mongodb://mongodb:27017/autocontrol-sanitario`
- [ ] `JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789`

### 4. Desplegar
- [ ] Hacer clic en Deploy
- [ ] Esperar a que termine (2-5 minutos)
- [ ] Revisar logs del contenedor

### 5. Verificar
- [ ] Probar URL health: `/health`
- [ ] Probar URL CORS: `/api/cors-test`
- [ ] Probar URL root: `/`

### 6. Actualizar Frontend (si es necesario)
- [ ] Actualizar `VITE_API_URL` con nueva URL del backend
- [ ] Rebuild frontend

## Resultado Final
- [ ] Backend responde correctamente
- [ ] No hay errores CORS
- [ ] Registro funciona en la aplicación
- [ ] Todas las funciones operativas

---

## 🎯 Objetivo
**Poder registrarse sin errores CORS en la aplicación frontend**