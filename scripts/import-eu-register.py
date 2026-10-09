#!/usr/bin/env python3
"""Fetch and parse the EU Transparency Register's public XML without third-party packages.

Publishes organization registrations only; never infers lobbying relationships or individuals.
"""
import argparse
import hashlib
import json
import re
import sys
import tempfile
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

FEED = "https://ec.europa.eu/transparencyregister/public/files/ODP/download/XML/latest"
MAX_BYTES = 175 * 1024 * 1024
ID_PATTERN = re.compile(r"^[0-9]{5,16}-[0-9]{2}$")

def local(tag):
    return tag.rsplit("}", 1)[-1]

def descendant(element, name):
    return next((e for e in element.iter() if local(e.tag) == name), None)

def value(element, name):
    found = descendant(element, name)
    return (found.text or "").strip() if found is not None else ""

def parse_export(filepath, as_of=None, strict=True):
    date = as_of or datetime.now(timezone.utc).date().isoformat()
    organizations = {}
    total, excluded, bad = 0, 0, 0
    export_date = None
    root = None
    iterator = ET.iterparse(filepath, events=("start", "end"))
    for event, elem in iterator:
        tag = local(elem.tag)
        if root is None and event == "start":
            root = elem
        if event != "end":
            continue
        if tag == "exportDate":
            export_date = (elem.text or "").strip().split("T")[0]
        if tag != "interestRepresentative":
            continue
        total += 1
        office = descendant(elem, "headOffice")
        country = value(office, "country") if office is not None else ""
        if country.upper() not in ("ITALY", "ITALIA", "IT"):
            excluded += 1
            elem.clear()
            if root is not None: root.clear()
            continue
        identity = value(elem, "identificationCode")
        name = value(elem, "originalName")
        classification = value(elem, "registrationCategory")
        if not ID_PATTERN.fullmatch(identity) or not name or len(name) > 240 or "self-employed" in classification.lower():
            bad += 1
            elem.clear()
            if root is not None: root.clear()
            continue
        registration_date = value(elem, "registrationDate").split("T")[0]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", registration_date):
            bad += 1
            elem.clear()
            if root is not None: root.clear()
            continue
        entity_id = "eu-tr:organization:" + identity
        if entity_id in organizations and organizations[entity_id]["name"] != name:
            bad += 1
        else:
            organizations[entity_id] = {"id":entity_id,"name":name,"type":"organizzazione",
               "description":"Organizzazione con sede in Italia iscritta al Registro per la trasparenza dell'UE. L'iscrizione non implica comportamenti illeciti.",
               "registeredAt":registration_date}
        elem.clear()
        if root is not None: root.clear()
    if not export_date or not re.fullmatch(r"\d{4}-\d{2}-\d{2}",export_date):
        raise ValueError("Missing export date in official XML")
    if strict and (total < 10000 or len(organizations) < 200 or len(organizations) > 6000):
        raise ValueError(f"Unexpected number of records: global {total}, Italian {len(organizations)}")
    registry_id="eu-tr:institution:transparency-register"
    entities=[{"id":registry_id,"name":"Registro per la trasparenza dell'UE","type":"istituzione",
               "description":"Registro interistituzionale UE dei rappresentanti di interessi registrati."}]
    relations=[]
    for entity in organizations.values():
        datestr=entity.pop("registeredAt")
        entities.append(entity)
        relations.append({"id":"rel:eu-tr:"+entity["id"].split(":")[-1],"from":entity["id"],"to":registry_id,
             "type":"iscrizione","label":"Iscrizione al Registro per la trasparenza dell'UE","eventDate":datestr,
             "validFrom":datestr,"validTo":None,"sourceIds":["source:eu-transparency"]})
    data={"version":1,"mode":"real","updatedAt":date,"entities":sorted(entities,key=lambda e:e["id"]),
          "sources":[{"id":"source:eu-transparency","title":"EU Transparency Register — registered organizations",
                      "url":FEED,"publisher":"European Commission — Transparency Register",
                      "accessedAt":date,"publishedAt":export_date}],
          "relations":sorted(relations,key=lambda r:r["id"])}
    return data,{"exportDate":export_date,"globalRegistrations":total,"italianOrganizations":len(organizations),
                 "excludedOrOtherCountry":excluded,"rejectedItalianRecords":bad,"sourceUrl":FEED}

def download_file(target):
    req=urllib.request.Request(FEED,headers={"Accept":"application/xml,text/xml,*/*","User-Agent":"PowerMapResearch/0.5"})
    sha=hashlib.sha256()
    amount=0
    with urllib.request.urlopen(req, timeout=180) as response:
        final=urllib.parse.urlparse(response.geturl())
        if final.scheme != "https" or final.hostname not in {"ec.europa.eu","transparency-register.europa.eu"}:
            raise ValueError("Unexpected Transparency Register download location")
        with open(target,"wb") as file:
            while True:
                chunk=response.read(128*1024)
                if not chunk:break
                amount+=len(chunk)
                if amount>MAX_BYTES:raise ValueError("Official XML exceeds size limit")
                sha.update(chunk)
                file.write(chunk)
    if amount<1024: raise ValueError("Official XML empty or truncated")
    return amount,sha.hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--fixture",help="Offline official XML fixture for tests")
    parser.add_argument("--output-dir",default="build/eu-register")
    opts=parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="eu-register-") as temp:
        source=opts.fixture or str(Path(temp)/"official.xml")
        amount,digest=(None,None) if opts.fixture else download_file(source)
        data,report=parse_export(source)
    if amount is not None:
        report.update(downloadBytes=amount,archiveSha256=digest)
    else:
        report.update(archiveSha256=hashlib.sha256(Path(opts.fixture).read_bytes()).hexdigest())
    output=Path(opts.output_dir)
    output.mkdir(parents=True,exist_ok=True)
    (output/"candidate.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (output/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))

if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("EU registry intake failed:",str(exc),file=sys.stderr)
        raise SystemExit(1)
