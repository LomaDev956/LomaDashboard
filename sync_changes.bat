@echo off
setlocal

echo.
echo ========================================================
echo   SINCRONIZANDO CAMBIOS DESDE GITHUB (git pull)
echo ========================================================
echo.

git pull

if %errorlevel% neq 0 (
    echo.
    echo ERROR: 'git pull' fallo. Revisa los mensajes de error.
    pause
    goto :eof
)

echo.
echo ========================================================
echo   PROCESO DE SINCRONIZACION COMPLETADO EXITOSAMENTE
echo ========================================================
echo.
pause
endlocal
