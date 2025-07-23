# Script para corregir el despliegue del backend
Write-Host "Corrigiendo configuracion del backend..." -ForegroundColor Green

# Cambiar al directorio del backend
Set-Location backend

# Verificar estado
Write-Host "Estado del repositorio:" -ForegroundColor Yellow
git status

# Añadir cambios
Write-Host "Añadiendo cambios..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "Haciendo commit..." -ForegroundColor Yellow
git commit -m "Fix backend deployment configuration

- Changed expose to ports in docker-compose.yml
- Simplified Dockerfile removing user restrictions
- Added healthcheck to docker-compose
- Added robust startup script with environment logging
- Updated package.json with new start script"

# Push
Write-Host "Subiendo cambios..." -ForegroundColor Yellow
git push origin main

Write-Host "Cambios subidos correctamente!" -ForegroundColor Green

# Volver al directorio principal
Set-Location ..

Write-Host "PASOS CRITICOS PARA DOKPLOY:" -ForegroundColor Red
Write-Host "1. Ve a Dokploy y ELIMINA la aplicacion backend actual" -ForegroundColor White
Write-Host "2. Crea una NUEVA aplicacion backend desde cero" -ForegroundColor White
Write-Host "3. Usa Docker Compose (no solo Dockerfile)" -ForegroundColor White
Write-Host "4. Configura estas variables de entorno:" -ForegroundColor White
Write-Host "   NODE_ENV=production" -ForegroundColor Cyan
Write-Host "   PORT=5000" -ForegroundColor Cyan
Write-Host "   MONGO_URI=mongodb://mongodb:27017/autocontrol-sanitario" -ForegroundColor Cyan
Write-Host "   JWT_SECRET=tu_jwt_secret_muy_seguro" -ForegroundColor Cyan
Write-Host "5. Despliega y revisa los logs del contenedor" -ForegroundColor White