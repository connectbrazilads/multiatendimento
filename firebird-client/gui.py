import sys
import threading
import time
import os
from pathlib import Path
from dotenv import set_key, load_dotenv
import customtkinter as ctk
import pystray
from PIL import Image, ImageDraw

# Configure theme
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

if getattr(sys, "frozen", False):
    ROOT = Path(sys.executable).resolve().parent
else:
    ROOT = Path(__file__).resolve().parent

ENV_FILE = ROOT / ".env"

def create_tray_image():
    # Generate a simple icon for the tray
    image = Image.new('RGB', (64, 64), color = (0, 100, 200))
    d = ImageDraw.Draw(image)
    d.text((10, 20), "CRM", fill=(255, 255, 255))
    return image

class AgentGUI(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("LCD Digital - Agente Firebird CRM")
        self.geometry("800x650")
        self.minsize(800, 650)
        
        self.is_running = False
        self.agent_thread = None
        self.tray_icon = None
        
        self.create_widgets()
        self.load_settings()
        
        self.protocol("WM_DELETE_WINDOW", self.hide_window)
        
    def create_widgets(self):
        # Configurar layout principal
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        # Frame Principal
        self.main_frame = ctk.CTkFrame(self)
        self.main_frame.grid(row=0, column=0, padx=20, pady=20, sticky="nsew")
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_columnconfigure(1, weight=1)
        self.main_frame.grid_rowconfigure(1, weight=1)
        
        # Titulo
        self.title_label = ctk.CTkLabel(self.main_frame, text="Configurações do Agente", font=ctk.CTkFont(size=20, weight="bold"))
        self.title_label.grid(row=0, column=0, columnspan=2, padx=20, pady=(20, 10))
        
        # Left Panel (Settings)
        self.settings_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.settings_frame.grid(row=1, column=0, padx=20, pady=10, sticky="nsew")
        
        self.token_entry = self.create_input(self.settings_frame, "CRM Token (Autenticação)", 0)
        self.db_path_entry = self.create_input(self.settings_frame, "Caminho do Banco de Dados", 1)
        self.login_entry = self.create_input(self.settings_frame, "Login (Usuário Firebird)", 2)
        self.password_entry = self.create_input(self.settings_frame, "Senha (Firebird)", 3, show="*")
        self.billing_folder_entry = self.create_input(self.settings_frame, "Pasta de Boletos para WhatsApp", 4)
        
        # Politica de envio
        ctk.CTkLabel(self.settings_frame, text="Enviar boletos para:").grid(row=10, column=0, sticky="w", pady=(10, 0))
        self.policy_var = ctk.StringVar(value="Somente Marcados")
        self.policy_menu = ctk.CTkOptionMenu(self.settings_frame, variable=self.policy_var, values=["Somente Marcados", "Todos"])
        self.policy_menu.grid(row=11, column=0, sticky="ew", pady=(0, 10))
        
        # Intervalo de Sincronizacao
        self.interval_entry = self.create_input(self.settings_frame, "Intervalo de Sincronização (segundos)", 6)
        
        # Autostart checkbox
        self.autostart_var = ctk.BooleanVar(value=False)
        self.autostart_checkbox = ctk.CTkCheckBox(self.settings_frame, text="Iniciar com o Windows", variable=self.autostart_var)
        self.autostart_checkbox.grid(row=14, column=0, pady=(15, 0), sticky="w")
        
        self.save_btn = ctk.CTkButton(self.settings_frame, text="Salvar Configurações", command=self.save_settings)
        self.save_btn.grid(row=15, column=0, pady=20, sticky="ew")
        
        self.action_btn = ctk.CTkButton(self.settings_frame, text="▶ Iniciar Agente", command=self.toggle_agent, fg_color="green", hover_color="darkgreen")
        self.action_btn.grid(row=16, column=0, pady=0, sticky="ew")

        # Right Panel (Logs)
        self.logs_frame = ctk.CTkFrame(self.main_frame)
        self.logs_frame.grid(row=1, column=1, padx=20, pady=10, sticky="nsew")
        self.logs_frame.grid_columnconfigure(0, weight=1)
        self.logs_frame.grid_rowconfigure(1, weight=1)
        
        ctk.CTkLabel(self.logs_frame, text="Logs de Execução", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, pady=10)
        
        self.log_textbox = ctk.CTkTextbox(self.logs_frame, state="disabled")
        self.log_textbox.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")
        
    def create_input(self, parent, label_text, row, show=""):
        ctk.CTkLabel(parent, text=label_text).grid(row=row*2, column=0, sticky="w", pady=(10, 0))
        entry = ctk.CTkEntry(parent, show=show)
        entry.grid(row=row*2+1, column=0, sticky="ew", pady=(0, 10))
        return entry
        
    def load_settings(self):
        load_dotenv(ENV_FILE)
        self.token_entry.insert(0, os.getenv("CRM_SYNC_TOKEN", ""))
        self.db_path_entry.insert(0, os.getenv("FIREBIRD_DATABASE", ""))
        self.login_entry.insert(0, os.getenv("FIREBIRD_USER", "SYSDBA"))
        self.password_entry.insert(0, os.getenv("FIREBIRD_PASSWORD", ""))
        self.billing_folder_entry.insert(0, os.getenv("BILLING_FOLDER_PATH", ""))
        
        policy = os.getenv("BILLING_SEND_POLICY", "Somente Marcados")
        self.policy_var.set(policy)
        
        self.interval_entry.insert(0, os.getenv("SYNC_INTERVAL_SECONDS", "300"))
        
        autostart = os.getenv("AUTOSTART_WINDOWS", "False").lower() == "true"
        self.autostart_var.set(autostart)
        
    def save_settings(self):
        if not ENV_FILE.exists():
            ENV_FILE.touch()
            
        set_key(str(ENV_FILE), "CRM_SYNC_TOKEN", self.token_entry.get())
        set_key(str(ENV_FILE), "FIREBIRD_DATABASE", self.db_path_entry.get())
        set_key(str(ENV_FILE), "FIREBIRD_USER", self.login_entry.get())
        set_key(str(ENV_FILE), "FIREBIRD_PASSWORD", self.password_entry.get())
        set_key(str(ENV_FILE), "BILLING_FOLDER_PATH", self.billing_folder_entry.get())
        set_key(str(ENV_FILE), "BILLING_SEND_POLICY", self.policy_var.get())
        set_key(str(ENV_FILE), "SYNC_INTERVAL_SECONDS", self.interval_entry.get())
        set_key(str(ENV_FILE), "AUTOSTART_WINDOWS", str(self.autostart_var.get()))
        
        self.set_startup(self.autostart_var.get())
        
        self.log_message("Configurações salvas com sucesso.")
        
    def set_startup(self, enable: bool):
        startup_path = os.path.join(os.environ["APPDATA"], r"Microsoft\Windows\Start Menu\Programs\Startup")
        bat_path = os.path.join(startup_path, "AgenteCRM.bat")
        if enable:
            exe_path = os.path.abspath(sys.executable) if getattr(sys, 'frozen', False) else os.path.abspath(__file__)
            try:
                with open(bat_path, "w") as f:
                    f.write(f'@echo off\nstart "" "{exe_path}" --minimized\n')
            except Exception as e:
                self.log_message(f"Erro ao configurar inicialização: {e}")
        else:
            if os.path.exists(bat_path):
                try:
                    os.remove(bat_path)
                except Exception:
                    pass

    def hide_window(self):
        self.withdraw()
        image = create_tray_image()
        menu = pystray.Menu(
            pystray.MenuItem("Mostrar Agente", self.show_window),
            pystray.MenuItem("Sair", self.quit_window)
        )
        self.tray_icon = pystray.Icon("AgenteCRM", image, "Agente Firebird CRM", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def show_window(self, icon, item):
        icon.stop()
        self.after(0, self.deiconify)

    def quit_window(self, icon, item):
        icon.stop()
        self.is_running = False
        self.after(0, self.destroy)

    def log_message(self, message):
        self.log_textbox.configure(state="normal")
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        self.log_textbox.insert("end", f"[{timestamp}] {message}\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")
        
    def toggle_agent(self):
        if not self.is_running:
            self.save_settings()
            self.is_running = True
            self.action_btn.configure(text="■ Parar Agente", fg_color="red", hover_color="darkred")
            self.log_message("Agente Iniciado.")
            self.agent_thread = threading.Thread(target=self.run_agent_loop, daemon=True)
            self.agent_thread.start()
        else:
            self.is_running = False
            self.action_btn.configure(text="▶ Iniciar Agente", fg_color="green", hover_color="darkgreen")
            self.log_message("Sinal de parada enviado. O agente vai parar em breve.")
            
    def run_agent_loop(self):
        import main as agent_main
        import logging
        from io import StringIO
        
        class TextBoxLogHandler(logging.Handler):
            def __init__(self, gui):
                super().__init__()
                self.gui = gui
                self.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))
                
            def emit(self, record):
                msg = self.format(record)
                self.gui.after(0, self.gui.log_message_raw, msg)
                
        # Setup logging redirect
        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
        gui_handler = TextBoxLogHandler(self)
        logger.addHandler(gui_handler)
        
        try:
            config = agent_main.AppConfig.from_env()
            state = agent_main.StateStore(config.state_file)
            
            while self.is_running:
                try:
                    self.log_message_raw("Iniciando ciclo de sincronização...")
                    agent_main.run_cycle(config, state)
                except Exception as e:
                    logging.exception(f"Erro no ciclo de sincronização: {e}")
                    
                # Sleep interval loop (check is_running constantly to abort early)
                sleep_time = max(30, config.sync_interval_seconds)
                for _ in range(sleep_time):
                    if not self.is_running:
                        break
                    time.sleep(1)
                    
        except Exception as e:
            logging.exception("Agente encontrou um erro fatal.")
        finally:
            self.log_message_raw("Agente parado.")
            self.is_running = False
            self.after(0, lambda: self.action_btn.configure(text="▶ Iniciar Agente", fg_color="green", hover_color="darkgreen"))
            logger.removeHandler(gui_handler)
            
    def log_message_raw(self, msg):
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert("end", f"{msg}\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")

if __name__ == "__main__":
    app = AgentGUI()
    if "--minimized" in sys.argv:
        app.hide_window()
        app.toggle_agent() # Start the agent automatically if launched minimized via autostart
    app.mainloop()
