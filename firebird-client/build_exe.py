import os
import PyInstaller.__main__
import customtkinter

# Find where customtkinter is installed to include its assets (themes, etc)
customtkinter_folder = os.path.dirname(customtkinter.__file__)

PyInstaller.__main__.run([
    'gui.py',
    '--name=AgenteCRM',
    '--windowed',         # No console window
    '--onefile',          # Pack everything into a single .exe
    f'--add-data={customtkinter_folder};customtkinter/',
    '--clean'
])
print("\n[OK] Build concluído! O arquivo AgenteCRM.exe está na pasta 'dist'.")
