# ⚡ Despliegue en Vercel - Ultra Rápido

## ¿Por qué Vercel?
- ✅ Especializado en React/Next.js
- ✅ Despliegue instantáneo
- ✅ CDN global automático
- ✅ HTTPS automático
- ✅ Integración perfecta con GitHub

## 📋 Pasos

### 1. Frontend en Vercel
1. Ve a [vercel.com](https://vercel.com)
2. **Import Project** desde GitHub
3. Selecciona tu repositorio frontend
4. **Deploy** (automático)

### 2. Backend en Vercel
1. **New Project** → Repositorio backend
2. Vercel detectará Node.js automáticamente
3. Configurar variables de entorno

### 3. Base de Datos - MongoDB Atlas
1. [mongodb.com/atlas](https://mongodb.com/atlas) - Cluster gratuito
2. Obtener connection string
3. Configurar en variables de entorno

### 4. Variables Backend
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=tu_secreto_seguro
```

### 5. Variables Frontend
```env
VITE_API_URL=https://tu-backend.vercel.app
```

## ✅ Ventajas
- **Instantáneo**: Despliegue en segundos
- **Global**: CDN mundial automático
- **Gratuito**: Plan gratuito muy generoso
- **Automático**: Auto-deploy desde GitHub