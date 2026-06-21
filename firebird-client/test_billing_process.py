import logging
import os
import sys
from pathlib import Path

# Configura o path do import
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from main import AppConfig, CRMClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class MockSession:
    def __init__(self):
        self.headers = {}
        
    def post(self, url, files, data, headers, timeout):
        print("\n=== MOCK BACKEND RECEBEU REQUISIÇÃO ===")
        print(f"URL: {url}")
        print(f"Headers: {headers}")
        print(f"Data: {data}")
        print("Arquivos enviados:")
        for key, file_info in files:
            filename = file_info[0]
            print(f"  - Campo: {key}, Nome do arquivo: {filename}")
        
        # Cria uma classe de resposta mockada
        class MockResponse:
            def raise_for_status(self):
                pass
            def json(self):
                return {"success": True}
        
        return MockResponse()

def run_test():
    # Cria uma configuração apontando para a pasta de teste e ignorando o CNPJ do emitente
    config = AppConfig(
        crm_base_url="http://mock-crm-backend.local",
        crm_tenant_slug="master",
        crm_sync_token="test_token_123",
        billing_folder_path=r"\\26.119.90.177\c$\ILUX\boletos_enviar",
        own_cnpj="35.692.721/0001-94"
    )
    
    # Cria o CRMClient e substitui a session real pelo MockSession
    client = CRMClient(config)
    client.session = MockSession()
    
    print("Iniciando processamento mockado da pasta de cobranças...")
    client.process_billing_folder()
    print("Processamento concluído.")

if __name__ == '__main__':
    run_test()
