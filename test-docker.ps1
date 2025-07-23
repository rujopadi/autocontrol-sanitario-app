# Script de PowerShell para probar la aplicación con Docker

Write-Host "🚀 Probando aplicación con Docker..." -ForegroundColor Green

# Verificar si Docker está corriendo
try {
    docker version | Out-Null
    Write-Host "✅ Docker está disponible" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está disponible. Instala Docker Desktop primero." -ForegroundColor Red
    exit 1
}

# Limpiar contenedores anteriores si existen
Write-Host "🧹 Limpiando contenedores anteriores..." -ForegroundColor Yellow
docker stop autocontrol-test 2>$null
docker rm autocontrol-test 2>$null
docker rmi autocontrol-test 2>$null

# Construir la imagen
Write-Host "🔨 Construyendo imagen Docker..." -ForegroundColor Blue
docker build -t autocontrol-test .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Imagen construida exitosamente!" -ForegroundColor Green
    
    # Ejecutar el contenedor
    Write-Host "🚀 Iniciando contenedor..." -ForegroundColor Blue
    docker run -d -p 8080:80 --name autocontrol-test autocontrol-test
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Contenedor iniciado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Aplicación disponible en: http://localhost:8080" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para detener el contenedor ejecuta:" -ForegroundColor Yellow
        Write-Host "docker stop autocontrol-test" -ForegroundColor White
        Write-Host "docker rm autocontrol-test" -ForegroundColor White
        Write-Host ""
        Write-Host "Para ver los logs:" -ForegroundColor Yellow
        Write-Host "docker logs autocontrol-test" -ForegroundColor White
    } else {
        Write-Host "❌ Error al iniciar el contenedor" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Error al construir la imagen Docker" -ForegroundColor Red
    exit 1
}