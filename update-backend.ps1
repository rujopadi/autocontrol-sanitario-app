# Script para actualizar el repositorio del backend
Write-Host "🚀 Actualizando repositorio del backend..." -ForegroundColor Green

# Cambiar al directorio del backend
Set-Location backend

# Verificar estado
Write-Host "📋 Estado actual del repositorio:" -ForegroundColor Yellow
git status

# Añadir todos los cambios
Write-Host "➕ Añadiendo cambios..." -ForegroundColor Yellow
git add .

# Hacer commit
Write-Host "💾 Haciendo commit..." -ForegroundColor Yellow
git commit -m "Fix CORS configuration and improve backend deployment

- Enhanced CORS middleware with proper preflight handling
- Added debugging endpoints (/health, /api/cors-test)  
- Improved error handling and logging
- Updated server.js with robust CORS configuration
- Added troubleshooting documentation"

# Hacer push
Write-Host "📤 Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ Backend actualizado correctamente!" -ForegroundColor Green
Write-Host "🔄 Ahora ve a Dokploy y redespliega la aplicación backend" -ForegroundColor Cyan

# Volver al directorio principal
Set-Location ..

Write-Host "📝 Próximos pasos:" -ForegroundColor Magenta
Write-Host "1. Ve a tu panel de Dokploy" -ForegroundColor White
Write-Host "2. Busca tu aplicación backend" -ForegroundColor White
Write-Host "3. Haz clic en Deploy o Rebuild" -ForegroundColor White
Write-Host "4. Espera a que termine el despliegue" -ForegroundColor White
Write-Host "5. Prueba la URL: http://autocontrolsanitarioapp-backend-5plj5f-f5ea1c-31-97-193-114.traefik.me/health" -ForegroundColor White