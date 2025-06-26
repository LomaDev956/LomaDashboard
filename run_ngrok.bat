@echo off
echo ==========================================================
echo  LomaTools - Iniciador de ngrok
echo ==========================================================
echo.
echo Este script expondra tu aplicacion local a Internet.
echo.
echo REQUISITOS:
echo 1. Debes tener ngrok instalado en tu PC.
echo    (Descargalo desde https://ngrok.com/download)
echo 2. Debes haber configurado tu "authtoken" de ngrok.
echo    (Ejecuta: ngrok config add-authtoken TU_TOKEN)
echo.
echo IMPORTANTE: La aplicacion principal debe estar ejecutandose
echo en otra ventana (usando install_and_run.bat).
echo.
pause
echo.
echo Iniciando ngrok para el puerto 3000...
echo.

call npm run ngrok

echo.
echo ngrok se ha detenido.
pause
