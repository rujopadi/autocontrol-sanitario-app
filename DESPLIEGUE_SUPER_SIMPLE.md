# ⚡ Despliegue Super Simple - VPS Hostinger

## 🎯 La Opción Más Fácil

Esta es la forma **MÁS SIMPLE** de desplegar tu aplicación:
- Frontend como archivos estáticos
- Backend con Node.js directo
- Sin Docker, sin Dokploy, sin complicaciones

## 📋 Pasos Ultra Simples

### 1. 📤 Subir Archivos por FTP/SFTP

#### Opción A: Usar FileZilla o WinSCP
1. Conecta a tu VPS por SFTP
2. Sube la carpeta `backend` a `/var/www/backend`
3. Sube la carpeta completa del frontend a `/var/www/frontend`

#### Opción B: Usar SSH y Git (Recomendado)
```bash
# Conectar por SSH
ssh root@tu-vps-ip

# Ir al directorio web
cd /var/www

# Clonar repositorios
git clone https://github.com/rujopadi/autocontrol-sanitario-backend.git backend
git clone https://github.com/rujopadi/autocontrol-sanitario-app.git frontend
```

### 2. 🔧 Configurar Backend

```bash
# Ir al directorio backend
cd /var/www/backend

# Instalar dependencias
npm install

# Crear archivo de configuración
nano .env
```

Contenido del `.env`:
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/autocontrol
JWT_SECRET=mi_super_secreto_jwt_2024_autocontrol_sanitario_pro_123456789
```

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar backend
pm2 start server.js --name backend

# Configurar auto-inicio
pm2 startup
pm2 save
```

### 3. 🎨 Configurar Frontend

```bash
# Ir al directorio frontend
cd /var/www/frontend

# Crear archivo de configuración
nano .env
```

Contenido:
```env
VITE_API_URL=http://tu-vps-ip:5000
```

```bash
# Instalar dependencias y hacer build
npm install
npm run build

# Los archivos estáticos estarán en /var/www/frontend/dist
```

### 4. 🌐 Configurar Nginx (Super Simple)

```bash
# Editar configuración de Nginx
nano /etc/nginx/sites-available/default
```

Reemplazar todo el contenido con:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/frontend/dist;
    index index.html;
    
    server_name _;
    
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
    }
}
```

```bash
# Probar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

### 5. 🗄️ MongoDB Atlas (Gratuito)

1. Ve a [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crea cuenta gratuita
3. Crea cluster gratuito (512MB - suficiente para desarrollo)
4. Crea usuario de base de datos
5. Obtén connection string
6. Actualiza el `.env` del backend con la URL

## 🧪 Probar Todo

### Verificar Backend
```bash
curl http://localhost:5000/health
```

### Verificar Frontend
```bash
curl http://tu-vps-ip
```

### Probar en Navegador
1. Ve a `http://tu-vps-ip`
2. Intenta registrarte
3. ¡Debería funcionar perfectamente!

## 🔄 Script de Actualización Simple

```bash
# Crear script de actualización
nano /root/actualizar.sh
```

Contenido:
```bash
#!/bin/bash
echo "🔄 Actualizando aplicación..."

# Actualizar backend
cd /var/www/backend
git pull
npm install
pm2 restart backend

# Actualizar frontend
cd /var/www/frontend
git pull
npm install
npm run build

echo "✅ ¡Aplicación actualizada!"
```

```bash
# Hacer ejecutable
chmod +x /root/actualizar.sh

# Para actualizar en el futuro, solo ejecuta:
# ./actualizar.sh
```

## 📊 Comandos Útiles

### Ver logs del backend
```bash
pm2 logs backend
```

### Reiniciar backend
```bash
pm2 restart backend
```

### Ver estado
```bash
pm2 status
```

### Logs de Nginx
```bash
tail -f /var/log/nginx/access.log
```

## ✅ Ventajas de Este Método

1. **Ultra Simple**: Solo archivos y comandos básicos
2. **Sin Docker**: No necesitas entender contenedores
3. **Sin Dokploy**: Evitas problemas de configuración compleja
4. **Rápido**: Despliegue en 15-20 minutos
5. **Confiable**: Menos cosas que pueden fallar
6. **Fácil mantenimiento**: Scripts simples de actualización

## 🎯 Resultado

- **Tu aplicación funcionando en**: `http://tu-vps-ip`
- **API funcionando en**: `http://tu-vps-ip/api`
- **Sin errores CORS**
- **Registro y login funcionando**
- **Base de datos en la nube (gratis)**

## 🆘 Si Algo Sale Mal

### Backend no inicia
```bash
cd /var/www/backend
npm start
# Ver errores directamente
```

### Frontend no carga
```bash
# Verificar que los archivos estén en dist/
ls -la /var/www/frontend/dist/
```

### Error de permisos
```bash
chown -R www-data:www-data /var/www/
```

¿Te parece esta opción? Es la **MÁS SIMPLE** posible y deberías tener tu aplicación funcionando en menos de 30 minutos.