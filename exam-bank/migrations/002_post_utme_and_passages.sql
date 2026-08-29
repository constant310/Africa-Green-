-- Extend the exam bank for institution-specific Post-UTME, shared passages and completeness tracking.

insert into public.exam_bodies(slug,name,country_code,official_url)
values ('post-utme','Institutional Post-UTME / Admission Screening','NG','https://www.nuc.edu.ng/')
on conflict (slug) do update set name=excluded.name;

create table if not exists public.exam_institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]+$'),
  name text not null,
  short_name text,
  official_url text,
  admissions_url text,
  state text,
  country_code text not null default 'NG',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exam_papers add column if not exists institution_id uuid references public.exam_institutions(id) on delete set null;
alter table public.exam_questions add column if not exists institution_id uuid references public.exam_institutions(id) on delete set null;
alter table public.exam_user_submissions add column if not exists institution_id uuid references public.exam_institutions(id) on delete set null;

create index if not exists exam_papers_institution_idx on public.exam_papers(institution_id, year, subject_id);
create index if not exists exam_questions_institution_idx on public.exam_questions(institution_id, subject_id, year, content_status);

create table if not exists public.exam_passages (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references public.exam_papers(id) on delete cascade,
  exam_body_slug text not null references public.exam_bodies(slug) on delete restrict,
  institution_id uuid references public.exam_institutions(id) on delete set null,
  subject_id uuid references public.exam_subjects(id) on delete set null,
  year smallint check (year between 1900 and 2100),
  title text,
  passage_number text,
  content text,
  content_markdown text,
  source_id uuid references public.exam_sources(id) on delete set null,
  source_url text,
  rights_status public.exam_rights_status not null default 'unknown',
  content_status public.exam_content_status not null default 'draft',
  content_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rights_status in ('licensed','public_domain','user_owned','original_generated') or content is null)
);

alter table public.exam_questions add column if not exists passage_id uuid references public.exam_passages(id) on delete set null;
create index if not exists exam_questions_passage_idx on public.exam_questions(passage_id) where passage_id is not null;

create table if not exists public.exam_catalogue_coverage (
  id uuid primary key default gen_random_uuid(),
  exam_body_slug text not null references public.exam_bodies(slug) on delete cascade,
  institution_id uuid references public.exam_institutions(id) on delete cascade,
  subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  year smallint not null check (year between 1900 and 2100),
  exam_name text,
  series text,
  expected_questions integer check (expected_questions is null or expected_questions >= 0),
  acquired_questions integer not null default 0 check (acquired_questions >= 0),
  verified_questions integer not null default 0 check (verified_questions >= 0),
  missing_assets integer not null default 0 check (missing_assets >= 0),
  status text not null default 'catalogued' check (status in ('catalogued','partial','complete','unavailable','rights_blocked')),
  source_url text,
  notes text,
  last_checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists exam_catalogue_coverage_unique_idx
on public.exam_catalogue_coverage(
  exam_body_slug,
  coalesce(institution_id, '00000000-0000-0000-0000-000000000000'::uuid),
  subject_id,
  year,
  coalesce(exam_name,''),
  coalesce(series,'')
);

create or replace function public.exam_get_random_question(
  p_exam_body_slug text,
  p_subject_slug text,
  p_year smallint default null,
  p_institution_slug text default null
)
returns table (
  id uuid,
  exam_body_slug text,
  institution_slug text,
  subject_slug text,
  year smallint,
  question_number text,
  stem text,
  answer_text text,
  explanation text
)
language sql volatile security invoker set search_path = public as $$
  select q.id,
         q.exam_body_slug,
         i.slug,
         s.slug,
         q.year,
         q.question_number,
         q.stem,
         q.answer_text,
         q.explanation
  from public.exam_questions q
  join public.exam_subjects s on s.id = q.subject_id
  left join public.exam_institutions i on i.id = q.institution_id
  where q.exam_body_slug = p_exam_body_slug
    and s.slug = p_subject_slug
    and q.content_status = 'published'
    and q.rights_status in ('licensed','public_domain','user_owned','original_generated')
    and (p_year is null or q.year = p_year)
    and (p_institution_slug is null or i.slug = p_institution_slug)
  order by random()
  limit 1;
$$;

create or replace function public.exam_get_question_choices(p_question_id uuid)
returns table (label text, choice_text text, choice_markdown text, is_correct boolean, sort_order integer)
language sql stable security invoker set search_path = public as $$
  select c.label, c.choice_text, c.choice_markdown, c.is_correct, c.sort_order
  from public.exam_question_choices c
  join public.exam_questions q on q.id = c.question_id
  where c.question_id = p_question_id
    and q.content_status = 'published'
    and q.rights_status in ('licensed','public_domain','user_owned','original_generated')
  order by c.sort_order, c.label;
$$;

alter table public.exam_institutions enable row level security;
alter table public.exam_passages enable row level security;
alter table public.exam_catalogue_coverage enable row level security;
revoke all on table public.exam_institutions, public.exam_passages, public.exam_catalogue_coverage from anon, authenticated;
grant select, insert, update, delete on table public.exam_institutions, public.exam_passages, public.exam_catalogue_coverage to service_role;
grant execute on function public.exam_get_random_question(text,text,smallint,text) to service_role;
grant execute on function public.exam_get_question_choices(uuid) to service_role;
revoke all on function public.exam_get_random_question(text,text,smallint,text) from anon, authenticated;
revoke all on function public.exam_get_question_choices(uuid) from anon, authenticated;
