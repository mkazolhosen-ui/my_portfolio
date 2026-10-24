-- CYBER // REALITY — Stage 1: schema, validation, grants, Row Level Security.
-- Run ONCE in Supabase Dashboard → SQL Editor.

-- ============================================================
-- 1. Admin allowlist
-- ============================================================
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with NO policies = no API role can read or write this table.
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

-- ============================================================
-- 2. Helper functions
-- ============================================================

-- True only if the caller's user id is in admin_users.
-- SECURITY DEFINER lets it read admin_users even though API roles cannot.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- Validation helper: array size limit, and every element non-null, non-blank and short enough.
create or replace function public.text_array_ok(arr text[], max_items int, max_len int)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select arr is not null
     and cardinality(arr) <= max_items
     and coalesce(
           (select bool_and(x is not null and char_length(btrim(x)) between 1 and max_len)
            from unnest(arr) as x),
           true
         );
$$;

-- Keeps updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 3. Content tables
-- ============================================================

-- Exactly one row: "id boolean primary key check (id)" allows only the value true.
create table public.site_content (
  id               boolean primary key default true check (id),
  site_name        text not null default '' check (char_length(site_name) <= 100),
  eyebrow          text not null default '' check (char_length(eyebrow) <= 60),
  hero_name        text[] not null
                   check (cardinality(hero_name) >= 1 and public.text_array_ok(hero_name, 6, 30)),
  tagline          text not null default '' check (char_length(tagline) <= 200),
  intro            text not null default '' check (char_length(intro) <= 500),
  about_paragraphs text[] not null default '{}'
                   check (public.text_array_ok(about_paragraphs, 10, 1500)),
  about_focus      text[] not null default '{}'
                   check (public.text_array_ok(about_focus, 12, 60)),
  contact_heading  text not null default '' check (char_length(contact_heading) <= 120),
  contact_message  text not null default '' check (char_length(contact_message) <= 500),
  updated_at       timestamptz not null default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  kind        text not null default '' check (char_length(kind) <= 60),
  description text not null default '' check (char_length(description) <= 1200),
  tags        text[] not null default '{}' check (public.text_array_ok(tags, 8, 30)),
  live_url    text not null default ''
              check (live_url = '' or (char_length(live_url) <= 2048
                     and live_url ~* '^https?://[^[:space:]]+$')),
  repo_url    text not null default ''
              check (repo_url = '' or (char_length(repo_url) <= 2048
                     and repo_url ~* '^https?://[^[:space:]]+$')),
  sort_order  integer not null default 0,
  published   boolean not null default false,   -- draft-first: new rows are private
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index projects_public_order_idx on public.projects (sort_order) where published;

create table public.skill_groups (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  items       text[] not null default '{}' check (public.text_array_ok(items, 20, 60)),
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index skill_groups_public_order_idx on public.skill_groups (sort_order) where published;

create table public.contact_links (
  id          uuid primary key default gen_random_uuid(),
  label       text not null check (char_length(btrim(label)) between 1 and 40),
  display     text not null default '' check (char_length(display) <= 120),
  -- Empty, http(s) or mailto only. Blocks javascript: and data: URLs.
  href        text not null default ''
              check (href = '' or (char_length(href) <= 2048
                     and href ~* '^(https?://|mailto:)[^[:space:]]+$')),
  sort_order  integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index contact_links_public_order_idx on public.contact_links (sort_order) where published;

-- updated_at triggers
create trigger set_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.skill_groups
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.contact_links
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. Table privileges (least privilege)
-- ============================================================
revoke all on table
  public.site_content, public.projects, public.skill_groups, public.contact_links
  from anon, authenticated;

-- Visitors and logged-in users may attempt SELECT (RLS then filters rows).
grant select on table
  public.site_content, public.projects, public.skill_groups, public.contact_links
  to anon, authenticated;

-- Only the authenticated role may attempt writes (RLS then requires is_admin()).
grant insert, update, delete on table
  public.projects, public.skill_groups, public.contact_links
  to authenticated;

-- site_content is a singleton: update only, never insert or delete.
grant update on table public.site_content to authenticated;

-- ============================================================
-- 5. Row Level Security
-- ============================================================
alter table public.site_content enable row level security;
alter table public.projects     enable row level security;
alter table public.skill_groups enable row level security;
alter table public.contact_links enable row level security;

-- site_content
create policy "Public can read site content"
  on public.site_content for select
  to anon, authenticated
  using (true);

create policy "Admin can update site content"
  on public.site_content for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- projects
create policy "Public can read published projects"
  on public.projects for select
  to anon, authenticated
  using (published);

create policy "Admin has full access to projects"
  on public.projects for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- skill_groups
create policy "Public can read published skill groups"
  on public.skill_groups for select
  to anon, authenticated
  using (published);

create policy "Admin has full access to skill groups"
  on public.skill_groups for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- contact_links
create policy "Public can read published contact links"
  on public.contact_links for select
  to anon, authenticated
  using (published);

create policy "Admin has full access to contact links"
  on public.contact_links for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));