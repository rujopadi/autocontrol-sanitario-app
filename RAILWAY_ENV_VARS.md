# Variables de Entorno para Railway

## Backend Variables
```env
NODE_ENV=production
PORT=$PORT
MONGO_URI=${{MongoDB.DATABASE_URL}}
JWT_SECRET=autocontrol_pro_jwt_secret_2024_railway_production_secure_key_123456789
CORS_ORIGIN=https://tu-frontend.railway.app
```

## Frontend Variables
```env
VITE_API_URL=https://tu-backend.railway.app
```

## Instrucciones:
1. En Railway, ve a tu servicio backend
2. Click en "Variables" 
3. Añade cada variable una por una
4. Railway reiniciará automáticamente el servicio