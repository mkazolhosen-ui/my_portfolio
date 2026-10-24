-- CYBER // REALITY — Stage 5B: atomic reordering for skill groups and contact links.
-- SECURITY INVOKER: runs with the caller's privileges, so RLS still applies.
-- Each returns the number of rows actually updated, so the app can detect a silent RLS block.

create or replace function public.reorder_skill_groups(ids uuid[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  with moved as (
    update public.skill_groups p
    set sort_order = t.ord::int * 10
    from unnest(ids) with ordinality as t(id, ord)
    where p.id = t.id
    returning 1
  )
  select count(*)::int from moved;
$$;

create or replace function public.reorder_contact_links(ids uuid[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  with moved as (
    update public.contact_links p
    set sort_order = t.ord::int * 10
    from unnest(ids) with ordinality as t(id, ord)
    where p.id = t.id
    returning 1
  )
  select count(*)::int from moved;
$$;

revoke all on function public.reorder_skill_groups(uuid[]) from public;
revoke all on function public.reorder_skill_groups(uuid[]) from anon;
grant execute on function public.reorder_skill_groups(uuid[]) to authenticated;

revoke all on function public.reorder_contact_links(uuid[]) from public;
revoke all on function public.reorder_contact_links(uuid[]) from anon;
grant execute on function public.reorder_contact_links(uuid[]) to authenticated;