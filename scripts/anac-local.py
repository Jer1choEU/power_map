#!/usr/bin/env python3
"""Inspect ANAC CSV/ZIP files downloaded through an authorized browser session.

Offline only: computes hashes and headers; never infers contracts or publishes graph data.
Usage:
  python scripts/anac-local.py "C:/Downloads/20260901-aggiudicazioni_csv.zip" "C:/Downloads/20260901-aggiudicatari_csv.zip"
"""
import argparse
import hashlib
import importlib.util
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("anac_intake", Path(__file__).with_name("anac-intake.py"))
INTAKE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(INTAKE)
MAX_FILE_BYTES = 1024 * 1024 * 1024

def kind_for_name(name):
    low = name.lower()
    if "aggiudicatari" in low:
        return "aggiudicatari"
    if "aggiudicazioni" in low:
        return "aggiudicazioni"
    if re.search(r"(^|[-_])cig([-_.]|$)", low):
        return "cig"
    return "non identificato"

def inspect_local(filename):
    p = Path(filename).expanduser()
    if not p.is_file() or p.suffix.lower() not in {".csv", ".zip"}:
        raise ValueError("Requires an existing .csv or .zip file")
    size = p.stat().st_size
    if size == 0 or size > MAX_FILE_BYTES:
        raise ValueError("File empty or exceeds 1GiB")
    h = hashlib.sha256()
    with p.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    result = INTAKE.inspect_archive(str(p), p.suffix.lower() == ".zip")
    if not result["header"] or any(not column.strip() for column in result["header"]):
        raise ValueError("Missing/blank column names")
    return {"fileName": p.name, "kind": kind_for_name(p.name), "bytes": size,
            "sha256": h.hexdigest(), "header": result["header"],
            "archive": result["archive"], **({"zipMember": result["member"]} if "member" in result else {})}

def main():
    parser = argparse.ArgumentParser(description="Inspect locally downloaded official ANAC CSV/ZIP files, without importing rows")
    parser.add_argument("files", nargs="+", help="CSV or ZIP paths from an authorized ANAC download")
    parser.add_argument("--output", default="build/anac-local-report.json", help="Where to write a safe header/checksum report")
    args = parser.parse_args()
    results = []
    for file in args.files:
        try:
            item = inspect_local(file)
            results.append({"status": "ok", **item})
            print(f"OK {item['fileName']}: {item['kind']}, {len(item['header'])} columns")
        except (ValueError, OSError, EOFError, RuntimeError, Exception) as error:
            results.append({"status": "error", "fileName": Path(file).name, "error": str(error)})
            print(f"ERROR {Path(file).name}: {error}", file=sys.stderr)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {"createdAt": datetime.now(timezone.utc).isoformat(), "mode": "local-file-header-inspection",
              "sourceVerification": "pending", "files": results,
              "warning": "No rows processed. Files must be traced to original ANAC URLs and licensed before review/publication."}
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Report: {output}")
    if any(r["status"] == "error" for r in results):
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
