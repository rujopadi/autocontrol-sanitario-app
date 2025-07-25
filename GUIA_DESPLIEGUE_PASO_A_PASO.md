# 🚀 Guía de Despliegue Paso a Paso - VPS Hostinger

## 📋 Información que Necesito

Antes de empezar, necesito que me proporciones:

1. **IP de tu VPS Hostinger**: `_____._____._____.____`
2. **Usuario SSH**: (¿root o otro usuario?)
3. **¿Tienes un dominio?**: (opcional, podemos usar solo la IP)

## 🛠️ Paso 1: Conectar al VPS

Abre tu terminal/PowerShell y conecta:

```bash
ssh root@TU-VPS-IP
# O si tienes otro usuario:
# ssh tu-usuario@TU-VPS-IP
```

**¿Puedes conectarte sin problemas?** ✅ / ❌

## 🔧 Paso 2: Verificar/Instalar Dependencias

Una vez conectado al VPS, ejecuta estos comandos:

### Verificar Node.js
```bash
node --version
npm --version
```

**Si no tienes Node.js instalado:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

### Instalar PM2
```bash
npm install -g pm2
```

### Verificar/Instalar Nginx
```bash
nginx -v
```

**Si no tienes Nginx:**
```bash
apt update
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

## 📥 Paso 3: Descargar el Código

```bash
# Ir al directorio web
cd /var/www

# Clonar repositorio backend
git clone https://github.com/rujopadi/autocontrol-sanitario-backend.git backend

# Clonar repositorio frontend
git clone https://github.com/rujopadi/autocontrol-sanitario-app.git frontend
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

**Nota**: Necesitaremos configurar MongoDB Atlas (te ayudo después)

```bash
# Iniciar backend con PM2
pm2 start server.js --name backend

# Configurar auto-inicio
pm2 startup
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
VITE_API_URL=http://TU-VPS-IP:5000
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
nano /etc/nginx/sites-available/default
```

**Reemplazar TODO el contenido con:**
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
        
        # Headers CORS adicionales
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token";
    }
}
```

```bash
# Probar configuración
nginx -t

# Si todo está bien, reiniciar Nginx
systemctl restart nginx
```

## 🗄️ Paso 7: Configurar MongoDB Atlas

1. Ve a [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crea cuenta gratuita
3. Crea cluster gratuito (M0 Sandbox - 512MB)
4. Crea usuario de base de datos
5. Obtén connection string
6. Actualiza el archivo `.env` del backend

## 🧪 Paso 8: Probar Todo

### Probar Backend
```bash
curl http://localhost:5000/health
```

### Probar Frontend
```bash
curl http://TU-VPS-IP
```

### Probar en Navegador
1. Ve a `http://TU-VPS-IP`
2. Intenta registrarte
3. ¡Debería funcionar!

## 📊 Comandos Útiles

### Ver logs del backend
```bash
pm2 logs backend
```

### Reiniciar backend
```bash
pm2 restart backend
```

### Ver estado de servicios
```bash
pm2 status
systemctl status nginx
```

## 🆘 Solución de Problemas

### Si el backend no inicia
```bash
cd /var/www/backend
npm start
# Ver errores directamente
```

### Si hay errores de permisos
```bash
chown -R www-data:www-data /var/www/
```

### Si Nginx no funciona
```bash
systemctl status nginx
tail -f /var/log/nginx/error.log
```

---

## 🎯 ¿Listo para Empezar?

**Dime:**
1. ¿Cuál es la IP de tu VPS?
2. ¿Puedes conectarte por SSH?
3. ¿Prefieres que vayamos paso a paso o quieres intentar todo de una vez?

¡Vamos a hacer que tu aplicación funcione! 🚀