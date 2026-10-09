import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
import importlib.util
spec = importlib.util.spec_from_file_location("anac_intake", Path(__file__).resolve().parents[1] / "scripts" / "anac-intake.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
get_header, inspect_archive, pick_resources, allowed_url = module.get_header, module.inspect_archive, module.pick_resources, module.allowed_url

class IntakeTests(unittest.TestCase):
    def test_picks_latest_and_rejects_untrusted_resources(self):
        catalog={"packages":[{"package":"aggiudicatari","status":"ok","resources":[
          {"id":"a","name":"20260501-aggiudicatari_csv","url":"https://dati.anticorruzione.it/a.zip","isZip":True},
          {"id":"b","name":"20260601-aggiudicatari_csv","url":"https://dati.anticorruzione.it/b.zip","isZip":True},
          {"id":"c","name":"20261001-aggiudicatari_csv","url":"https://example.com/c.zip","isZip":True}]}]}
        self.assertEqual(pick_resources(catalog)[0]["resource"]["id"],"b")
    def test_csv_header_semicolon(self):
        self.assertEqual(get_header(io.BytesIO("CIG;RAGIONE_SOCIALE;CODICE_FISCALE\nA;B;C\n".encode())),["CIG","RAGIONE_SOCIALE","CODICE_FISCALE"])
    def test_zip_header_and_path_traversal(self):
        with tempfile.TemporaryDirectory() as t:
            good=Path(t)/"good.zip"
            with zipfile.ZipFile(good,"w",compression=zipfile.ZIP_DEFLATED) as z:
                z.writestr("nested/data.csv","CIG;DENOMINAZIONE\nABC;Demo\n")
            self.assertEqual(inspect_archive(good,True)["header"],["CIG","DENOMINAZIONE"])
            bad=Path(t)/"bad.zip"
            with zipfile.ZipFile(bad,"w") as z:
                z.writestr("../escape.csv","CIG\nABC\n")
            with self.assertRaisesRegex(ValueError,"Unsafe"):
                inspect_archive(bad,True)
    def test_untrusted_url(self):
        for url in ["http://dati.anticorruzione.it/a.csv","https://dati.anticorruzione.it.evil.example/b.zip"]:
            with self.assertRaises(ValueError):allowed_url(url)

if __name__=="__main__":
    unittest.main()
