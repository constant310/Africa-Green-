-- Internal helper for idempotently loading original practice questions.
-- This function is intentionally restricted to service_role.

create or replace function public.exam_seed_original_practice_questions(
  p_exam_body_slug text,
  p_exam_name text,
  p_year smallint,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_subject_id uuid;
  v_paper_id uuid;
  v_question_id uuid;
  v_slug text;
  v_qno text;
  v_label text;
  v_idx integer;
  v_inserted integer := 0;
begin
  if p_exam_body_slug not in ('jamb','waec','neco','post-utme') then
    raise exception 'Unsupported exam body';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_slug := nullif(v_item->>'subject_slug','');
    v_qno := coalesce(nullif(v_item->>'question_number',''),'1');

    select id into v_subject_id from public.exam_subjects where slug = v_slug;
    if v_subject_id is null then
      raise exception 'Unknown subject slug: %', v_slug;
    end if;

    select id into v_paper_id
    from public.exam_papers
    where exam_body_slug = p_exam_body_slug
      and subject_id = v_subject_id
      and exam_name = p_exam_name
      and year = p_year
    order by created_at
    limit 1;

    if v_paper_id is null then
      insert into public.exam_papers(
        exam_body_slug, subject_id, exam_name, exam_type, year,
        paper_number, paper_title, format, rights_status,
        ingest_policy, question_count, metadata
      ) values (
        p_exam_body_slug, v_subject_id, p_exam_name, 'practice', p_year,
        'PRACTICE', p_exam_name || ' ' || p_year, 'objective',
        'original_generated', 'full_text_allowed', 1,
        jsonb_build_object('generated', true, 'historical_past_question', false)
      ) returning id into v_paper_id;
    end if;

    select id into v_question_id
    from public.exam_questions
    where content_hash = 'orig-' || p_exam_body_slug || '-' || p_year || '-' || v_slug || '-' || v_qno
    limit 1;

    if v_question_id is null then
      insert into public.exam_questions(
        paper_id, exam_body_slug, subject_id, year, question_number,
        format, stem, answer_text, explanation, rights_status,
        content_status, content_hash, metadata
      ) values (
        v_paper_id, p_exam_body_slug, v_subject_id, p_year, v_qno,
        'objective', v_item->>'stem', upper(v_item->>'answer_label'),
        v_item->>'explanation', 'original_generated', 'published',
        'orig-' || p_exam_body_slug || '-' || p_year || '-' || v_slug || '-' || v_qno,
        jsonb_build_object(
          'generated', true,
          'historical_past_question', false,
          'answer_label', upper(v_item->>'answer_label')
        )
      ) returning id into v_question_id;
      v_inserted := v_inserted + 1;
    else
      update public.exam_questions
      set stem = v_item->>'stem',
          answer_text = upper(v_item->>'answer_label'),
          explanation = v_item->>'explanation',
          content_status = 'published',
          rights_status = 'original_generated',
          updated_at = now(),
          metadata = jsonb_build_object(
            'generated', true,
            'historical_past_question', false,
            'answer_label', upper(v_item->>'answer_label')
          )
      where id = v_question_id;
    end if;

    delete from public.exam_question_choices where question_id = v_question_id;
    v_idx := 0;
    for v_label in select value#>>'{}' from jsonb_array_elements(v_item->'options')
    loop
      v_idx := v_idx + 1;
      insert into public.exam_question_choices(
        question_id, label, choice_text, is_correct, sort_order
      ) values (
        v_question_id,
        chr(64 + v_idx),
        v_label,
        chr(64 + v_idx) = upper(v_item->>'answer_label'),
        v_idx
      );
    end loop;

    update public.exam_papers
    set question_count = (
      select count(*)
      from public.exam_questions
      where paper_id = v_paper_id and content_status = 'published'
    )
    where id = v_paper_id;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'processed', jsonb_array_length(p_items)
  );
end;
$$;

revoke all on function public.exam_seed_original_practice_questions(text,text,smallint,jsonb)
from public, anon, authenticated;
grant execute on function public.exam_seed_original_practice_questions(text,text,smallint,jsonb)
to service_role;
