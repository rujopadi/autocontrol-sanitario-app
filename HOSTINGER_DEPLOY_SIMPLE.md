# 🚀 Despliegue Hostinger VPS - Ultra Simple

## 📋 Pasos (15 minutos total)

### 1. Conectar a tu VPS (2 minutos)
```bash
# Conectar por SSH (usa tu IP y contraseña)
ssh root@tu-vps-ip
```

### 2. Instalar lo básico (3 minutos)
```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js, npm, nginx, git
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs nginx git

# Instalar PM2 (gestor de procesos)
npm install -g pm2
```

### 3. Subir tu aplicación (5 minutos)
```bash
# Ir al directorio web
cd /var/www

# Clonar tu repositorio (cambia por tu URL)
git clone https://github.com/tu-usuario/autocontrol-sanitario.git app
cd app

# Instalar dependencias del backend
cd backend
npm install

# Crear archivo de configuración
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/autocontrol
JWT_SECRET=autocontrol_pro_jwt_secret_2024_hostinger_production_secure_key_123456789
CORS_ORIGIN=http://tu-vps-ip
EOF

# Iniciar backend con PM2
pm2 start server.js --name autocontrol-backend
pm2 startup
pm2 save
```

### 4. Configurar frontend (3 minutos)
```bash
# Volver al directorio principal
cd /var/www/app

# Configurar frontend
cat > .env << EOF
VITE_API_URL=http://tu-vps-ip:5000
EOF

# Instalar dependencias y hacer build
npm install
npm run build

# Los archivos estáticos están ahora en dist/
```

### 5. Configurar Nginx (2 minutos)
```bash
# Crear configuración de Nginx
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/app/dist;
    index index.html;
    
    server_name _;
    
    # Servir archivos del frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API del backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Reiniciar Nginx
systemctl restart nginx
```

## ✅ ¡LISTO! Tu app está funcionando

- **Frontend**: http://tu-vps-ip
- **API**: http://tu-vps-ip/api
- **Backend logs**: `pm2 logs autocontrol-backend`

## 🗄️ Base de datos (MongoDB Atlas - GRATIS)

1. Ve a [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crea cuenta gratuita
3. Crea cluster gratuito (512MB)
4. Crea usuario de base de datos
5. Obtén connection string
6. Actualiza el .env:
```bash
nano /var/www/app/backend/.env
# Cambia MONGO_URI por tu connection string
pm2 restart autocontrol-backend
```

## 🔄 Para actualizar en el futuro
```bash
cd /var/www/app
git pull
cd backend && npm install && pm2 restart autocontrol-backend
cd .. && npm install && npm run build
```

## 🆘 Comandos útiles
```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs autocontrol-backend

# Reiniciar
pm2 restart autocontrol-backend

# Logs de Nginx
tail -f /var/log/nginx/error.log
```