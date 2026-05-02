@echo off
setlocal enabledelayedexpansion
echo.
echo ========================================
echo   Sistema Multiatendimento - Dev Setup
echo ========================================
echo.

cd /d "%~dp0"

set "NGROK_EXE=C:\Users\diego\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"

:: ── 1. Dependencias backend ──────────────────────────────────────
echo [1/5] Instalando dependencias do backend...
cd backend
call npm install --silent
if %errorlevel% neq 0 ( echo ERRO no npm install do backend & pause & exit /b 1 )
echo       OK

:: ── 2. Banco de dados ────────────────────────────────────────────
echo [2/5] Criando/atualizando tabelas no banco...
call npx prisma db push --skip-generate
if %errorlevel% neq 0 ( echo ERRO no prisma db push & pause & exit /b 1 )
echo       OK

:: ── 3. Seed inicial ──────────────────────────────────────────────
echo [3/5] Criando usuario admin (se nao existir)...
call node scripts/seed.js 2>nul
echo       OK

:: ── 4. Dependencias frontend ─────────────────────────────────────
echo [4/5] Instalando dependencias do frontend...
cd ..\frontend
call npm install --silent
if %errorlevel% neq 0 ( echo ERRO no npm install do frontend & pause & exit /b 1 )
echo       OK
cd ..

:: ── 5. Ngrok ─────────────────────────────────────────────────────
echo [5/5] Iniciando tunel ngrok na porta 3002...

if not exist "%NGROK_EXE%" (
    echo  [!] ngrok.exe nao encontrado em:
    echo      %NGROK_EXE%
    echo  Continuando sem ngrok...
    goto :sem_ngrok
)

start /b "" "%NGROK_EXE%" http 3002 --log=stdout > "%TEMP%\ngrok_multi.log" 2>&1

echo       Aguardando ngrok inicializar...
timeout /t 5 /nobreak >nul

for /f "delims=" %%U in ('powershell -NoProfile -Command ^
  "try { $r = Invoke-RestMethod http://localhost:4040/api/tunnels; ($r.tunnels | Where-Object { $_.proto -eq 'https' }).public_url } catch { '' }"') do set "NGROK_URL=%%U"

if "!NGROK_URL!"=="" (
    echo  [!] Ngrok iniciou mas nao retornou URL ainda.
    echo      Acesse http://localhost:4040 para ver a URL manualmente.
    goto :sem_ngrok
)

echo       URL publica: !NGROK_URL!

powershell -NoProfile -Command ^
  "(Get-Content 'backend\.env') -replace 'PUBLIC_URL=.*', 'PUBLIC_URL=""!NGROK_URL!""' | Set-Content 'backend\.env'"

echo       .env atualizado com sucesso.
echo.
echo  *** Webhook URL para a Evolution API: ***
echo      !NGROK_URL!/api/webhook
echo.
goto :start_servers

:sem_ngrok
echo  Continuando SEM ngrok.
echo.

:start_servers
echo Iniciando servidores...
echo.
start cmd /k "title [BACKEND :3002] && cd /d "%~dp0backend" && npm run dev"
timeout /t 2 /nobreak >nul
start cmd /k "title [FRONTEND :5174] && cd /d "%~dp0frontend" && npm run dev"

echo ════════════════════════════════════════
echo   Frontend:  http://localhost:5174
echo   Backend:   http://localhost:3002
echo   ngrok UI:  http://localhost:4040
echo   Login:     admin@demo.com / admin123
if defined NGROK_URL (
echo   Webhook:   !NGROK_URL!/api/webhook
)
echo ════════════════════════════════════════
echo.
echo Pressione qualquer tecla para fechar esta janela.
echo Os servidores continuam rodando nos outros terminais.
pause >nul
