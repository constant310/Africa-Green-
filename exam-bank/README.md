# JAMB / WAEC / NECO / Post-UTME Exam Bank

A Supabase/Postgres schema and ingestion toolkit for the Telegram exam bot. The design supports JAMB, WAEC, NECO and institution-specific Post-UTME question banks with provenance, passages, diagrams, full-text search and vector retrieval.

## What it stores
- Exam bodies, institutions, subjects, official subject codes/URLs
- Exam sessions, years, series and papers
- Question text, A-E choices, answers and explanations
- Shared passages/comprehension blocks
- Diagrams/images/audio/documents via question assets
- Topic taxonomy
- Full-text search and 384-dimension pgvector embeddings
- User-submitted questions and bot attempt analytics
- Source provenance and ingestion logs

## Content rights rule
Official exam material can be indexed by metadata/source URL when reuse rights are not established. Full question text/assets are stored only when `rights_status` is one of:
- `licensed`
- `public_domain`
- `user_owned`
- `original_generated`

This lets the catalogue track every discovered year/paper without pretending protected material has been licensed.

## Supabase deployment
1. Use a dedicated Supabase project for the exam bank.
2. Apply `migrations/001_exam_bank_schema.sql`.
3. Apply `migrations/002_post_utme_and_passages.sql`.
4. Keep the service-role/secret key only in trusted server environments.
5. Run `scripts/index_official_sources.py waec` to collect allowed WAEC metadata/links.
6. Use `scripts/import_licensed_questions.py` for licensed, user-owned, public-domain or original question banks.

## Telegram bot integration
The bot should query Supabase first by exam body + subject + year + paper/question number. If no stored question exists it can fall back to the current provider/AI flow. This keeps responses fast while the bank grows.

Recommended environment variables for the bot backend:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Retrieval strategy
1. Exact indexed lookup for exam body/subject/year/question number.
2. Full-text search for user wording.
3. pgvector semantic retrieval when needed.
4. AI only for explanation/reasoning or when no stored answer is available.

## Diagrams and media
Question assets are represented separately so one question can have several diagrams, graphs, tables or images. Store only assets whose reuse rights are known; otherwise keep the official source URL as metadata.
