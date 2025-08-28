@echo off
echo 🚀 Subiendo AutoControl Pro a GitHub...

REM Crear .gitignore
echo node_modules/ > .gitignore
echo .env >> .gitignore
echo .env.local >> .gitignore
echo .env.production >> .gitignore
echo dist/ >> .gitignore
echo build/ >> .gitignore
echo logs/ >> .gitignore
echo *.log >> .gitignore

REM Inicializar Git
git init

REM Añadir archivos
git add .

REM Commit inicial
git commit -m "🚀 Initial commit - AutoControl Pro SaaS ready for production"

echo.
echo ✅ Archivos preparados!
echo.
echo 📝 Ahora ejecuta estos comandos (cambia TU-USUARIO por tu usuario de GitHub):
echo.
echo git remote add origin https://github.com/TU-USUARIO/autocontrol-pro.git
echo git push -u origin main
echo.
pause