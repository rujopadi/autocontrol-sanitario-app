# 🌐 Configurar Dominio con Hostinger VPS

## 📋 Información Actual
- **VPS IP**: 31.97.193.114
- **Aplicación funcionando en**: http://31.97.193.114
- **Dominio**: (necesito que me digas cuál es)
- **Proveedor**: Hostinger

## 🚀 Paso 1: Configurar DNS en Hostinger

### 1.1 Acceder al Panel de Hostinger
1. Ve a [hostinger.com](https://hostinger.com)
2. Inicia sesión en tu cuenta
3. Ve a **"Dominios"** en el panel principal

### 1.2 Configurar Registros DNS
1. Busca tu dominio y haz clic en **"Administrar"**
2. Ve a **"Zona DNS"** o **"DNS Zone"**
3. **Eliminar registros A existentes** (si los hay)
4. **Añadir nuevos registros A**:

```
Tipo: A
Nombre: @ (o vacío)
Valor: 31.97.193.114
TTL: 3600

Tipo: A  
Nombre: www
Valor: 31.97.193.114
TTL: 3600
```

### 1.3 Configuración Completa DNS
```
@ (root)     A     31.97.193.114
www          A     31.97.193.114
*            A     31.97.193.114  (opcional - wildcard)
```

## 🔧 Paso 2: Configurar Nginx en el VPS

### 2.1 Actualizar Configuración de Nginx
```bash
# Conectar al VPS
ssh root@31.97.193.114

# Editar configuración de Nginx
nano /etc/nginx/sites-available/default
```

### 2.2 Nueva Configuración Nginx
**Reemplaza el contenido con:**
```nginx
server {
    listen 80;
    listen [::]:80;
    
    # Cambiar por tu dominio real
    server_name tu-dominio.com www.tu-dominio.com;
    
    root /var/www/frontend/dist;
    index index.html;
    
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

### 2.3 Probar y Reiniciar Nginx
```bash
# Probar configuración
nginx -t

# Si todo está bien, reiniciar
systemctl restart nginx
```

## 🔄 Paso 3: Actualizar Frontend

### 3.1 Actualizar Variable de Entorno
```bash
cd /var/www/frontend
nano .env
```

**Cambiar por:**
```env
VITE_API_URL=https://tu-dominio.com
```

### 3.2 Recompilar Frontend
```bash
npm run build
```

## 🔒 Paso 4: Configurar SSL (HTTPS) - Opcional pero Recomendado

### 4.1 Instalar Certbot
```bash
sudo apt update
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 4.2 Obtener Certificado SSL
```bash
# Reemplaza tu-dominio.com por tu dominio real
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### 4.3 Configurar Renovación Automática
```bash
sudo crontab -e
```

**Añadir esta línea:**
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🧪 Paso 5: Probar Todo

### 5.1 Verificar DNS
```bash
# Desde tu PC local
nslookup tu-dominio.com
ping tu-dominio.com
```

### 5.2 Probar en Navegador
- **HTTP**: http://tu-dominio.com
- **HTTPS**: https://tu-dominio.com (si configuraste SSL)

## ⏱️ Tiempos de Propagación

- **DNS**: 5-30 minutos (puede tardar hasta 24 horas)
- **SSL**: Inmediato una vez configurado

## 🆘 Solución de Problemas

### Si el dominio no resuelve:
```bash
# Verificar DNS
dig tu-dominio.com
nslookup tu-dominio.com
```

### Si Nginx da error:
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Si SSL falla:
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## 🎯 Resultado Final

Después de completar estos pasos:
- ✅ **tu-dominio.com** → Tu aplicación
- ✅ **www.tu-dominio.com** → Tu aplicación  
- ✅ **HTTPS** (si configuraste SSL)
- ✅ **API funcionando** en tu-dominio.com/api
- ✅ **Sin errores CORS**

---

## 📞 ¿Cuál es tu dominio?

**Dime cuál es tu dominio para personalizar los comandos exactos que necesitas ejecutar.**