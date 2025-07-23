# 🎨 Despliegue en Render - Alternativa Simple

## ¿Por qué Render?
- ✅ Interfaz muy intuitiva
- ✅ Despliegue automático
- ✅ HTTPS gratuito
- ✅ Plan gratuito disponible
- ✅ Soporte completo para Node.js y React

## 📋 Pasos

### 1. Crear Cuenta
1. Ve a [render.com](https://render.com)
2. Regístrate con GitHub

### 2. Desplegar Backend
1. **New** → **Web Service**
2. Conecta tu repositorio backend
3. Configuración:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### 3. Variables de Entorno Backend
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/autocontrol
JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789
```

### 4. MongoDB Atlas (Gratuito)
1. Ve a [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crea cluster gratuito
3. Obtén la connection string
4. Úsala en `MONGO_URI`

### 5. Desplegar Frontend
1. **New** → **Static Site**
2. Conecta tu repositorio frontend
3. Configuración:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

### 6. Variables de Entorno Frontend
```env
VITE_API_URL=https://tu-backend.onrender.com
```

## ✅ Ventajas
- **Gratuito**: Plan gratuito generoso
- **Automático**: Auto-deploy desde GitHub
- **Confiable**: Muy estable
- **Fácil**: Interfaz muy clara