import tempfile
import unittest
from pathlib import Path

from reportlab.pdfgen import canvas

from financial_document_index import FinancialDocumentIndex


CUSTOMER_CNPJ = "07.275.799/0001-78"


def make_pdf(path: Path, lines: list[str]):
    document = canvas.Canvas(str(path))
    y = 800
    for line in lines:
        document.drawString(40, y, line)
        y -= 18
    document.save()


class FinancialDocumentIndexTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        make_pdf(self.root / "arquivo-qualquer-a.pdf", [
            "Fatura de Locacao de Bens Moveis",
            f"Cliente J. C. MUNIZ - CNPJ {CUSTOMER_CNPJ}",
            "Fatura 14328",
            "Data Emissao 28/07/2026",
            "Data de Vencimento 10/08/2026",
            "VALOR LIQUIDO R$ 141,30",
        ])
        make_pdf(self.root / "sem-nome-util-b.pdf", [
            "DEMONSTRATIVO DO FATURAMENTO",
            f"CNPJ/CPF: {CUSTOMER_CNPJ}",
            "Demost.:14365",
            "Valor Total 141,30",
        ])
        make_pdf(self.root / "documento.pdf", [
            "RECIBO DO PAGADOR - FICHA DE COMPENSACAO",
            f"Pagador J. C. MUNIZ - CNPJ {CUSTOMER_CNPJ}",
            "Numero do Documento 14328/1",
            "Vencimento 10/08/2026",
            "Valor do Documento 141,30",
            "Nosso Numero 00013216.76",
        ])
        self.context = {
            "customer_cnpj": CUSTOMER_CNPJ,
            "customer_name": "J. C. MUNIZ & CIA LTDA",
            "invoice_number": "14328",
            "seqdemonstrativo": 14365,
            "dtemissaorec": "2026-07-28",
            "dtvectorec": "2026-08-10",
            "valreceita": 141.30,
            "seqreceita": 1,
        }

    def tearDown(self):
        self.temporary.cleanup()

    def test_matches_all_documents_without_using_file_names(self):
        index = FinancialDocumentIndex([str(self.root)], self.root / "index.json", "35.692.721/0001-94")
        stats = index.scan()
        self.assertEqual(stats["total"], 3)
        self.assertTrue(index.find("invoice", self.context).path.name.endswith("a.pdf"))
        self.assertTrue(index.find("statement", self.context).path.name.endswith("b.pdf"))
        self.assertEqual(index.find("boleto", self.context).path.name, "documento.pdf")

    def test_cached_scan_does_not_reprocess_unchanged_files(self):
        cache = self.root / "index.json"
        FinancialDocumentIndex([str(self.root)], cache).scan()
        stats = FinancialDocumentIndex([str(self.root)], cache).scan()
        self.assertEqual(stats["added"], 0)
        self.assertEqual(stats["updated"], 0)

    def test_rejects_a_different_customer(self):
        index = FinancialDocumentIndex([str(self.root)], self.root / "index.json")
        index.scan()
        wrong = {**self.context, "customer_cnpj": "87.130.589/0001-20"}
        self.assertIsNone(index.find("invoice", wrong))


if __name__ == "__main__":
    unittest.main()
