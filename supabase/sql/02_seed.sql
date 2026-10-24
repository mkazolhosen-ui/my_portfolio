-- CYBER // REALITY — Stage 1 seed. Mirrors the original src/config/site.ts.
-- Safe to run once: each insert is skipped if the table already has data.

insert into public.site_content
  (id, site_name, eyebrow, hero_name, tagline, intro,
   about_paragraphs, about_focus, contact_heading, contact_message)
values (
  true,
  'Md Kazol Hosen',
  'CYBER // REALITY',
  array['MD', 'KAZOL', 'HOSEN'],
  'Exploring the space between code and reality.',
  'Computer science student exploring cybersecurity, software development, and immersive digital experiences.',
  array[
    'I am a computer science student drawn to the point where security, software, and creative technology meet.',
    'I like understanding how systems work, how they break, and how they can be made more resilient, while also building things that feel alive in the browser.'
  ],
  array['Cybersecurity fundamentals', 'Software development', 'Immersive web experiences'],
  'Let’s connect.',
  'Interested in collaborating, talking security, or sharing ideas? Reach out.'
)
on conflict (id) do nothing;

insert into public.projects
  (title, kind, description, tags, live_url, repo_url, sort_order, published)
select v.*
from (values
  ('Drawn Reality',
   'Browser Game',
   'A browser-based game project exploring interactive play and creative design. Replace this text with a short, accurate description.',
   array['Browser Game', 'Interactive'], '', '', 10, true),
  ('Cybersecurity Learning Portfolio',
   'Learning Journey',
   'A record of what I am learning in cybersecurity: notes, exercises, and write-ups. Replace this text with the specifics you want to show.',
   array['Cybersecurity', 'Learning'], '', '', 20, true),
  ('Data Preprocessing Project',
   'Data Project',
   'A project focused on cleaning and preparing data for analysis. Replace this text with what you actually built and the tools you used.',
   array['Data', 'Preprocessing'], '', '', 30, true)
) as v(title, kind, description, tags, live_url, repo_url, sort_order, published)
where not exists (select 1 from public.projects);

insert into public.skill_groups
  (title, description, items, sort_order, published)
select v.*
from (values
  ('Cybersecurity', 'Areas I am studying and exploring.',
   array['Security fundamentals', 'Learning labs and exercises'], 10, true),
  ('Software Development', 'How I build things.',
   array['TypeScript', 'React', 'Browser-based apps'], 20, true),
  ('Creative Development', 'Where code meets visuals.',
   array['Three.js', 'Shaders (GLSL)', 'Interactive experiences'], 30, true),
  ('Data', 'Working with information.',
   array['Data preprocessing'], 40, true)
) as v(title, description, items, sort_order, published)
where not exists (select 1 from public.skill_groups);

insert into public.contact_links
  (label, display, href, sort_order, published)
select v.*
from (values
  ('Email',    '', '', 10, false),
  ('GitHub',   '', '', 20, false),
  ('LinkedIn', '', '', 30, false)
) as v(label, display, href, sort_order, published)
where not exists (select 1 from public.contact_links);