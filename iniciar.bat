@echo off
title Asistente Adaptado con IA
cd /d "%~dp0"
if exist "AsistenteIA.exe" (
    start "" "AsistenteIA.exe"
) else (
    echo Compilando aplicacion...
    call npm.cmd run build
    start "" "AsistenteIA.exe"
)
exit
