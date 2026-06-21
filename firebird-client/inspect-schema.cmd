@echo off
setlocal
cd /d "%~dp0"
if exist "FirebirdCRMClient.exe" (
  "FirebirdCRMClient.exe" --inspect-schema
  echo.
  echo Relatorio gerado em schema-report.json
) else (
  echo Executavel FirebirdCRMClient.exe nao encontrado. Use o pacote atualizado.
  exit /b 1
)
pause
