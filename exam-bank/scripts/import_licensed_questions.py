"""Import licensed/public-domain/user-owned/original exam questions into Supabase.

Environment:
  SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=...

CSV columns supported:
exam_body,institution,subject,year,exam_name,series,paper_number,question_number,
format,stem,answer_text,explanation,source_url,source_question_ref,rights_status,
option_a,option_b,option_c,option_d,option_e,correct_option
"""
from __future__ import annotations
import csv
import hashlib
import os
import re
import sys
from supabase import create_client

ALLOWED = {"licensed", "public_domain", "user_owned", "original_generated"}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")


def supabase_client():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def ensure_subject(client, name: str) -> str:
    slug = slugify(name)
    client.table("exam_subjects").upsert({
        "slug": slug,
        "name": name.strip(),
        "normalized_name": re.sub(r"\s+", " ", name.strip().lower()),
    }, on_conflict="slug").execute()
    return client.table("exam_subjects").select("id").eq("slug", slug).single().execute().data["id"]


def ensure_institution(client, name: str | None):
    if not name or not name.strip():
        return None
    slug = slugify(name)
    client.table("exam_institutions").upsert({"slug": slug, "name": name.strip()}, on_conflict="slug").execute()
    return client.table("exam_institutions").select("id").eq("slug", slug).single().execute().data["id"]


def ensure_paper(client, row, subject_id: str, institution_id: str | None):
    exam_name = (row.get("exam_name") or row.get("exam_body") or "Exam").strip()
    year = int(row["year"]) if row.get("year") else None
    query = client.table("exam_papers").select("id").eq("exam_body_slug", row["exam_body"].strip().lower()).eq("subject_id", subject_id)
    if year is not None:
        query = query.eq("year", year)
    if row.get("paper_number"):
        query = query.eq("paper_number", row["paper_number"])
    existing = query.limit(1).execute().data
    if existing:
        return existing[0]["id"]
    payload = {
        "exam_body_slug": row["exam_body"].strip().lower(),
        "subject_id": subject_id,
        "institution_id": institution_id,
        "exam_name": exam_name,
        "exam_type": row.get("exam_type") or exam_name,
        "series": row.get("series") or None,
        "year": year,
        "paper_number": row.get("paper_number") or None,
        "format": row.get("format") or "mixed",
        "source_url": row.get("source_url") or None,
        "rights_status": row["rights_status"].strip(),
        "ingest_policy": "full_text_allowed",
    }
    return client.table("exam_papers").insert(payload).execute().data[0]["id"]


def main(path: str):
    client = supabase_client()
    inserted = skipped = 0
    with open(path, newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            rights = (row.get("rights_status") or "").strip()
            if rights not in ALLOWED:
                raise ValueError(f"Disallowed rights_status: {rights}")
            exam_body = (row.get("exam_body") or "").strip().lower()
            if not exam_body:
                raise ValueError("exam_body is required")
            subject_name = (row.get("subject") or "").strip()
            stem = (row.get("stem") or "").strip()
            if not subject_name or not stem:
                raise ValueError("subject and stem are required")

            subject_id = ensure_subject(client, subject_name)
            institution_id = ensure_institution(client, row.get("institution"))
            paper_id = ensure_paper(client, row, subject_id, institution_id)
            year = int(row["year"]) if row.get("year") else None
            digest_source = "|".join([exam_body, row.get("institution") or "", subject_name, str(year or ""), stem])
            digest = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()

            existing = client.table("exam_questions").select("id").eq("content_hash", digest).limit(1).execute().data
            if existing:
                skipped += 1
                continue

            question = client.table("exam_questions").insert({
                "paper_id": paper_id,
                "exam_body_slug": exam_body,
                "institution_id": institution_id,
                "subject_id": subject_id,
                "year": year,
                "question_number": row.get("question_number") or None,
                "format": row.get("format") or "objective",
                "stem": stem,
                "answer_text": row.get("answer_text") or None,
                "explanation": row.get("explanation") or None,
                "source_url": row.get("source_url") or None,
                "source_question_ref": row.get("source_question_ref") or None,
                "rights_status": rights,
                "content_status": "published",
                "content_hash": digest,
            }).execute().data[0]

            correct = (row.get("correct_option") or "").strip().upper()
            for label in "ABCDE":
                text = row.get(f"option_{label.lower()}")
                if text:
                    client.table("exam_question_choices").insert({
                        "question_id": question["id"],
                        "label": label,
                        "choice_text": text,
                        "is_correct": (label == correct) if correct else None,
                        "sort_order": ord(label) - 64,
                    }).execute()
            inserted += 1

    print(f"Import complete: inserted={inserted}, skipped_duplicates={skipped}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python import_licensed_questions.py <questions.csv>")
    main(sys.argv[1])
