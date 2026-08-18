import unittest

from main import normalize_contract


class NormalizeContractTest(unittest.TestCase):
    def test_billing_fields_are_normalized(self):
        record = {
            "seqcontrato": 1,
            "cdcliente": 2,
            "nrcontrato": "0001",
            "status": "A",
            "valor_total_contrato": 1000,
            "tr_vl_fixo": 100,
            "valor_franquia": 50,
            "qt_franquia": 5000,
            "val_excedente": 0.05,
            "billing_mode": "misto",
            "qt_equipamentos": 3,
        }
        result = normalize_contract(record)
        self.assertEqual(result["pageFranchise"], 5000)
        self.assertEqual(result["overageValue"], 0.05)
        self.assertEqual(result["billingMode"], "misto")

    def test_billing_fields_default_when_missing(self):
        record = {
            "seqcontrato": 2,
            "cdcliente": 3,
        }
        result = normalize_contract(record)
        self.assertEqual(result["pageFranchise"], 0)
        self.assertEqual(result["overageValue"], 0.0)
        self.assertIsNone(result["billingMode"])


if __name__ == "__main__":
    unittest.main()
