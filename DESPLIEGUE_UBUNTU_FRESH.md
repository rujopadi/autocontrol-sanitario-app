# 🚀 Despliegue en Ubuntu VPS - Instalación Completa

## 🎯 VPS Info
- **IP**: 31.97.193.114
- **Usuario**: rujo
- **SO**: Ubuntu (recién instalado)

## 🔐 Paso 1: Conectar al VPS

```bash
ssh rujo@31.97.193.114
```

## 🛠️ Paso 2: Actualizar Sistema y Instalar Dependencias

### Actualizar Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalar herramientas básicas
```bash
sudo apt install -y curl wget git build-essential
```

### Instalar Node.js 18 (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Verificar instalación
```bash
node --version
npm --version
```

### Instalar PM2 (gestor de procesos)
```bash
sudo npm install -g pm2
```

### Instalar y configurar Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### Configurar firewall (opcional pero recomendado)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 📥 Paso 3: Preparar Directorios y Clonar Repositorios

### Crear y configurar directorio web
```bash
sudo mkdir -p /var/www
sudo chown -R rujo:rujo /var/www
cd /var/www
```

### Clonar repositorios
```bash
# Clonar backend
git clone https://github.com/rujopadi/autocontrol-sanitario-backend.git backend

# Clonar frontend
git clone https://github.com/rujopadi/autocontrol-sanitario-app.git frontend
```

## ⚙️ Paso 4: Configurar Backend

### Instalar dependencias del backend
```bash
cd /var/www/backend
npm install
```

### Crear archivo de configuración
```bash
nano .env
```

**Contenido del .env:**
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/autocontrol-sanitario
JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789
```

### Probar que el backend funciona
```bash
node server.js
```
*Presiona Ctrl+C para parar*

### Iniciar con PM2
```bash
pm2 start server.js --name backend
pm2 startup
# Ejecuta el comando que te muestre PM2
pm2 save
```

### Verificar estado
```bash
pm2 status
pm2 logs backend
```

## 🎨 Paso 5: Configurar Frontend

### Instalar dependencias del frontend
```bash
cd /var/www/frontend
npm install
```

### Crear archivo de configuración
```bash
nano .env
```

**Contenido del .env:**
```env
VITE_API_URL=http://31.97.193.114:5000
```

### Hacer build del frontend
```bash
npm run build
```

### Verificar que se creó la carpeta dist
```bash
ls -la dist/
```

## 🌐 Paso 6: Configurar Nginx

### Hacer backup de la configuración original
```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

### Editar configuración de Nginx
```bash
sudo nano /etc/nginx/sites-available/default
```

**Reemplazar TODO el contenido con:**
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/frontend/dist;
    index index.html;
    
    server_name 31.97.193.114;
    
    # Configuración para archivos estáticos
    location / {
        try_files $uri $uri/ /index.html;
        
        # Headers de cache para archivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy para el backend API
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
        
        # Headers CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token";
        
        # Manejar preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token";
            return 204;
        }
    }
    
    # Configuración de logs
    access_log /var/log/nginx/autocontrol_access.log;
    error_log /var/log/nginx/autocontrol_error.log;
}
```

### Probar configuración de Nginx
```bash
sudo nginx -t
```

### Si todo está bien, reiniciar Nginx
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

## 🗄️ Paso 7: Configurar MongoDB Atlas

1. Ve a [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crea cuenta gratuita
3. Crea cluster gratuito (M0 Sandbox - 512MB)
4. En "Database Access" → Crea usuario de base de datos
5. En "Network Access" → Add IP Address → Allow access from anywhere (0.0.0.0/0)
6. En "Clusters" → Connect → Connect your application
7. Copia la connection string
8. Actualiza el archivo `.env` del backend

### Actualizar .env con MongoDB Atlas
```bash
cd /var/www/backend
nano .env
```

Actualiza la línea MONGO_URI con tu connection string real.

### Reiniciar backend
```bash
pm2 restart backend
pm2 logs backend
```

## 🧪 Paso 8: Probar Todo

### Probar backend directamente
```bash
curl http://localhost:5000/health
```

### Probar frontend
```bash
curl http://31.97.193.114
```

### Probar API a través de Nginx
```bash
curl http://31.97.193.114/api/cors-test
```

### Probar en navegador
Ve a: **http://31.97.193.114**

## 📊 Comandos de Monitoreo

### Ver logs del backend
```bash
pm2 logs backend
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/autocontrol_error.log
sudo tail -f /var/log/nginx/autocontrol_access.log
```

### Ver estado de servicios
```bash
pm2 status
sudo systemctl status nginx
```

## 🔄 Script de Actualización

### Crear script de actualización
```bash
nano /home/rujo/actualizar-app.sh
```

**Contenido:**
```bash
#!/bin/bash
echo "🔄 Actualizando aplicación..."

# Actualizar backend
cd /var/www/backend
git pull origin main
npm install
pm2 restart backend

# Actualizar frontend
cd /var/www/frontend
git pull origin main
npm install
npm run build

echo "✅ ¡Aplicación actualizada!"
```

```bash
chmod +x /home/rujo/actualizar-app.sh
```

## 🎯 URLs Finales

- **Aplicación**: http://31.97.193.114
- **API**: http://31.97.193.114/api
- **Health Check**: http://31.97.193.114/api/health

## 🆘 Solución de Problemas

### Si el backend no inicia
```bash
cd /var/www/backend
node server.js
# Ver errores directamente
```

### Si hay errores de permisos
```bash
sudo chown -R rujo:rujo /var/www/
sudo chown -R www-data:www-data /var/www/frontend/dist/
```

### Si Nginx no funciona
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

¡Tu aplicación debería estar funcionando perfectamente! 🚀