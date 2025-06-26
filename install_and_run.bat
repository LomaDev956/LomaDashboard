@echo off
TITLE Lanzador de LomaTools App
echo.
echo ============================================================================
echo  Lanzador de la aplicacion LomaTools
echo ============================================================================
echo.
echo  IMPORTANTE: Antes de ejecutar este script, asegurate de haber instalado
echo  las dependencias una vez. Para ello, abre una terminal (cmd o PowerShell)
echo  en esta carpeta y ejecuta el comando: npm install
echo.
echo  Este proceso solo se hace una vez (o si cambian las dependencias).
echo.
echo ============================================================================
echo.
echo Presiona una tecla para iniciar el servidor...
pause > nul

cls
echo Iniciando el servidor de desarrollo con 'npm run dev'...
echo Esta ventana permanecera abierta. Para detener el servidor, presiona CTRL+C aqui.
echo ----------------------------------------------------------------------------

REM Espera 5 segundos para dar tiempo al servidor a que empiece a arrancar.
timeout /t 5 /nobreak > nul

echo Abriendo http://localhost:3000 en tu navegador...
start "" "http://localhost:3000"

call npm run dev

echo.
echo El servidor se ha detenido.
echo Presiona una tecla para cerrar esta ventana...
pause > nul
