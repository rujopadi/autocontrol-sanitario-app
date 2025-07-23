# 🚂 Despliegue en Railway - Opción Más Sencilla

## ¿Por qué Railway?
- ✅ Despliegue automático desde GitHub
- ✅ Base de datos MongoDB incluida
- ✅ Variables de entorno fáciles
- ✅ HTTPS automático
- ✅ Logs en tiempo real
- ✅ Plan gratuito generoso

## 📋 Pasos Simples

### 1. Crear Cuenta en Railway
1. Ve a [railway.app](https://railway.app)
2. Regístrate con tu cuenta de GitHub
3. Conecta tu repositorio

### 2. Desplegar Backend
1. **New Project** → **Deploy from GitHub repo**
2. Selecciona tu repositorio backend: `autocontrol-sanitario-backend`
3. Railway detectará automáticamente que es Node.js
4. **Deploy** automáticamente

### 3. Añadir MongoDB
1. En tu proyecto, haz clic en **"+ New"**
2. Selecciona **"Database"** → **"Add MongoDB"**
3. Railway creará automáticamente la base de datos

### 4. Configurar Variables de Entorno
En el servicio backend, ve a **Variables**:
```env
NODE_ENV=production
PORT=$PORT
MONGO_URI=${{MongoDB.DATABASE_URL}}
JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789
```

### 5. Desplegar Frontend
1. **New Service** → **GitHub Repo**
2. Selecciona tu repositorio frontend
3. Configura variables:
```env
VITE_API_URL=https://tu-backend-url.railway.app
```

## ✅ Ventajas de Railway
- **Automático**: Detecta el tipo de aplicación
- **Simple**: Solo conectar GitHub y desplegar
- **Rápido**: Despliegue en minutos
- **Confiable**: Menos problemas que Dokploy
- **Gratuito**: Plan gratuito suficiente para desarrollo

## 🎯 Resultado
- Backend: `https://tu-backend.railway.app`
- Frontend: `https://tu-frontend.railway.app`
- MongoDB: Automáticamente configurado