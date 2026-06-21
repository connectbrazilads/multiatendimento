@echo off
echo =======================================
echo Instalando dependencias e PyInstaller
echo =======================================
python -m pip install -r requirements.txt
python -m pip install pyinstaller

echo.
echo =======================================
echo Construindo o AgenteCRM.exe ...
echo =======================================
python build_exe.py

echo.
pause
