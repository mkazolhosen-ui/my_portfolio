-- CYBER // REALITY — Stage 4: atomic reordering for projects.
-- SECURITY INVOKER: runs with the caller's privileges, so RLS still applies.
-- A non-admin (or visitor) can call it but cannot change any row.
-- Returns the number of rows actually updated so the app can detect a silent RLS block.

create or replace function public.reorder_projects(ids uuid[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  with moved as (
    update public.projects p
    set sort_order = t.ord::int * 10
    from unnest(ids) with ordinality as t(id, ord)
    where p.id = t.id
    returning 1
  )
  select count(*)::int from moved;
$$;

revoke all on function public.reorder_projects(uuid[]) from public;
revoke all on function public.reorder_projects(uuid[]) from anon;
grant execute on function public.reorder_projects(uuid[]) to authenticated;