-- Exam Bank schema for JAMB / WAEC / NECO
-- Supabase/Postgres compatible. Designed for server-side access from a bot backend.

create extension if not exists vector with schema extensions;

do $$ begin
  create type public.exam_rights_status as enum ('unknown','all_rights_reserved','licensed','public_domain','user_owned','original_generated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_ingest_policy as enum ('metadata_only','full_text_allowed','blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_content_status as enum ('draft','review','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_question_format as enum ('objective','theory','practical','oral','passage','mixed');
exception when duplicate_object then null; end $$;

create table if not exists public.exam_bodies (
  slug text primary key check (slug ~ '^[a-z0-9_-]+$'),
  name text not null unique,
  country_code text not null default 'NG',
  official_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_sources (
  id uuid primary key default gen_random_uuid(),
  exam_body_slug text references public.exam_bodies(slug) on delete cascade,
  source_name text not null,
  source_url text not null unique,
  source_kind text not null default 'official_web',
  rights_status public.exam_rights_status not null default 'unknown',
  ingest_policy public.exam_ingest_policy not null default 'metadata_only',
  access_notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.exam_sources(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  error_summary text,
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]+$'),
  name text not null,
  normalized_name text not null,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.exam_body_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_body_slug text not null references public.exam_bodies(slug) on delete cascade,
  subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  official_subject_name text,
  official_subject_code text,
  official_url text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  unique (exam_body_slug, subject_id)
);

create table if not exists public.exam_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  parent_topic_id uuid references public.exam_topics(id) on delete set null,
  slug text not null,
  name text not null,
  syllabus_ref text,
  sort_order integer,
  unique(subject_id, slug)
);

create table if not exists public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  exam_body_slug text not null references public.exam_bodies(slug) on delete cascade,
  subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  source_id uuid references public.exam_sources(id) on delete set null,
  exam_name text not null,
  exam_type text,
  series text,
  year smallint check (year between 1900 and 2100),
  paper_code text,
  paper_number text,
  paper_title text,
  format public.exam_question_format not null default 'mixed',
  source_url text,
  rights_status public.exam_rights_status not null default 'unknown',
  ingest_policy public.exam_ingest_policy not null default 'metadata_only',
  question_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_body_slug, subject_id, year, exam_name, series, paper_number, source_url)
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.exam_papers(id) on delete set null,
  exam_body_slug text not null references public.exam_bodies(slug) on delete restrict,
  subject_id uuid not null references public.exam_subjects(id) on delete restrict,
  topic_id uuid references public.exam_topics(id) on delete set null,
  source_id uuid references public.exam_sources(id) on delete set null,
  source_url text,
  source_question_ref text,
  year smallint check (year between 1900 and 2100),
  question_number text,
  section text,
  format public.exam_question_format not null default 'objective',
  stem text,
  stem_markdown text,
  answer_text text,
  explanation text,
  marks numeric(8,2),
  difficulty smallint check (difficulty between 1 and 5),
  rights_status public.exam_rights_status not null default 'unknown',
  content_status public.exam_content_status not null default 'draft',
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as (to_tsvector('english', coalesce(stem,'') || ' ' || coalesce(explanation,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rights_status in ('licensed','public_domain','user_owned','original_generated') or stem is null)
);

create unique index if not exists exam_questions_source_ref_uidx on public.exam_questions(source_id, source_question_ref) where source_id is not null and source_question_ref is not null;
create unique index if not exists exam_questions_content_hash_uidx on public.exam_questions(content_hash) where content_hash is not null;
create index if not exists exam_questions_lookup_idx on public.exam_questions(exam_body_slug, subject_id, year, content_status);
create index if not exists exam_questions_search_gin on public.exam_questions using gin(search_document);

create table if not exists public.exam_question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exam_questions(id) on delete cascade,
  label text not null,
  choice_text text,
  choice_markdown text,
  is_correct boolean,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  unique(question_id, label)
);

create or replace function public.exam_enforce_choice_rights()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_rights public.exam_rights_status;
begin
  select rights_status into v_rights from public.exam_questions where id = new.question_id;
  if v_rights not in ('licensed','public_domain','user_owned','original_generated') and (new.choice_text is not null or new.choice_markdown is not null) then
    raise exception 'Choice content cannot be stored for rights_status %', v_rights;
  end if;
  return new;
end;
$$;

drop trigger if exists exam_question_choices_rights_guard on public.exam_question_choices;
create trigger exam_question_choices_rights_guard before insert or update on public.exam_question_choices for each row execute function public.exam_enforce_choice_rights();

create table if not exists public.exam_question_assets (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.exam_questions(id) on delete cascade,
  paper_id uuid references public.exam_papers(id) on delete cascade,
  asset_type text not null check (asset_type in ('diagram','image','graph','table','audio','document','other')),
  storage_bucket text,
  storage_path text,
  source_url text,
  alt_text text,
  rights_status public.exam_rights_status not null default 'unknown',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (storage_path is not null or source_url is not null),
  check (rights_status in ('licensed','public_domain','user_owned','original_generated') or storage_path is null)
);

create table if not exists public.exam_question_embeddings (
  question_id uuid primary key references public.exam_questions(id) on delete cascade,
  model text not null default 'Supabase/gte-small',
  dimensions integer not null default 384 check (dimensions = 384),
  embedding extensions.vector(384) not null,
  embedded_at timestamptz not null default now()
);

create index if not exists exam_question_embeddings_hnsw on public.exam_question_embeddings using hnsw (embedding vector_cosine_ops);

create table if not exists public.exam_user_submissions (
  id uuid primary key default gen_random_uuid(),
  external_user_id text,
  platform text not null default 'telegram',
  exam_body_slug text references public.exam_bodies(slug) on delete set null,
  subject_id uuid references public.exam_subjects(id) on delete set null,
  claimed_year smallint,
  raw_text text,
  source_evidence_url text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','duplicate')),
  rights_attestation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.exam_question_attempts (
  id bigint generated always as identity primary key,
  external_user_id text not null,
  question_id uuid not null references public.exam_questions(id) on delete cascade,
  selected_label text,
  is_correct boolean,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists exam_attempts_user_time_idx on public.exam_question_attempts(external_user_id, created_at desc);

create or replace function public.exam_search_questions_keyword(p_query text,p_exam_body_slug text default null,p_subject_id uuid default null,p_year smallint default null,p_limit integer default 20)
returns table (id uuid,exam_body_slug text,subject_id uuid,year smallint,question_number text,stem text,answer_text text,explanation text,rank real)
language sql stable security invoker set search_path = public as $$
  select q.id, q.exam_body_slug, q.subject_id, q.year, q.question_number, q.stem, q.answer_text, q.explanation,
         ts_rank(q.search_document, websearch_to_tsquery('english', p_query)) as rank
  from public.exam_questions q
  where q.content_status = 'published'
    and q.rights_status in ('licensed','public_domain','user_owned','original_generated')
    and q.search_document @@ websearch_to_tsquery('english', p_query)
    and (p_exam_body_slug is null or q.exam_body_slug = p_exam_body_slug)
    and (p_subject_id is null or q.subject_id = p_subject_id)
    and (p_year is null or q.year = p_year)
  order by rank desc
  limit greatest(1, least(coalesce(p_limit,20), 100));
$$;

create or replace function public.exam_match_questions_vector(p_embedding extensions.vector(384),p_exam_body_slug text default null,p_subject_id uuid default null,p_limit integer default 12)
returns table (question_id uuid, similarity double precision)
language sql stable security invoker set search_path = public, extensions as $$
  select e.question_id, 1 - (e.embedding <=> p_embedding) as similarity
  from public.exam_question_embeddings e
  join public.exam_questions q on q.id = e.question_id
  where q.content_status = 'published'
    and q.rights_status in ('licensed','public_domain','user_owned','original_generated')
    and (p_exam_body_slug is null or q.exam_body_slug = p_exam_body_slug)
    and (p_subject_id is null or q.subject_id = p_subject_id)
  order by e.embedding <=> p_embedding
  limit greatest(1, least(coalesce(p_limit,12), 100));
$$;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename like 'exam_%'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', r.tablename);
    execute format('grant select, insert, update, delete on table public.%I to service_role', r.tablename);
  end loop;
end $$;

grant execute on function public.exam_search_questions_keyword(text,text,uuid,smallint,integer) to service_role;
grant execute on function public.exam_match_questions_vector(extensions.vector,text,uuid,integer) to service_role;
revoke all on function public.exam_search_questions_keyword(text,text,uuid,smallint,integer) from anon, authenticated;
revoke all on function public.exam_match_questions_vector(extensions.vector,text,uuid,integer) from anon, authenticated;
grant usage, select on all sequences in schema public to service_role;

insert into public.exam_bodies(slug,name,country_code,official_url) values
  ('jamb','Joint Admissions and Matriculation Board','NG','https://www.jamb.gov.ng/'),
  ('waec','West African Examinations Council (Nigeria)','NG','https://www.waecnigeria.org/'),
  ('neco','National Examinations Council','NG','https://neco.gov.ng/')
on conflict (slug) do update set name=excluded.name, official_url=excluded.official_url;

insert into public.exam_sources(exam_body_slug,source_name,source_url,source_kind,rights_status,ingest_policy,access_notes)
values
  ('waec','WAEC e-Learning','https://waeconline.org.ng/e-learning/','official_web','all_rights_reserved','metadata_only','Public subject/year/paper archive; pages state all rights reserved. Index metadata and links only unless separately licensed.'),
  ('jamb','JAMB main / IBASS','https://www.jamb.gov.ng/','official_web','all_rights_reserved','metadata_only','Use for official syllabus/brochure metadata and links.'),
  ('jamb','JAMB LMS','https://learn.jamb.gov.ng/','official_web','all_rights_reserved','blocked','Login-protected learning portal. Do not scrape protected content.'),
  ('neco','NECO official website','https://neco.gov.ng/','official_web','all_rights_reserved','metadata_only','Use public timetables/guidelines for subject and paper metadata.'),
  ('neco','NECO practice exam','https://practice-exam.neco.gov.ng/','official_web','all_rights_reserved','blocked','Registration/login-gated practice portal. Do not scrape protected content.')
on conflict (source_url) do update set rights_status=excluded.rights_status, ingest_policy=excluded.ingest_policy, access_notes=excluded.access_notes;

with jamb_subject_seed(name, slug, normalized_name, aliases) as (
  values
    ('Agriculture','agriculture','agriculture',array['Agricultural Science']::text[]),
    ('Arabic','arabic','arabic','{}'::text[]),('Art','art','art',array['Fine Art']::text[]),('Biology','biology','biology','{}'::text[]),
    ('Chemistry','chemistry','chemistry','{}'::text[]),('Christian Religious Studies','christian-religious-studies','christian religious studies',array['CRS','CRK']::text[]),
    ('Commerce','commerce','commerce','{}'::text[]),('Economics','economics','economics','{}'::text[]),('French','french','french','{}'::text[]),
    ('Geography','geography','geography','{}'::text[]),('Government','government','government','{}'::text[]),('Hausa','hausa','hausa','{}'::text[]),
    ('History','history','history','{}'::text[]),('Home Economics','home-economics','home economics','{}'::text[]),('Igbo','igbo','igbo','{}'::text[]),
    ('Islamic Studies','islamic-studies','islamic studies',array['IRS','IRK']::text[]),('Literature in English','literature-in-english','literature in english',array['Literature']::text[]),
    ('Mathematics','mathematics','mathematics','{}'::text[]),('Music','music','music','{}'::text[]),('Physics','physics','physics','{}'::text[]),
    ('Principles of Account','principles-of-account','principles of account',array['Principle of Accounts','Accounting']::text[]),
    ('Use of English','use-of-english','use of english',array['English Language']::text[]),('Yoruba','yoruba','yoruba','{}'::text[]),
    ('Computer Studies','computer-studies','computer studies','{}'::text[]),('Physical and Health Education','physical-and-health-education','physical and health education',array['PHE','Physical Health Education']::text[])
)
insert into public.exam_subjects(name, slug, normalized_name, aliases)
select name, slug, normalized_name, aliases from jamb_subject_seed
on conflict (slug) do update set name=excluded.name, normalized_name=excluded.normalized_name, aliases=excluded.aliases;

insert into public.exam_body_subjects(exam_body_slug, subject_id, official_subject_name)
select 'jamb', s.id, s.name from public.exam_subjects s
where s.slug in ('agriculture','arabic','art','biology','chemistry','christian-religious-studies','commerce','economics','french','geography','government','hausa','history','home-economics','igbo','islamic-studies','literature-in-english','mathematics','music','physics','principles-of-account','use-of-english','yoruba','computer-studies','physical-and-health-education')
on conflict (exam_body_slug, subject_id) do update set official_subject_name=excluded.official_subject_name;
