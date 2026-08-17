import json
import logging
import os
import sys
import threading
import time
from pathlib import Path
from tkinter import filedialog

import customtkinter as ctk
import pystray
from dotenv import load_dotenv, set_key
from PIL import Image, ImageDraw


ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

if getattr(sys, "frozen", False):
    ROOT = Path(sys.executable).resolve().parent
else:
    ROOT = Path(__file__).resolve().parent

ENV_FILE = ROOT / ".env"


def create_tray_image():
    image = Image.new("RGB", (64, 64), color=(17, 24, 39))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((5, 5, 59, 59), radius=12, fill=(222, 181, 49))
    draw.text((11, 22), "CRM", fill=(10, 14, 22))
    return image


class AgentGUI(ctk.CTk):
    def __init__(self):
        super().__init__()
        load_dotenv(ENV_FILE)

        self.title("LCD Digital - Agente iLux CRM")
        self.geometry(os.getenv("AGENT_WINDOW_GEOMETRY", "960x700"))
        self.minsize(620, 520)

        self.is_running = False
        self.agent_thread = None
        self.command_stop_event = None
        self.tray_icon = None

        self.create_widgets()
        self.load_settings()
        self.protocol("WM_DELETE_WINDOW", self.hide_window)

    def create_widgets(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, padx=18, pady=(16, 6), sticky="ew")
        header.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(
            header,
            text="Agente iLux CRM",
            font=ctk.CTkFont(size=22, weight="bold"),
        ).grid(row=0, column=0, sticky="w")
        self.status_label = ctk.CTkLabel(
            header,
            text="● Parado",
            text_color="#94a3b8",
            font=ctk.CTkFont(weight="bold"),
        )
        self.status_label.grid(row=0, column=1, sticky="e")

        self.tabs = ctk.CTkTabview(self, anchor="nw")
        self.tabs.grid(row=1, column=0, padx=14, pady=6, sticky="nsew")
        for name in ("Conexão", "Sincronização", "Documentos financeiros", "Logs"):
            self.tabs.add(name)
            self.tabs.tab(name).grid_columnconfigure(0, weight=1)
            self.tabs.tab(name).grid_rowconfigure(0, weight=1)

        self._create_connection_tab()
        self._create_sync_tab()
        self._create_documents_tab()
        self._create_logs_tab()

        footer = ctk.CTkFrame(self, fg_color="transparent")
        footer.grid(row=2, column=0, padx=18, pady=(6, 16), sticky="ew")
        footer.grid_columnconfigure(0, weight=1)
        footer.grid_columnconfigure(1, weight=1)
        self.save_btn = ctk.CTkButton(footer, text="Salvar configurações", command=self.save_settings)
        self.save_btn.grid(row=0, column=0, padx=(0, 6), sticky="ew")
        self.action_btn = ctk.CTkButton(
            footer,
            text="▶ Iniciar agente",
            command=self.toggle_agent,
            fg_color="#15803d",
            hover_color="#166534",
        )
        self.action_btn.grid(row=0, column=1, padx=(6, 0), sticky="ew")

    def _scrollable_tab(self, name):
        frame = ctk.CTkScrollableFrame(self.tabs.tab(name), fg_color="transparent")
        frame.grid(row=0, column=0, sticky="nsew")
        frame.grid_columnconfigure(0, weight=1)
        return frame

    def _section_title(self, parent, title, description, row):
        ctk.CTkLabel(parent, text=title, font=ctk.CTkFont(size=17, weight="bold")).grid(
            row=row, column=0, sticky="w", padx=10, pady=(14, 0)
        )
        ctk.CTkLabel(
            parent,
            text=description,
            text_color="#94a3b8",
            justify="left",
            wraplength=760,
        ).grid(row=row + 1, column=0, sticky="ew", padx=10, pady=(2, 10))

    def _input(self, parent, label, row, show="", placeholder=""):
        ctk.CTkLabel(parent, text=label).grid(row=row, column=0, sticky="w", padx=10, pady=(8, 2))
        entry = ctk.CTkEntry(parent, show=show, placeholder_text=placeholder)
        entry.grid(row=row + 1, column=0, sticky="ew", padx=10, pady=(0, 6))
        return entry

    def _create_connection_tab(self):
        frame = self._scrollable_tab("Conexão")
        self._section_title(
            frame,
            "Conexão com o iLux e o CRM",
            "Dados utilizados pelo agente para consultar o Firebird e sincronizar com esta empresa.",
            0,
        )
        self.token_entry = self._input(frame, "Token do CRM", 2, show="•")
        self.db_path_entry = self._input(frame, "Caminho do banco Firebird", 4)
        self.login_entry = self._input(frame, "Usuário Firebird", 6)
        self.password_entry = self._input(frame, "Senha Firebird", 8, show="•")

    def _create_sync_tab(self):
        frame = self._scrollable_tab("Sincronização")
        self._section_title(
            frame,
            "Sincronização e automações",
            "Controle a frequência do agente e preserve o fluxo existente de boletos enviados pelo iLux.",
            0,
        )
        self.interval_entry = self._input(frame, "Intervalo de sincronização (segundos)", 2)
        self.billing_folder_entry = self._input(frame, "Pasta atual de boletos para WhatsApp", 4)
        ctk.CTkLabel(frame, text="Enviar boletos para").grid(row=6, column=0, sticky="w", padx=10, pady=(8, 2))
        self.policy_var = ctk.StringVar(value="Somente Marcados")
        self.policy_menu = ctk.CTkOptionMenu(
            frame,
            variable=self.policy_var,
            values=["Somente Marcados", "Todos"],
        )
        self.policy_menu.grid(row=7, column=0, sticky="ew", padx=10, pady=(0, 10))
        self.autostart_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(
            frame,
            text="Iniciar o agente com o Windows",
            variable=self.autostart_var,
        ).grid(row=8, column=0, padx=10, pady=14, sticky="w")

    def _create_documents_tab(self):
        frame = self._scrollable_tab("Documentos financeiros")
        self._section_title(
            frame,
            "PDFs oficiais gerados pelo iLux",
            "Adicione uma pasta por linha. O agente apenas lê os PDFs e monitora todas as subpastas; nenhum arquivo será movido, alterado ou renomeado.",
            0,
        )
        ctk.CTkLabel(frame, text="Pastas monitoradas").grid(row=2, column=0, sticky="w", padx=10, pady=(8, 2))
        self.financial_folders_text = ctk.CTkTextbox(frame, height=130, wrap="none")
        self.financial_folders_text.grid(row=3, column=0, sticky="ew", padx=10, pady=(0, 8))

        actions = ctk.CTkFrame(frame, fg_color="transparent")
        actions.grid(row=4, column=0, padx=10, pady=4, sticky="ew")
        actions.grid_columnconfigure((0, 1, 2), weight=1)
        ctk.CTkButton(actions, text="Adicionar pasta", command=self.add_financial_folder).grid(
            row=0, column=0, padx=(0, 4), sticky="ew"
        )
        ctk.CTkButton(actions, text="Testar acesso", command=self.test_financial_folders).grid(
            row=0, column=1, padx=4, sticky="ew"
        )
        self.index_btn = ctk.CTkButton(actions, text="Indexar agora", command=self.index_financial_folders)
        self.index_btn.grid(row=0, column=2, padx=(4, 0), sticky="ew")

        self.document_status = ctk.CTkLabel(
            frame,
            text="Nenhuma indexação realizada nesta sessão.",
            text_color="#94a3b8",
            justify="left",
            anchor="w",
            wraplength=760,
        )
        self.document_status.grid(row=5, column=0, padx=10, pady=14, sticky="ew")

    def _create_logs_tab(self):
        tab = self.tabs.tab("Logs")
        self.log_textbox = ctk.CTkTextbox(tab, state="disabled", wrap="word")
        self.log_textbox.grid(row=0, column=0, padx=8, pady=8, sticky="nsew")

    def _folders(self):
        return [line.strip() for line in self.financial_folders_text.get("1.0", "end").splitlines() if line.strip()]

    def load_settings(self):
        self.token_entry.insert(0, os.getenv("CRM_SYNC_TOKEN", ""))
        self.db_path_entry.insert(0, os.getenv("FIREBIRD_DATABASE", ""))
        self.login_entry.insert(0, os.getenv("FIREBIRD_USER", "SYSDBA"))
        self.password_entry.insert(0, os.getenv("FIREBIRD_PASSWORD", ""))
        self.billing_folder_entry.insert(0, os.getenv("BILLING_FOLDER_PATH", ""))
        self.policy_var.set(os.getenv("BILLING_SEND_POLICY", "Somente Marcados"))
        self.interval_entry.insert(0, os.getenv("SYNC_INTERVAL_SECONDS", "300"))
        self.autostart_var.set(os.getenv("AUTOSTART_WINDOWS", "False").lower() == "true")

        raw_folders = os.getenv("FINANCIAL_DOCUMENT_FOLDERS", "")
        try:
            folders = json.loads(raw_folders) if raw_folders else []
        except (TypeError, ValueError, json.JSONDecodeError):
            folders = [item.strip() for item in raw_folders.split("|") if item.strip()]
        if isinstance(folders, list):
            self.financial_folders_text.insert("1.0", "\n".join(str(item) for item in folders))

    def save_settings(self, log=True):
        if not ENV_FILE.exists():
            ENV_FILE.touch()
        settings = {
            "CRM_SYNC_TOKEN": self.token_entry.get(),
            "FIREBIRD_DATABASE": self.db_path_entry.get(),
            "FIREBIRD_USER": self.login_entry.get(),
            "FIREBIRD_PASSWORD": self.password_entry.get(),
            "BILLING_FOLDER_PATH": self.billing_folder_entry.get(),
            "BILLING_SEND_POLICY": self.policy_var.get(),
            "SYNC_INTERVAL_SECONDS": self.interval_entry.get(),
            "AUTOSTART_WINDOWS": str(self.autostart_var.get()),
            "FINANCIAL_DOCUMENT_FOLDERS": json.dumps(self._folders(), ensure_ascii=False),
            "AGENT_WINDOW_GEOMETRY": self.geometry(),
        }
        for key, value in settings.items():
            set_key(str(ENV_FILE), key, value)
        self.set_startup(self.autostart_var.get())
        if log:
            self.log_message("Configurações salvas com sucesso.")

    def add_financial_folder(self):
        selected = filedialog.askdirectory(title="Selecione a pasta de documentos financeiros", mustexist=True)
        if not selected:
            return
        folders = self._folders()
        if selected.casefold() not in {item.casefold() for item in folders}:
            folders.append(selected)
            self.financial_folders_text.delete("1.0", "end")
            self.financial_folders_text.insert("1.0", "\n".join(folders))
        self.document_status.configure(text=f"Pasta adicionada: {selected}", text_color="#eabf32")

    def test_financial_folders(self):
        folders = self._folders()
        if not folders:
            self.document_status.configure(text="Adicione ao menos uma pasta para testar.", text_color="#f87171")
            return
        unavailable = [folder for folder in folders if not Path(folder).is_dir()]
        if unavailable:
            self.document_status.configure(
                text="Sem acesso: " + " | ".join(unavailable),
                text_color="#f87171",
            )
        else:
            self.document_status.configure(
                text=f"Acesso confirmado em {len(folders)} pasta(s). As subpastas também serão monitoradas.",
                text_color="#4ade80",
            )

    def index_financial_folders(self):
        self.save_settings(log=False)
        self.index_btn.configure(state="disabled", text="Indexando...")
        self.document_status.configure(
            text="Lendo os PDFs. A primeira indexação pode levar alguns minutos...",
            text_color="#eabf32",
        )
        threading.Thread(target=self._index_worker, daemon=True).start()

    def _index_worker(self):
        try:
            import main as agent_main

            def on_progress(text):
                self.after(0, lambda text=text: self.document_status.configure(text=text, text_color="#eabf32"))
                self.after(0, self.log_message, text)

            config = agent_main.AppConfig.from_env()
            stats = agent_main.FirebirdRepository(config).scan_financial_documents(on_progress=on_progress)
            message = (
                f"Indexação concluída: {stats['total']} documento(s), "
                f"{stats['added']} novo(s), {stats['updated']} atualizado(s), "
                f"{stats['errors']} erro(s)."
            )
            color = "#4ade80" if not stats["errors"] else "#facc15"
            self.after(0, lambda: self.document_status.configure(text=message, text_color=color))
            self.after(0, self.log_message, message)
        except Exception as exc:
            message = f"Falha na indexação: {exc}"
            self.after(0, lambda: self.document_status.configure(text=message, text_color="#f87171"))
            self.after(0, self.log_message, message)
        finally:
            self.after(0, lambda: self.index_btn.configure(state="normal", text="Indexar agora"))

    def set_startup(self, enable):
        startup_path = os.path.join(os.environ["APPDATA"], r"Microsoft\Windows\Start Menu\Programs\Startup")
        bat_path = os.path.join(startup_path, "AgenteCRM.bat")
        if enable:
            exe_path = os.path.abspath(sys.executable) if getattr(sys, "frozen", False) else os.path.abspath(__file__)
            try:
                with open(bat_path, "w", encoding="utf-8") as stream:
                    stream.write(f'@echo off\nstart "" "{exe_path}" --minimized\n')
            except Exception as exc:
                self.log_message(f"Erro ao configurar inicialização: {exc}")
        elif os.path.exists(bat_path):
            try:
                os.remove(bat_path)
            except OSError:
                pass

    def hide_window(self, icon=None, item=None):
        self.save_settings(log=False)
        self.withdraw()
        if self.tray_icon:
            return
        menu = pystray.Menu(
            pystray.MenuItem("Mostrar agente", self.show_window),
            pystray.MenuItem("Sair", self.quit_window),
        )
        self.tray_icon = pystray.Icon("AgenteCRM", create_tray_image(), "Agente iLux CRM", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def show_window(self, icon=None, item=None):
        if icon:
            icon.stop()
        self.tray_icon = None
        self.after(0, self.deiconify)

    def quit_window(self, icon=None, item=None):
        if icon:
            icon.stop()
        self.is_running = False
        if self.command_stop_event:
            self.command_stop_event.set()
        self.after(0, self.destroy)

    def log_message(self, message):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        self.log_message_raw(f"[{timestamp}] {message}")

    def log_message_raw(self, message):
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert("end", f"{message}\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")

    def toggle_agent(self):
        if not self.is_running:
            self.save_settings()
            self.is_running = True
            self.status_label.configure(text="● Em execução", text_color="#4ade80")
            self.action_btn.configure(text="■ Parar agente", fg_color="#b91c1c", hover_color="#991b1b")
            self.log_message("Agente iniciado.")
            self.agent_thread = threading.Thread(target=self.run_agent_loop, daemon=True)
            self.agent_thread.start()
        else:
            self.is_running = False
            if self.command_stop_event:
                self.command_stop_event.set()
            self.status_label.configure(text="● Parando...", text_color="#facc15")
            self.log_message("Sinal de parada enviado.")

    def run_agent_loop(self):
        import main as agent_main

        class TextBoxLogHandler(logging.Handler):
            def __init__(self, gui):
                super().__init__()
                self.gui = gui
                self.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S"))

            def emit(self, record):
                self.gui.after(0, self.gui.log_message_raw, self.format(record))

        logger = logging.getLogger()
        logger.setLevel(logging.INFO)
        handler = TextBoxLogHandler(self)
        logger.addHandler(handler)
        try:
            config = agent_main.AppConfig.from_env()
            state = agent_main.StateStore(config.state_file)
            self.command_stop_event = threading.Event()
            threading.Thread(
                target=agent_main.run_command_listener,
                args=(config, self.command_stop_event),
                name="firebird-command-listener",
                daemon=True,
            ).start()
            threading.Thread(
                target=agent_main.run_financial_document_monitor,
                args=(config, self.command_stop_event),
                name="financial-document-monitor",
                daemon=True,
            ).start()
            while self.is_running:
                try:
                    agent_main.run_cycle(config, state, stop_event=self.command_stop_event)
                except Exception as exc:
                    logging.exception("Erro no ciclo de sincronização: %s", exc)
                for _ in range(max(30, config.sync_interval_seconds)):
                    if not self.is_running:
                        break
                    time.sleep(1)
        except Exception:
            logging.exception("O agente encontrou um erro fatal.")
        finally:
            if self.command_stop_event:
                self.command_stop_event.set()
            self.is_running = False
            self.after(0, lambda: self.status_label.configure(text="● Parado", text_color="#94a3b8"))
            self.after(
                0,
                lambda: self.action_btn.configure(
                    text="▶ Iniciar agente", fg_color="#15803d", hover_color="#166534"
                ),
            )
            logger.removeHandler(handler)


if __name__ == "__main__":
    app = AgentGUI()
    if "--minimized" in sys.argv:
        app.hide_window()
        app.toggle_agent()
    app.mainloop()
