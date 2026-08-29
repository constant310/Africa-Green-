"""Copyright-safe metadata indexer for the exam bank.

This script indexes metadata and official URLs only from sources whose full question
content is not licensed for copying. It deliberately does not scrape login-protected
JAMB/NECO practice content or mirror copyrighted question bodies.

Environment:
  SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...
"""
from __future__ import annotations
import hashlib
import os
import re
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from supabase import create_client

WAEC_ROOT = "https://waeconline.org.ng/e-learning/"


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return value or hashlib.sha1(value.encode()).hexdigest()[:12]


def client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def get(url: str) -> BeautifulSoup:
    response = requests.get(url, timeout=30, headers={"User-Agent": "ExamBankMetadataIndexer/1.0"})
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def ensure_subject(db, name: str):
    slug = slugify(name)
    db.table("exam_subjects").upsert({
        "slug": slug,
        "name": name.strip(),
        "normalized_name": re.sub(r"\s+", " ", name.strip().lower()),
    }, on_conflict="slug").execute()
    return db.table("exam_subjects").select("id").eq("slug", slug).single().execute().data["id"]


def index_waec():
    db = client()
    source = db.table("exam_sources").select("id").eq("source_url", WAEC_ROOT).single().execute()
    source_id = source.data["id"]
    run = db.table("exam_ingestion_runs").insert({"source_id": source_id}).execute().data[0]
    run_id = run["id"]
    subjects_seen = papers_inserted = papers_updated = 0
    try:
        root = get(WAEC_ROOT)
        links = []
        for anchor in root.find_all("a", href=True):
            href = urljoin(WAEC_ROOT, anchor["href"])
            name = " ".join(anchor.get_text(" ", strip=True).split())
            if name and "/e-learning/" in href and "main.html" in href.lower():
                links.append((name, href))

        for subject_url, subject_name in dict((url, name) for name, url in links).items():
            subjects_seen += 1
            subject_id = ensure_subject(db, subject_name)
            db.table("exam_body_subjects").upsert({
                "exam_body_slug": "waec",
                "subject_id": subject_id,
                "official_subject_name": subject_name,
                "official_url": subject_url,
            }, on_conflict="exam_body_slug,subject_id").execute()

            page = get(subject_url)
            for anchor in page.find_all("a", href=True):
                label = " ".join(anchor.get_text(" ", strip=True).split())
                if not re.search(r"\bPaper\s+[1-9IVX]+\b", label, flags=re.I):
                    continue
                paper_url = urljoin(subject_url, anchor["href"])
                nearby = " ".join(anchor.parent.get_text(" ", strip=True).split()) if anchor.parent else label
                year_match = re.search(r"\b(19|20)\d{2}\b", nearby)
                year = int(year_match.group()) if year_match else None
                upper = nearby.upper()
                series = "private" if "PRIVATE" in upper else "school" if ("SCHOOL" in upper or "MAY/JUN" in upper) else None
                payload = {
                    "exam_body_slug": "waec",
                    "subject_id": subject_id,
                    "source_id": source_id,
                    "exam_name": "WASSCE",
                    "exam_type": "WASSCE",
                    "series": series,
                    "year": year,
                    "paper_number": re.sub(r"^.*?Paper\s+", "", label, flags=re.I).strip(),
                    "paper_title": f"{subject_name} {label}",
                    "source_url": paper_url,
                    "rights_status": "all_rights_reserved",
                    "ingest_policy": "metadata_only",
                    "metadata": {"index_text": nearby[:500]},
                }
                existing = db.table("exam_papers").select("id").eq("source_url", paper_url).limit(1).execute().data
                if existing:
                    db.table("exam_papers").update(payload).eq("id", existing[0]["id"]).execute()
                    papers_updated += 1
                else:
                    db.table("exam_papers").insert(payload).execute()
                    papers_inserted += 1

                if year:
                    db.table("exam_catalogue_coverage").upsert({
                        "exam_body_slug": "waec",
                        "subject_id": subject_id,
                        "year": year,
                        "exam_name": "WASSCE",
                        "series": series,
                        "status": "rights_blocked",
                        "source_url": paper_url,
                        "last_checked_at": datetime.now(timezone.utc).isoformat(),
                    }, on_conflict="exam_body_slug,subject_id,year,exam_name,series").execute()

        db.table("exam_ingestion_runs").update({
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "status": "success",
            "records_seen": subjects_seen,
            "records_inserted": papers_inserted,
            "records_updated": papers_updated,
        }).eq("id", run_id).execute()
        print(f"WAEC index complete: subjects={subjects_seen}, papers_inserted={papers_inserted}, papers_updated={papers_updated}")
    except Exception as exc:
        db.table("exam_ingestion_runs").update({
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "status": "failed",
            "error_summary": str(exc)[:2000],
        }).eq("id", run_id).execute()
        raise


if __name__ == "__main__":
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "waec"
    if target == "waec":
        index_waec()
    else:
        raise SystemExit("Only WAEC public metadata indexing is automated. JAMB/NECO gated question content is intentionally not scraped.")
