#!/bin/bash

# Script para probar el despliegue localmente antes de subir a Dokploy

echo "🚀 Iniciando despliegue local..."

# Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
rm -rf dist/
rm -rf node_modules/.vite/

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci

# Construir aplicación
echo "🔨 Construyendo aplicación..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build exitoso!"
    
    # Construir imagen Docker
    echo "🐳 Construyendo imagen Docker..."
    docker build -t autocontrol-pro-frontend .
    
    if [ $? -eq 0 ]; then
        echo "✅ Imagen Docker creada exitosamente!"
        
        # Ejecutar contenedor
        echo "🚀 Iniciando contenedor..."
        docker run -d -p 8080:80 --name autocontrol-test autocontrol-pro-frontend
        
        if [ $? -eq 0 ]; then
            echo "✅ Contenedor iniciado exitosamente!"
            echo "🌐 Aplicación disponible en: http://localhost:8080"
            echo ""
            echo "Para detener el contenedor:"
            echo "docker stop autocontrol-test"
            echo "docker rm autocontrol-test"
        else
            echo "❌ Error al iniciar el contenedor"
            exit 1
        fi
    else
        echo "❌ Error al construir la imagen Docker"
        exit 1
    fi
else
    echo "❌ Error en el build de la aplicación"
    exit 1
fi