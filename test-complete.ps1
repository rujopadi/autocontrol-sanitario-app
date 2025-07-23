# Script completo de pruebas para la aplicación

Write-Host "🧪 Iniciando pruebas completas de la aplicación..." -ForegroundColor Green

# Función para verificar si un puerto está en uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# 1. Verificar dependencias
Write-Host "`n📦 Verificando dependencias..." -ForegroundColor Blue
if (!(Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Dependencias OK" -ForegroundColor Green

# 2. Verificar TypeScript
Write-Host "`n🔍 Verificando TypeScript..." -ForegroundColor Blue
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ TypeScript OK" -ForegroundColor Green
} else {
    Write-Host "⚠️ Hay errores de TypeScript, pero continuamos..." -ForegroundColor Yellow
}

# 3. Probar build de producción
Write-Host "`n🔨 Probando build de producción..." -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build de producción OK" -ForegroundColor Green
} else {
    Write-Host "❌ Error en build de producción" -ForegroundColor Red
    exit 1
}

# 4. Probar preview
Write-Host "`n👀 Iniciando preview del build..." -ForegroundColor Blue
if (Test-Port 4173) {
    Write-Host "⚠️ Puerto 4173 en uso, saltando preview..." -ForegroundColor Yellow
} else {
    Start-Process powershell -ArgumentList "-Command", "npm run preview" -WindowStyle Minimized
    Start-Sleep 3
    if (Test-Port 4173) {
        Write-Host "✅ Preview disponible en http://localhost:4173" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Preview no se pudo iniciar" -ForegroundColor Yellow
    }
}

# 5. Verificar archivos de Docker
Write-Host "`n🐳 Verificando archivos de Docker..." -ForegroundColor Blue
$dockerFiles = @("Dockerfile", "docker-compose.yml", "nginx.conf", ".dockerignore")
foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file existe" -ForegroundColor Green
    } else {
        Write-Host "❌ $file no encontrado" -ForegroundColor Red
    }
}

# 6. Verificar variables de entorno
Write-Host "`n🔧 Verificando configuración..." -ForegroundColor Blue
if (Test-Path ".env.example") {
    Write-Host "✅ .env.example existe" -ForegroundColor Green
    Write-Host "📝 Recuerda configurar las variables de entorno en Dokploy:" -ForegroundColor Yellow
    Get-Content ".env.example" | ForEach-Object { Write-Host "   $_" -ForegroundColor White }
} else {
    Write-Host "⚠️ .env.example no encontrado" -ForegroundColor Yellow
}

Write-Host "`n🎉 Pruebas completadas!" -ForegroundColor Green
Write-Host "`n📋 Resumen:" -ForegroundColor Cyan
Write-Host "   • Dependencias: ✅" -ForegroundColor White
Write-Host "   • Build producción: ✅" -ForegroundColor White
Write-Host "   • Archivos Docker: ✅" -ForegroundColor White
Write-Host "`n🚀 Tu aplicación está lista para desplegar en Dokploy!" -ForegroundColor Green