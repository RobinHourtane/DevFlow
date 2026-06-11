@echo off
title DevFlow — Lancement
color 0A

echo.
echo  ====================================================
echo   DevFlow ^| Demarrage des serveurs
echo  ====================================================
echo.

REM Verifie que WAMP MariaDB (wampmariadb64) est actif sur le port 3307
sc query wampmariadb64 | findstr /I "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo  [!] WAMP MariaDB n'est pas actif.
    echo      Lance WAMP puis relance ce script.
    echo.
    pause
    exit /b 1
) else (
    echo  [OK] WAMP MariaDB actif ^(port 3307^)
)

echo.
echo  [1/2] Lancement du backend ^(port 5000^)...
start "DevFlow Backend" cmd /k "cd /d "C:\Documents\Cours Benamor\NVProjet_gestion\server" && node src/index.js"

timeout /t 2 /nobreak >nul

echo  [2/2] Lancement du frontend ^(port 5173^)...
start "DevFlow Frontend" cmd /k "cd /d "C:\Documents\Cours Benamor\NVProjet_gestion\client" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo  ====================================================
echo   DevFlow demarre !
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000/api/health
echo  ====================================================
echo.

timeout /t 4 /nobreak >nul
start http://localhost:5173

exit
