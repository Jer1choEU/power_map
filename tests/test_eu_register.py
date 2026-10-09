import importlib.util
import tempfile
import unittest
from pathlib import Path

p=Path(__file__).resolve().parents[1]/"scripts"/"import-eu-register.py"
spec=importlib.util.spec_from_file_location("eu_register",p)
eu=importlib.util.module_from_spec(spec)
spec.loader.exec_module(eu)

class EURegistryTests(unittest.TestCase):
    def test_invalid_xml_reference_sanitizer(self):
        safe,count=eu.clean_xml_bytes(b'<x>A&#x0;B&#11;C&#x1F;D&#x20;E</x>')
        self.assertEqual(count,3)
        self.assertIn(b'A?B?C?D&#x20;E',safe)

    def test_only_italian_organizations_are_published(self):
        content="""<?xml version='1.1' encoding='UTF-8'?>
<ListOfIRPublicDetail xmlns="http://intragate.ec.europa.eu/transparencyregister/odp">
<metaData xmlns=""><exportDate>2026-10-09T20:00:00Z</exportDate></metaData>
<resultList xmlns="">
<interestRepresentative><identificationCode>880143435725-46</identificationCode><name><originalName>Organizzazione Sociale Demo</originalName></name><registrationDate>2020-01-10T12:00:00Z</registrationDate><registrationCategory>Professional associations</registrationCategory><headOffice><country>ITALY</country></headOffice></interestRepresentative>
<interestRepresentative><identificationCode>990143435725-32</identificationCode><name><originalName>Spanish Demo</originalName></name><registrationDate>2019-01-10T12:00:00Z</registrationDate><registrationCategory>Companies and groups</registrationCategory><headOffice><country>SPAIN</country></headOffice></interestRepresentative>
</resultList>
</ListOfIRPublicDetail>"""
        with tempfile.TemporaryDirectory() as directory:
            f=Path(directory)/"data.xml"
            f.write_text(content,encoding="utf-8")
            data,report=eu.parse_export(f,strict=False)
            self.assertEqual(report["globalRegistrations"],2)
            self.assertEqual(report["italianOrganizations"],1)
            self.assertEqual(sum(e["type"]=="organizzazione" for e in data["entities"]),1)
            self.assertEqual(len(data["relations"]),1)
            self.assertEqual(data["relations"][0]["eventDate"],"2020-01-10")
            self.assertEqual(data["relations"][0]["type"],"iscrizione")
            with self.assertRaisesRegex(ValueError,"Unexpected"):
                eu.parse_export(f,strict=True)

if __name__=="__main__":
    unittest.main()
