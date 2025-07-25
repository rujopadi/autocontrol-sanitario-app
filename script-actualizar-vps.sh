#!/bin/bash
# Script para actualizar la aplicación en el VPS

echo "🔄 Actualizando aplicación en VPS..."

# Actualizar backend
echo "📦 Actualizando backend..."
cd /var/www/backend
git pull origin main
npm install
pm2 restart backend

# Actualizar frontend
echo "🎨 Actualizando frontend..."
cd /var/www/frontend
git pull origin main
npm install
npm run build

echo "✅ ¡Aplicación actualizada correctamente!"
echo "🌐 Disponible en: http://31.97.193.114"

# Mostrar estado
echo "📊 Estado de servicios:"
pm2 status
systemctl status nginx --no-pager -l