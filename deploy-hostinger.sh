#!/bin/bash

echo "🚀 Desplegando AutoControl Pro en Hostinger VPS..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
show_message() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si estamos en root
if [ "$EUID" -ne 0 ]; then
    show_error "Por favor ejecuta como root: sudo bash deploy-hostinger.sh"
    exit 1
fi

show_message "Paso 1: Actualizando sistema..."
apt update && apt upgrade -y

show_message "Paso 2: Instalando Node.js, Nginx, Git..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs nginx git

show_message "Paso 3: Instalando PM2..."
npm install -g pm2

show_message "Paso 4: Configurando directorio de aplicación..."
cd /var/www
rm -rf app 2>/dev/null

# Solicitar URL del repositorio
echo -e "${YELLOW}📝 Ingresa la URL de tu repositorio GitHub:${NC}"
read -p "URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    show_error "URL del repositorio es requerida"
    exit 1
fi

show_message "Paso 5: Clonando repositorio..."
git clone "$REPO_URL" app
cd app

show_message "Paso 6: Configurando backend..."
cd backend
npm install

# Solicitar datos de MongoDB
echo -e "${YELLOW}📝 Configuración de base de datos:${NC}"
echo "Puedes usar MongoDB Atlas (gratis) o tu propia instancia"
read -p "MongoDB URI: " MONGO_URI

if [ -z "$MONGO_URI" ]; then
    MONGO_URI="mongodb://localhost:27017/autocontrol"
    show_warning "Usando MongoDB local por defecto"
fi

# Obtener IP del servidor
SERVER_IP=$(curl -s ifconfig.me)
show_message "IP del servidor detectada: $SERVER_IP"

# Crear archivo .env
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGO_URI=$MONGO_URI
JWT_SECRET=autocontrol_pro_jwt_secret_2024_hostinger_production_secure_key_$(date +%s)
CORS_ORIGIN=http://$SERVER_IP
EOF

show_message "Paso 7: Iniciando backend con PM2..."
pm2 delete autocontrol-backend 2>/dev/null
pm2 start server.js --name autocontrol-backend
pm2 startup
pm2 save

show_message "Paso 8: Configurando frontend..."
cd /var/www/app

# Crear .env para frontend
cat > .env << EOF
VITE_API_URL=http://$SERVER_IP:5000
EOF

npm install
npm run build

show_message "Paso 9: Configurando Nginx..."
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
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Probar configuración de Nginx
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    show_message "Nginx configurado correctamente"
else
    show_error "Error en configuración de Nginx"
    exit 1
fi

show_message "Paso 10: Configurando firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

show_message "Paso 11: Verificando instalación..."
sleep 3

# Verificar backend
if curl -s http://localhost:5000/health > /dev/null; then
    show_message "Backend funcionando correctamente"
else
    show_warning "Backend podría tener problemas, verifica logs: pm2 logs autocontrol-backend"
fi

# Verificar frontend
if [ -f "/var/www/app/dist/index.html" ]; then
    show_message "Frontend construido correctamente"
else
    show_warning "Frontend podría tener problemas"
fi

echo ""
echo "🎉 ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "📱 Tu aplicación está disponible en:"
echo "   Frontend: http://$SERVER_IP"
echo "   API: http://$SERVER_IP/api"
echo ""
echo "🔧 Comandos útiles:"
echo "   Ver logs: pm2 logs autocontrol-backend"
echo "   Reiniciar: pm2 restart autocontrol-backend"
echo "   Estado: pm2 status"
echo ""
echo "📝 Para actualizar en el futuro:"
echo "   cd /var/www/app && git pull"
echo "   cd backend && npm install && pm2 restart autocontrol-backend"
echo "   cd .. && npm install && npm run build"
echo ""

# Crear script de actualización
cat > /root/actualizar-autocontrol.sh << 'EOF'
#!/bin/bash
echo "🔄 Actualizando AutoControl Pro..."
cd /var/www/app
git pull
cd backend
npm install
pm2 restart autocontrol-backend
cd ..
npm install
npm run build
echo "✅ ¡Actualización completada!"
EOF

chmod +x /root/actualizar-autocontrol.sh
show_message "Script de actualización creado en /root/actualizar-autocontrol.sh"

echo ""
show_message "¡Todo listo! Abre tu navegador y ve a http://$SERVER_IP"