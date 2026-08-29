-- Read-only API policies for Telegram/public practice clients.
-- Only metadata and published content with explicit reuse rights are exposed.

grant select on table public.exam_bodies, public.exam_subjects, public.exam_body_subjects, public.exam_topics,
  public.exam_institutions, public.exam_papers, public.exam_sources, public.exam_catalogue_coverage
  to anon, authenticated;

grant select on table public.exam_questions, public.exam_question_choices, public.exam_passages, public.exam_question_assets
  to anon, authenticated;

create policy "public read exam bodies" on public.exam_bodies for select to anon, authenticated using (true);
create policy "public read subjects" on public.exam_subjects for select to anon, authenticated using (true);
create policy "public read body subjects" on public.exam_body_subjects for select to anon, authenticated using (true);
create policy "public read topics" on public.exam_topics for select to anon, authenticated using (true);
create policy "public read institutions" on public.exam_institutions for select to anon, authenticated using (true);
create policy "public read paper metadata" on public.exam_papers for select to anon, authenticated using (true);
create policy "public read source metadata" on public.exam_sources for select to anon, authenticated using (true);
create policy "public read coverage metadata" on public.exam_catalogue_coverage for select to anon, authenticated using (true);

create policy "public read lawful published questions" on public.exam_questions
for select to anon, authenticated
using (
  content_status = 'published'
  and rights_status in ('licensed','public_domain','user_owned','original_generated')
);

create policy "public read choices for lawful published questions" on public.exam_question_choices
for select to anon, authenticated
using (
  exists (
    select 1 from public.exam_questions q
    where q.id = exam_question_choices.question_id
      and q.content_status = 'published'
      and q.rights_status in ('licensed','public_domain','user_owned','original_generated')
  )
);

create policy "public read lawful published passages" on public.exam_passages
for select to anon, authenticated
using (
  content_status = 'published'
  and rights_status in ('licensed','public_domain','user_owned','original_generated')
);

create policy "public read lawful question assets" on public.exam_question_assets
for select to anon, authenticated
using (
  rights_status in ('licensed','public_domain','user_owned','original_generated')
  and (
    question_id is null
    or exists (
      select 1 from public.exam_questions q
      where q.id = exam_question_assets.question_id
        and q.content_status = 'published'
        and q.rights_status in ('licensed','public_domain','user_owned','original_generated')
    )
  )
);

grant execute on function public.exam_get_random_question(text,text,smallint,text) to anon, authenticated;
grant execute on function public.exam_get_question_choices(uuid) to anon, authenticated;
grant execute on function public.exam_search_questions_keyword(text,text,uuid,smallint,integer) to anon, authenticated;
