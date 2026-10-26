@echo off
chcp 65001 >nul
title Secretaria 5 Ronfe - projetor
cd /d "%~dp0"

if exist ".env.local" goto temenv
if not exist "..\Agrupamento_APP_Geral\.env.local" goto semenv
findstr /B /C:"NEXT_PUBLIC_SUPABASE_URL=" /C:"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" "..\Agrupamento_APP_Geral\.env.local" > ".env.local"
echo Ficheiro .env.local criado a partir da app do agrupamento.
goto temenv

:semenv
echo Nao encontrei ..\Agrupamento_APP_Geral\.env.local
echo Copia o .env.local da app do agrupamento para esta pasta, com o nome .env.local, e volta a correr.
pause
exit /b 1

:temenv
if exist "node_modules" goto arrancar
echo A instalar dependencias. Na primeira vez demora alguns minutos.
call npm install
if errorlevel 1 goto falhou
goto arrancar

:falhou
echo Falhou a instalacao. Confirma que o Node.js LTS esta instalado.
pause
exit /b 1

:arrancar
start "" http://localhost:3000
echo A app esta em http://localhost:3000. Para parar, fecha esta janela.
call npm run dev
pause
