import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from reportlab.pdfgen import canvas

from main import AppConfig, BillingSendLedger, CRMClient, FirebirdRepository, run_billing_automation


CUSTOMER_CNPJ = "07.275.799/0001-78"


def make_pdf(path: Path, lines: list[str]):
    document = canvas.Canvas(str(path))
    y = 800
    for line in lines:
        document.drawString(40, y, line)
        y -= 18
    document.save()


class BillingSendLedgerTest(unittest.TestCase):
    def test_records_and_checks_persist_across_reload(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.json"
            ledger = BillingSendLedger(path)
            self.assertFalse(ledger.already_sent(101, "hash-a"))
            ledger.record(101, "hash-a", {"customerName": "Cliente Teste"})
            self.assertTrue(ledger.already_sent(101, "hash-a"))
            # A different hash for the same receivable (e.g. a reissued boleto
            # with a new due date) must be treated as a brand new package.
            self.assertFalse(ledger.already_sent(101, "hash-b"))

            reloaded = BillingSendLedger(path)
            self.assertTrue(reloaded.already_sent(101, "hash-a"))


class FindReadyBillingPackagesTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        make_pdf(self.root / "a.pdf", [
            "Fatura de Locacao de Bens Moveis",
            f"Cliente J. C. MUNIZ - CNPJ {CUSTOMER_CNPJ}",
            "Fatura 14328",
            "Data Emissao 28/07/2026",
            "Data de Vencimento 10/08/2026",
            "VALOR LIQUIDO R$ 141,30",
        ])
        make_pdf(self.root / "b.pdf", [
            "DEMONSTRATIVO DO FATURAMENTO",
            f"CNPJ/CPF: {CUSTOMER_CNPJ}",
            "Demost.:14365",
            "Valor Total 141,30",
        ])
        make_pdf(self.root / "c.pdf", [
            "RECIBO DO PAGADOR - FICHA DE COMPENSACAO",
            f"Pagador J. C. MUNIZ - CNPJ {CUSTOMER_CNPJ}",
            "Numero do Documento 14328/1",
            "Vencimento 10/08/2026",
            "Valor do Documento 141,30",
            "Nosso Numero 00013216.76",
        ])
        self.config = AppConfig(
            financial_document_folders=[str(self.root)],
            financial_document_index_file=self.root / "index.json",
        )
        self.repo = FirebirdRepository(self.config)
        self.repo.scan_financial_documents()
        self.receivable_row = {
            "seqreceita": 501,
            "customer_cnpj": CUSTOMER_CNPJ,
            "customer_cpf": None,
            "customer_name": "J. C. MUNIZ & CIA LTDA",
            "invoice_number": "14328",
            "seqdemonstrativo": 14365,
            "dtemissaonfs": None,
            "dtemissaorec": "2026-07-28",
            "dtvectorec": "2026-08-10",
            "valreceita": 141.30,
        }

    def tearDown(self):
        self.temporary.cleanup()

    def test_finds_a_complete_unambiguous_package(self):
        ledger = BillingSendLedger(self.root / "ledger.json")
        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]):
            packages = self.repo.find_ready_billing_packages(["invoice", "statement", "boleto"], ledger)
        self.assertEqual(len(packages), 1)
        package = packages[0]
        self.assertEqual(package["receivableExternalId"], 501)
        self.assertEqual({d["documentType"] for d in package["documents"]}, {"invoice", "statement", "boleto"})

    def test_does_not_repeat_an_already_sent_package(self):
        ledger = BillingSendLedger(self.root / "ledger.json")
        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]):
            first = self.repo.find_ready_billing_packages(["invoice", "statement", "boleto"], ledger)
            ledger.record(501, first[0]["combinedHash"], {})
            second = self.repo.find_ready_billing_packages(["invoice", "statement", "boleto"], ledger)
        self.assertEqual(second, [])

    def test_incomplete_package_is_not_ready(self):
        ledger = BillingSendLedger(self.root / "ledger.json")
        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]):
            # "estatement-x" never matches anything real, so this package can
            # never complete -- mirrors a título missing its demonstrativo.
            packages = self.repo.find_ready_billing_packages(["invoice", "statement", "estatement-x"], ledger)
        self.assertEqual(packages, [])


class RunBillingAutomationTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        make_pdf(self.root / "a.pdf", [
            "Fatura de Locacao de Bens Moveis",
            f"Cliente J. C. MUNIZ - CNPJ {CUSTOMER_CNPJ}",
            "Fatura 14328",
            "Data Emissao 28/07/2026",
            "Data de Vencimento 10/08/2026",
            "VALOR LIQUIDO R$ 141,30",
        ])
        self.config = AppConfig(
            financial_document_folders=[str(self.root)],
            financial_document_index_file=self.root / "index.json",
            billing_auto_send_enabled=True,
            billing_auto_send_document_types=["invoice"],
        )
        self.repo = FirebirdRepository(self.config)
        self.repo.scan_financial_documents()
        self.receivable_row = {
            "seqreceita": 777,
            "customer_cnpj": CUSTOMER_CNPJ,
            "customer_cpf": None,
            "customer_name": "J. C. MUNIZ & CIA LTDA",
            "invoice_number": "14328",
            "seqdemonstrativo": None,
            "dtemissaonfs": None,
            "dtemissaorec": "2026-07-28",
            "dtvectorec": "2026-08-10",
            "valreceita": 141.30,
        }

    def tearDown(self):
        self.temporary.cleanup()

    def test_disabled_by_default_does_nothing(self):
        self.config.billing_auto_send_enabled = False
        ledger = BillingSendLedger(self.root / "ledger.json")
        crm = CRMClient(self.config)
        with patch.object(crm, "send_billing_package") as send:
            stats = run_billing_automation(self.repo, crm, self.config, ledger)
        send.assert_not_called()
        self.assertEqual(stats, {"ready": 0, "sent": 0, "failed": 0})

    def test_test_mode_never_calls_send_and_still_dedupes_via_ledger(self):
        self.config.billing_auto_send_test_mode = True
        ledger = BillingSendLedger(self.root / "ledger.json")
        crm = CRMClient(self.config)
        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]), \
             patch.object(crm, "send_billing_package") as send:
            stats = run_billing_automation(self.repo, crm, self.config, ledger)
        send.assert_not_called()
        self.assertEqual(stats["sent"], 1)
        self.assertEqual(stats["failed"], 0)

        # Recorded once -- a second pass finds nothing new ready, so the same
        # package is not logged again every cycle.
        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]), \
             patch.object(crm, "send_billing_package") as send_again:
            stats_again = run_billing_automation(self.repo, crm, self.config, ledger)
        self.assertEqual(stats_again["ready"], 0)
        send_again.assert_not_called()

    def test_real_mode_sends_and_records_only_on_success(self):
        self.config.billing_auto_send_test_mode = False
        ledger = BillingSendLedger(self.root / "ledger.json")
        crm = CRMClient(self.config)
        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]), \
             patch.object(crm, "send_billing_package", return_value={"success": True}) as send:
            stats = run_billing_automation(self.repo, crm, self.config, ledger)
        send.assert_called_once()
        self.assertEqual(stats["sent"], 1)

    def test_real_mode_does_not_record_a_failed_send_so_it_retries_next_time(self):
        self.config.billing_auto_send_test_mode = False
        ledger = BillingSendLedger(self.root / "ledger.json")
        crm = CRMClient(self.config)
        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]), \
             patch.object(crm, "send_billing_package", side_effect=RuntimeError("boom")):
            stats = run_billing_automation(self.repo, crm, self.config, ledger)
        self.assertEqual(stats["failed"], 1)
        self.assertEqual(stats["sent"], 0)

        with patch.object(self.repo, "fetch_open_receivables_for_billing", return_value=[self.receivable_row]), \
             patch.object(crm, "send_billing_package", return_value={"success": True}) as send:
            stats_retry = run_billing_automation(self.repo, crm, self.config, ledger)
        send.assert_called_once()
        self.assertEqual(stats_retry["sent"], 1)


if __name__ == "__main__":
    unittest.main()
