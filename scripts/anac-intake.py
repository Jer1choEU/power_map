#!/usr/bin/env python3
"""ANAC intake: download one sample distribution per catalog, report CSV headers only.

Does not create public graph data. Uses only URLs returned by CKAN metadata.
"""
import csv
import io
import json
import os
import re
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import urlparse

ALLOWED_HOSTS = {"dati.anticorruzione.it", "anticorruzione.it", "www.anticorruzione.it"}
MAX_DOWNLOAD = 200 * 1024 * 1024
MAX_UNCOMPRESSED = 500 * 1024 * 1024
MAX_ZIP_ENTRIES = 100
MAX_HEADER_BYTES = 1024 * 1024


def allowed_url(url):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS or parsed.username or parsed.password:
        raise ValueError("URL not allowed")
    return url


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise ValueError("Redirect not permitted for official download")


def pick_resources(catalog):
    selections = []
    for package in catalog.get("packages", []):
        if package.get("status") != "ok":
            continue
        resources = []
        for item in package.get("resources", []):
            try:
                allowed_url(item["url"])
            except (ValueError, KeyError):
                continue
            if item.get("isCsv") or item.get("isZip"):
                resources.append(item)
        if resources:
            def sort_key(r):
                name = (r.get("name") or "") + " " + r["url"]
                dates = re.findall(r"20\d{6}", name)
                return (max(dates) if dates else "", str(r.get("lastModified") or ""), str(r.get("id") or ""))
            selections.append({"package": package["package"], "resource": max(resources, key=sort_key)})
    return selections


def get_header(file_obj):
    # Never publish rows. CSV may include quoted delimiters and UTF-8 BOM.
    reader = io.TextIOWrapper(file_obj, encoding="utf-8-sig", errors="replace", newline="")
    try:
        line = reader.readline(MAX_HEADER_BYTES + 1)
        if len(line) > MAX_HEADER_BYTES:
            raise ValueError("CSV header too large")
        if not line:
            raise ValueError("CSV empty")
        dialect = csv.excel
        if line.count(";") > line.count(","):
            dialect = csv.excel()
            dialect.delimiter = ";"
        return next(csv.reader([line], dialect=dialect))
    finally:
        reader.detach()


def inspect_archive(filename, is_zip):
    if not is_zip:
        with open(filename, "rb") as handle:
            return {"header": get_header(handle), "archive": False}
    with zipfile.ZipFile(filename) as archive:
        members = archive.infolist()
        if len(members) > MAX_ZIP_ENTRIES:
            raise ValueError("Too many ZIP entries")
        candidates = []
        for item in members:
            path = item.filename.replace("\\", "/")
            if path.startswith("/") or ".." in path.split("/") or (item.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Unsafe ZIP member")
            if item.file_size > MAX_UNCOMPRESSED:
                raise ValueError("ZIP entry exceeds uncompressed limit")
            if item.file_size and item.file_size / max(item.compress_size, 1) > 1000:
                raise ValueError("Suspicious compression ratio")
            if path.lower().endswith(".csv") and not item.is_dir():
                candidates.append(item)
        if not candidates:
            raise ValueError("No CSV member in ZIP")
        target = sorted(candidates, key=lambda x: x.filename)[0]
        with archive.open(target) as member:
            header = get_header(member)
        return {"header": header, "archive": True, "member": target.filename}


def fetch_to_temp(url, destination):
    allowed_url(url)
    headers = {"User-Agent": "Mozilla/5.0 (compatible; PowerMap/0.4)", "Accept": "text/csv,application/zip,application/octet-stream"}
    request = urllib.request.Request(url, headers=headers)
    opener = urllib.request.build_opener(NoRedirect)
    size = 0
    with opener.open(request, timeout=70) as response:
        content_length = int(response.headers.get("Content-Length") or 0)
        if content_length > MAX_DOWNLOAD:
            raise ValueError("Download too large (Content-Length)")
        with open(destination, "wb") as target:
            while True:
                chunk = response.read(65536)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_DOWNLOAD:
                    raise ValueError("Download too large")
                target.write(chunk)
    if size == 0:
        raise ValueError("Empty download")
    return size


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "build/anac-resources.json")
    catalog = json.loads(path.read_text())
    selections = pick_resources(catalog)
    results = []
    for item in selections:
        resource = item["resource"]
        with tempfile.TemporaryDirectory(prefix="power-map-anac-") as tmp:
            name = os.path.join(tmp, "input")
            try:
                size = fetch_to_temp(resource["url"], name)
                parsed = inspect_archive(name, resource.get("isZip", False))
                results.append({"package": item["package"], "status": "ok", "name": resource.get("name"),
                                "sourceUrl": resource["url"], "downloadedBytes": size, **parsed})
            except Exception as exc:
                results.append({"package": item["package"], "status": "error", "name": resource.get("name"),
                                "error": str(exc)})
    report = {"catalog": str(path), "selected": len(selections), "results": results, "mode": "metadata-and-header-only",
              "warning": "Not validated for graph publication: no rows or links are imported."}
    Path("build").mkdir(exist_ok=True)
    Path("build/anac-intake.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not selections or all(x["status"] != "ok" for x in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
