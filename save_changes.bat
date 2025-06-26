@echo off
setlocal

REM Pide al usuario que ingrese un mensaje para el commit.
set /p commit_message="Escribe un mensaje para describir tus cambios y presiona Enter: "

if "%commit_message%"=="" (
    echo.
    echo ERROR: Debes proporcionar un mensaje para el commit.
    echo.
    echo Proceso cancelado.
    pause
    goto :eof
)

echo.
echo ===========================================
echo   GUARDANDO CAMBIOS EN GITHUB
echo ===========================================
echo.

echo [1/3] Agregando todos los archivos (git add .)...
git add .
if %errorlevel% neq 0 (
    echo.
    echo ERROR: 'git add' fallo. Revisa los mensajes anteriores.
    pause
    goto :eof
)
echo      ... Hecho.

echo.
echo [2/3] Creando el commit (git commit)...
git commit -m "%commit_message%"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: 'git commit' fallo. Revisa los mensajes anteriores.
    echo         (Es posible que no haya cambios que guardar).
    pause
    goto :eof
)
echo      ... Hecho.

echo.
echo [3/3] Subiendo los cambios a GitHub (git push)...
git push
if %errorlevel% neq 0 (
    echo.
    echo ERROR: 'git push' fallo. Revisa los mensajes de error.
    pause
    goto :eof
)
echo      ... Hecho.

echo.
echo ===============================================
echo   PROCESO DE GUARDADO COMPLETADO EXITOSAMENTE
echo ===============================================
echo.
pause
endlocal
