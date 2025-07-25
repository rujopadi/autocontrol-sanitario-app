# 🚀 Comandos Específicos para tu VPS - 31.97.193.114

## 🔐 Paso 1: Conectar al VPS

```bash
ssh rujo@31.97.193.114
```

**¿Puedes conectarte?** Prueba este comando primero.

## 🛠️ Paso 2: Verificar/Instalar Dependencias

Una vez conectado, ejecuta estos comandos:

### Verificar Node.js
```bash
node --version
npm --version
```

### Si no tienes Node.js, instalar:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Instalar PM2
```bash
sudo npm install -g pm2
```

### Verificar/Instalar Nginx
```bash
nginx -v
```

### Si no tienes Nginx:
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 📥 Paso 3: Descargar el Código

```bash
# Ir al directorio web (puede que necesites crear la carpeta)
sudo mkdir -p /var/www
cd /var/www

# Clonar repositorio backend
sudo git clone https://github.com/rujopadi/autocontrol-sanitario-backend.git backend

# Clonar repositorio frontend  
sudo git clone https://github.com/rujopadi/autocontrol-sanitario-app.git frontend

# Cambiar permisos
sudo chown -R rujo:rujo /var/www/
```

## ⚙️ Paso 4: Configurar Backend

```bash
# Ir al directorio backend
cd /var/www/backend

# Instalar dependencias
npm install

# Crear archivo de configuración
nano .env
```

**Contenido del archivo .env:**
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/autocontrol
JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789
```

```bash
# Iniciar backend con PM2
pm2 start server.js --name backend

# Configurar auto-inicio
pm2 startup
# Ejecuta el comando que te muestre PM2

pm2 save

# Verificar que esté corriendo
pm2 status
```

## 🎨 Paso 5: Configurar Frontend

```bash
# Ir al directorio frontend
cd /var/www/frontend

# Crear archivo de configuración
nano .env
```

**Contenido del .env:**
```env
VITE_API_URL=http://31.97.193.114:5000
```

```bash
# Instalar dependencias
npm install

# Hacer build
npm run build
```

## 🌐 Paso 6: Configurar Nginx

```bash
# Editar configuración de Nginx
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
    
    # Servir archivos estáticos del frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy para el backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
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
}
```

```bash
# Probar configuración
sudo nginx -t

# Si todo está bien, reiniciar Nginx
sudo systemctl restart nginx
```

## 🧪 Paso 7: Probar Todo

### Probar Backend
```bash
curl http://localhost:5000/health
```

### Probar Frontend
```bash
curl http://31.97.193.114
```

### Probar en Navegador
Ve a: **http://31.97.193.114**

## 📊 Comandos de Monitoreo

### Ver logs del backend
```bash
pm2 logs backend
```

### Ver estado
```bash
pm2 status
```

### Reiniciar backend
```bash
pm2 restart backend
```

### Ver logs de Nginx
```bash
sudo tail -f /var/log/nginx/error.log
```

## 🆘 Solución de Problemas

### Si hay errores de permisos
```bash
sudo chown -R rujo:rujo /var/www/
sudo chown -R www-data:www-data /var/www/frontend/dist/
```

### Si el backend no inicia
```bash
cd /var/www/backend
node server.js
# Ver errores directamente
```

---

## 🎯 ¡Empezamos!

**Primer comando a ejecutar:**
```bash
ssh rujo@31.97.193.114
```

¿Puedes conectarte? Una vez que estés dentro del VPS, seguimos con el resto de pasos.