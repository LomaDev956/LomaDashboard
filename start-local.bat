@echo off
REM Script para instalar dependencias y ejecutar la aplicacion LOMA Tools localmente.

echo.
echo ===========================================
echo  INSTALANDO DEPENDENCIAS DE LOMA TOOLS...
echo ===========================================
echo.

npm install

REM Verifica si la instalacion de dependencias fue exitosa
if %errorlevel% neq 0 (
    echo.
    echo ----------------------------------------------------
    echo  ERROR: La instalacion de dependencias fallo.
    echo  Por favor, verifica que Node.js y npm estan instalados y en el PATH.
    echo ----------------------------------------------------
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ===========================================
echo   INICIANDO SERVIDOR DE DESARROLLO...
echo ===========================================
echo.
echo La aplicacion se abrira en http://localhost:3000
echo.

npm run dev
