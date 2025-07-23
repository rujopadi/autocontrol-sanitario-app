# Script para actualizar el repositorio del backend
Write-Host "Actualizando repositorio del backend..." -ForegroundColor Green

# Cambiar al directorio del backend
Set-Location backend

# Verificar estado
Write-Host "Estado actual del repositorio:" -ForegroundColor Yellow
git status

# Añadir todos los cambios
Write-Host "Añadiendo cambios..." -ForegroundColor Yellow
git add .

# Hacer commit
Write-Host "Haciendo commit..." -ForegroundColor Yellow
git commit -m "Fix CORS configuration and improve backend deployment - Enhanced CORS middleware with proper preflight handling - Added debugging endpoints - Improved error handling and logging"

# Hacer push
Write-Host "Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "Backend actualizado correctamente!" -ForegroundColor Green
Write-Host "Ahora ve a Dokploy y redespliega la aplicacion backend" -ForegroundColor Cyan

# Volver al directorio principal
Set-Location ..

Write-Host "Proximos pasos:" -ForegroundColor Magenta
Write-Host "1. Ve a tu panel de Dokploy" -ForegroundColor White
Write-Host "2. Busca tu aplicacion backend" -ForegroundColor White
Write-Host "3. Haz clic en Deploy o Rebuild" -ForegroundColor White
Write-Host "4. Espera a que termine el despliegue" -ForegroundColor White
Write-Host "5. Prueba la URL del backend" -ForegroundColor White