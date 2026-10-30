@echo off
chcp 65001 > nul
title Subir Asistente IA a GitHub Pages
echo =====================================================================
echo   PUBLICAR ASISTENTE ADAPTADO IA EN GITHUB PAGES (PARA TELEFONO)
echo =====================================================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git no esta instalado en este ordenador.
    echo Descargalo gratis desde: https://git-scm.com/download/win
    pause
    exit /b 1
)

if not exist ".git" (
    echo [1/4] Inicializando repositorio Git local...
    git init
    git branch -M main
)

echo [2/4] Preparando archivos del proyecto (protegiendo tu archivo .env)...
git add .
git commit -m "Despliegue de Asistente Adaptado Multimodal con IA para GitHub Pages"

git remote get-url origin >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =====================================================================
    echo PASO UNICO: Crea un repositorio vacio en https://github.com/new
    echo y pega aqui su direccion URL (ejemplo: https://github.com/tu-usuario/asistente-ia.git)
    echo =====================================================================
    set /p REPO_URL="Pega la URL de tu repositorio de GitHub: "
    git remote add origin %REPO_URL%
)

echo.
echo [3/4] Subiendo codigo a GitHub (rama main)...
git branch -M main
git push -u origin main

echo.
echo =====================================================================
echo [4/4] ¡CODIGO SUBIDO A GITHUB!
echo.
echo Para activar el servidor web gratuito en GitHub Pages:
echo   1. Entra en tu repositorio en GitHub.com
echo   2. Ve a "Settings" (Ajustes arriba) -^> "Pages" (menu izquierdo)
echo   3. En "Build and deployment" ^> "Source", selecciona: "GitHub Actions"
echo   4. En 1 minuto tendras tu enlace HTTPS listo para abrir en el telefono:
echo      https://TU-USUARIO.github.io/NOMBRE-REPOSITORIO/
echo =====================================================================
pause
