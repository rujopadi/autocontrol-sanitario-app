# 🌐 Múltiples Apps Web en tu VPS

## ✅ **Sí, puedes alojar múltiples aplicaciones**

Tu VPS de Hostinger puede manejar varias aplicaciones web simultáneamente. Aquí te explico las opciones:

## 🏗️ **Métodos de Configuración**

### **1. Subdominios (Recomendado)**
```
app1.autocontrolapp.com  → Aplicación 1
app2.autocontrolapp.com  → Aplicación 2
crm.autocontrolapp.com   → Sistema CRM
blog.autocontrolapp.com  → Blog corporativo
```

### **2. Subdirectorios**
```
autocontrolapp.com/      → App principal
autocontrolapp.com/crm/  → Sistema CRM
autocontrolapp.com/blog/ → Blog
autocontrolapp.com/docs/ → Documentación
```

### **3. Puertos Diferentes**
```
autocontrolapp.com:80    → App principal
autocontrolapp.com:3000  → App secundaria
autocontrolapp.com:8080  → Panel admin
```

### **4. Dominios Completamente Diferentes**
```
autocontrolapp.com       → App principal
micrm.com               → Sistema CRM
miblog.es               → Blog personal
```

## 🛠️ **Configuración con Nginx**

### **Ejemplo: Múltiples Subdominios**

```nginx
# /etc/nginx/sites-available/multiple-apps

# App Principal - Autocontrol
server {
    listen 80;
    server_name autocontrolapp.com www.autocontrolapp.com;
    
    root /var/www/autocontrol/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# CRM Subdomain
server {
    listen 80;
    server_name crm.autocontrolapp.com;
    
    root /var/www/crm/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Blog Subdomain
server {
    listen 80;
    server_name blog.autocontrolapp.com;
    
    root /var/www/blog;
    index index.html index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$args;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
    }
}
```

## 📁 **Estructura de Directorios**

```
/var/www/
├── autocontrol/          # App principal
│   ├── dist/            # Frontend compilado
│   └── backend/         # Backend Node.js (puerto 5000)
├── crm/                 # Sistema CRM
│   ├── dist/            # Frontend CRM
│   └── backend/         # Backend CRM (puerto 5001)
├── blog/                # Blog WordPress/PHP
│   ├── index.php
│   └── wp-content/
└── docs/                # Documentación estática
    └── index.html
```

## 🚀 **Ejemplo Práctico: Añadir Segunda App**

### **1. Crear Nueva Aplicación**
```bash
# En el VPS
cd /var/www
mkdir mi-segunda-app
cd mi-segunda-app

# Clonar repositorio de la segunda app
git clone https://github.com/usuario/segunda-app.git .

# Si es React/Vue/Angular
npm install
npm run build

# Si es PHP
# Solo subir archivos PHP directamente
```

### **2. Configurar Backend (si tiene)**
```bash
# Crear backend en puerto diferente
cd /var/www/mi-segunda-app/backend
npm install

# Cambiar puerto en .env
echo "PORT=5001" >> .env

# Iniciar con PM2
pm2 start server.js --name segunda-app-backend
```

### **3. Configurar Nginx**
```bash
# Editar configuración
sudo nano /etc/nginx/sites-available/default

# Añadir nuevo server block para la segunda app
# (como en el ejemplo de arriba)

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### **4. Configurar DNS**
En tu panel de Hostinger, añadir registro A:
```
Tipo: A
Nombre: segunda-app
Valor: 31.97.193.114
```

## 💰 **Casos de Uso Comerciales**

### **Para tu Negocio Sibarilia:**
```
autocontrolapp.com       → App principal de autocontrol
crm.sibarilia.com        → Sistema CRM interno
facturacion.sibarilia.com → Sistema de facturación
blog.sibarilia.com       → Blog corporativo
docs.sibarilia.com       → Documentación de APIs
```

### **Para Clientes:**
```
cliente1.sibarilia.com   → App personalizada cliente 1
cliente2.sibarilia.com   → App personalizada cliente 2
demo.sibarilia.com       → Demo de la aplicación
```

## 📊 **Recursos del VPS**

### **Tu VPS Actual Puede Manejar:**
- ✅ **5-10 aplicaciones pequeñas** (React/Vue)
- ✅ **3-5 aplicaciones medianas** (con backend)
- ✅ **2-3 aplicaciones grandes** (con base de datos)
- ✅ **Múltiples sitios estáticos** (ilimitados prácticamente)

### **Monitoreo de Recursos:**
```bash
# Ver uso de CPU y memoria
htop

# Ver uso de disco
df -h

# Ver procesos de Node.js
pm2 status
```

## 🔧 **Script de Automatización**

```bash
# create-new-app.sh
#!/bin/bash
APP_NAME=$1
DOMAIN=$2
PORT=$3

echo "🚀 Creando nueva aplicación: $APP_NAME"

# Crear directorio
mkdir -p /var/www/$APP_NAME

# Configurar Nginx
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    root /var/www/$APP_NAME/dist;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Activar sitio
ln -s /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

# Reiniciar Nginx
nginx -t && systemctl restart nginx

echo "✅ Aplicación $APP_NAME configurada en $DOMAIN"
```

## 🎯 **Recomendaciones**

### **Para Empezar:**
1. **Usa subdominios** - Más profesional y fácil de gestionar
2. **Puertos diferentes** para cada backend (5000, 5001, 5002...)
3. **PM2** para gestionar múltiples procesos Node.js
4. **Nginx** como proxy reverso para todo

### **Para Escalar:**
1. **Monitorea recursos** regularmente
2. **Usa bases de datos separadas** para cada app
3. **Configura SSL** para todos los subdominios
4. **Backups automáticos** de cada aplicación

## 💡 **¿Qué Aplicación Quieres Añadir?**

¿Tienes en mente alguna segunda aplicación? Puedo ayudarte a configurarla:
- **CRM para Sibarilia**
- **Blog corporativo**
- **Panel de administración**
- **Landing page comercial**
- **Documentación de APIs**

¡Tu VPS tiene mucho potencial sin explotar! 🚀