import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("anac_local", ROOT / "scripts" / "anac-local.py")
LOCAL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LOCAL)

class LocalIntakeTests(unittest.TestCase):
    def test_zipped_csv_header_and_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "20260901-aggiudicatari_csv.zip"
            with zipfile.ZipFile(path, "w") as z:
                z.writestr("awards.csv", "CIG;CODICE_FISCALE;DENOMINAZIONE\n1234567890;12345;Azienda Esempio\n")
            record = LOCAL.inspect_local(str(path))
            self.assertEqual(record["kind"], "aggiudicatari")
            self.assertEqual(record["header"], ["CIG", "CODICE_FISCALE", "DENOMINAZIONE"])
            self.assertEqual(len(record["sha256"]), 64)

    def test_bad_zip_member_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "20260901-aggiudicazioni_csv.zip"
            with zipfile.ZipFile(path, "w") as z:
                z.writestr("../escape.csv", "CIG\n1234567890\n")
            with self.assertRaisesRegex(ValueError, "Unsafe ZIP member"):
                LOCAL.inspect_local(str(path))

    def test_unsupported_extension_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "dataset.exe"
            path.write_bytes(b"test")
            with self.assertRaisesRegex(ValueError, "csv or .zip"):
                LOCAL.inspect_local(str(path))

if __name__ == "__main__":
    unittest.main()
