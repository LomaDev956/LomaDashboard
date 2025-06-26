@echo off
echo ========================================================
echo   SINCRONIZANDO CAMBIOS DESDE GITHUB (git pull)
echo ========================================================
echo.

echo Intentando sincronizar con 'origin/main'...
git pull origin main

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: 'git pull' fallo. Revisa los mensajes de error.
    echo Asegurate de tener conexion a internet y que el repositorio exista en GitHub.
) ELSE (
    echo.
    echo Sincronizacion completada. Tu PC esta al dia.
    echo.
    echo Configurando branch de seguimiento para futuros 'pulls'...
    git branch --set-upstream-to=origin/main main
)

echo.
pause
