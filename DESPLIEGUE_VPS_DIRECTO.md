# 🚀 Despliegue Directo en VPS Hostinger - Sin Dokploy

## ¿Por qué Despliegue Directo?
- ✅ **Más simple** que Dokploy
- ✅ **Control total** sobre el servidor
- ✅ **Menos problemas** de configuración
- ✅ **Más rápido** de configurar
- ✅ **Fácil debugging** y mantenimiento

## 📋 Requisitos
- VPS de Hostinger con acceso SSH
- Node.js y npm instalados
- MongoDB (o usaremos MongoDB Atlas gratuito)
- Nginx (para servir el frontend)
- PM2 (para mantener el backend corriendo)

## 🛠️ Preparación del VPS

### 1. Conectar por SSH
```bash
ssh root@tu-vps-ip
# O el usuario que tengas configurado
```

### 2. Instalar dependencias necesarias
```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js (si no está instalado)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Instalar PM2 (gestor de procesos)
npm install -g pm2

# Instalar Nginx (si no está instalado)
apt install nginx -y

# Verificar instalaciones
node --version
npm --version
pm2 --version
nginx -v
```

## 🚀 Despliegue del Backend

### 1. Clonar repositorio backend
```bash
cd /var/www
git clone https://github.com/rujopadi/autocontrol-sanitario-backend.git
cd autocontrol-sanitario-backend
```

### 2. Instalar dependencias
```bash
npm install --production
```

### 3. Configurar variables de entorno
```bash
# Crear archivo .env
nano .env
```

Contenido del archivo `.env`:
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/autocontrol-sanitario
JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789
```

### 4. Iniciar backend con PM2
```bash
# Iniciar aplicación
pm2 start server.js --name "autocontrol-backend"

# Configurar PM2 para auto-inicio
pm2 startup
pm2 save

# Verificar que esté corriendo
pm2 status
```

## 🎨 Despliegue del Frontend

### 1. Clonar repositorio frontend
```bash
cd /var/www
git clone https://github.com/rujopadi/autocontrol-sanitario-app.git
cd autocontrol-sanitario-app
```

### 2. Configurar variables de entorno
```bash
# Crear archivo .env
nano .env
```

Contenido:
```env
VITE_API_URL=http://tu-vps-ip:5000
```

### 3. Build del frontend
```bash
npm install
npm run build
```

### 4. Configurar Nginx
```bash
# Crear configuración de Nginx
nano /etc/nginx/sites-available/autocontrol
```

Contenido:
```nginx
server {
    listen 80;
    server_name tu-vps-ip;  # O tu dominio si tienes uno
    
    # Frontend
    location / {
        root /var/www/autocontrol-sanitario-app/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Activar configuración
```bash
# Crear enlace simbólico
ln -s /etc/nginx/sites-available/autocontrol /etc/nginx/sites-enabled/

# Probar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

## 🗄️ Configurar MongoDB

### Opción A: MongoDB Atlas (Recomendado - Gratuito)
1. Ve a [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crea cuenta gratuita
3. Crea cluster gratuito
4. Obtén connection string
5. Úsala en el archivo `.env` del backend

### Opción B: MongoDB Local (En el VPS)
```bash
# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Iniciar MongoDB
systemctl start mongod
systemctl enable mongod

# En .env usar: MONGO_URI=mongodb://localhost:27017/autocontrol-sanitario
```

## 🧪 Verificar Despliegue

### 1. Probar Backend
```bash
curl http://localhost:5000/health
# Debería devolver JSON con status "healthy"
```

### 2. Probar Frontend
```bash
curl http://tu-vps-ip
# Debería devolver HTML de tu aplicación
```

### 3. Probar en Navegador
- Ve a `http://tu-vps-ip`
- Intenta registrarte
- Debería funcionar sin errores CORS

## 🔧 Scripts de Mantenimiento

### Script de actualización
```bash
# Crear script de actualización
nano /var/www/update-app.sh
```

Contenido:
```bash
#!/bin/bash
echo "Actualizando aplicación..."

# Actualizar backend
cd /var/www/autocontrol-sanitario-backend
git pull origin main
npm install --production
pm2 restart autocontrol-backend

# Actualizar frontend
cd /var/www/autocontrol-sanitario-app
git pull origin main
npm install
npm run build

echo "Aplicación actualizada!"
```

```bash
# Hacer ejecutable
chmod +x /var/www/update-app.sh
```

## 📊 Monitoreo

### Ver logs del backend
```bash
pm2 logs autocontrol-backend
```

### Ver estado de servicios
```bash
pm2 status
systemctl status nginx
```

### Ver logs de Nginx
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## ✅ Ventajas de este Método

1. **Simple**: Sin Docker, sin Dokploy
2. **Directo**: Control total del servidor
3. **Rápido**: Menos capas de abstracción
4. **Confiable**: Menos puntos de fallo
5. **Fácil debugging**: Logs directos y accesibles
6. **Actualizaciones simples**: Script de actualización

## 🎯 Resultado Final

- **Frontend**: `http://tu-vps-ip`
- **Backend API**: `http://tu-vps-ip/api`
- **Aplicación completa funcionando**
- **Sin errores CORS**
- **Fácil mantenimiento**

¿Te parece mejor esta opción? Es mucho más directa y tendrás menos problemas que con Dokploy.