# CYBER // REALITY — Project Status

**Last updated:** November 3, 2026

Status labels describe evidence in the checked-in code. A working implementation in source does not prove that a live Supabase project is configured or that a feature has been tested in a browser.

## 1. Project overview and design vision

Personal portfolio for presenting cybersecurity, software, and creative-development work. The current visual direction pairs a dark, cyan/ice-blue interface with a procedural 3D “cyber core,” ambient particles, and scroll-linked motion.

## 2. Technology stack

Verified from `package.json`, source, and configuration:

- React 19, TypeScript 5.9, Vite 8
- Three.js, React Three Fiber, and Drei
- Custom GLSL shader strings in TypeScript source
- GSAP and ScrollTrigger
- Supabase JavaScript client
- ESLint with TypeScript and React Hooks plugins

The package scripts include `dev`, `build`, `lint`, and `preview`. No test script is defined.

## 3. Application architecture

- `src/Root.tsx`: chooses the public application or lazily loaded `/admin` application.
- `src/App.tsx`, `src/components/`: public page sections, navigation, and layout.
- `src/scene/`, `src/shaders/`: React Three Fiber scene, procedural core, particle field, and shader code. The name intro lives in `src/scene/introState.ts` (shared intro status, skip controls, scroll lock), `src/scene/nameTargets.ts` (turns the hero title into target points) and `src/scene/NameAssembly.tsx` (instanced hexagon tiles with a custom physics simulation).
- `src/hooks/`: scroll choreography, hero intro, pointer input, card tilt, and reduced-motion preference.
- `src/content/`: Supabase content loading, context, types, and fallback data.
- `src/config/site.ts`: local portfolio content and data types.
- `src/admin/`: sign-in, admin routing, dashboard, editors, validation, and content APIs.
- `src/styles/`: public, scene, and admin styles.
- `src/lib/supabase.ts`: browser client initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, or absent when not configured.
- `supabase/sql/`: checked-in schema, seed, admin verification, and reorder SQL scripts.

## 4. Features and implementation status

- **Implemented (code):** Public page sections for Hero, About, Projects, Skills, and Contact; navigation and skip link.
- **Implemented (code):** Supabase-backed public content loading with a local fallback when unavailable or unsuccessful.
- **Implemented (code):** Procedural Three.js core, animated particles and shader effects, pointer response, and CSS background fallback when WebGL is unavailable.
- **Partially Implemented:** GSAP scroll-linked core poses and staggered section reveals exist; the broader planned cinematic transitions are not evidenced as complete.
- **Implemented (code):** Project cards, skill cards/constellation, and contact links. Contact supports opening a `mailto:` link and copying its address; there is no message-submission form.
- **Partially Implemented:** Reduced-motion behavior and basic keyboard/screen-reader affordances exist. A configurable accessibility-controls panel is not present.
- **Implemented (code), Needs Verification (live):** Admin sign-in, access-state UI, dashboard counts, and editors for site text, projects, skill groups, and contact links. Source includes create/edit/delete, publish toggles, and ordering operations; successful use against the deployed database has not been verified.
- **Implemented (code), Needs Verification (real devices, deployed site):** Cinematic 3D name intro: hexagon tiles fall, collide and bounce, then converge into the hero title, followed by a light sweep and a dissolve into the HTML title while the core fades in. Skippable with click, tap, Esc or Space; skipped for reduced motion, without WebGL, and on repeat visits in production. The owner reported it working in a desktop browser on October 26, 2026, and reported no problems in a phone-size browser view or with reduced motion emulated. Testing on a real phone and on the deployed site has not been done.
- **Planned:** interactive cybersecurity terminal; 3D project universe; learning timeline; contact form with email delivery.
- **Partially Implemented / Planned:** Performance measures include lazy loading the scene/admin app, reduced particle counts on narrow screens, and reduced-motion handling. Further performance optimization and measured device testing remain planned.

## 5. Supabase architecture and access

**Verified in checked-in SQL/source (not proof of live deployment):**

- Tables defined by `supabase/sql/01_schema.sql`: `admin_users`, `site_content` (single row), `projects`, `skill_groups`, and `contact_links`.
- The schema enables RLS. Its policies allow public/`anon` reads of the site text and published project, skill, and contact-link rows; writes are intended for authenticated admins. Site text is update-only through the API grants; content tables have admin write policies.
- `admin_users` is intended as an allowlist. `is_admin()` checks the authenticated user ID against that table; the client uses email/password sign-in and calls this function to decide which admin UI to show.
- SQL also defines input checks, `updated_at` triggers, and reorder functions. The client uses the publishable key; database policy enforcement is essential.
- `supabase/sql/02_seed.sql` contains starter content, including placeholder project descriptions and blank contact links.

**Needs Verification (dashboard/live database):**

- Whether the schema, seed, and reorder SQL were applied to the intended Supabase project, and whether live RLS/grants match the checked-in SQL.
- Whether the site-content singleton exists and whether any real admin user is present in `admin_users`.
- `supabase/sql/03_authorize_admin.sql` is empty (0 bytes); no checked-in admin-allowlist provisioning statement was found. `04_verify_admin.sql` only queries the allowlist and auth users.
- Supabase authentication settings, deployed environment configuration, and real public/admin access behavior were not inspected. No environment file values are documented here.

## 6. Admin dashboard and known code issues

The code includes an overview dashboard and navigation to Hero, About, Projects, Skills, Contact text, and Links editors. Project, skills, and links APIs include CRUD/publish/reorder operations. UI route checks are not the security boundary; the SQL RLS policies are intended to enforce permissions.

**TypeScript/build:** `npm run build` succeeded on November 3, 2026. Vite emitted a large-chunk warning during the production build, but the build completed successfully. No TypeScript errors are present in the current checked-in code.

**Lint/runtime:** `npm run lint` passed on November 3, 2026. Browser/runtime smoke tests were not run for this update. Admin behavior requiring a configured Supabase instance remains unverified.

## 7. Latest verified commands and results

- **November 3, 2026 — `npm run build`:** passed; production bundle generated successfully in `dist/`.
- **November 3, 2026 — `npm run lint`:** passed, no errors.
- **Browser, admin, and live Supabase checks:** not verified.

## 8. Planned features

- [x] 3D name assembly with physics-like collisions
- [ ] Cinematic scroll transitions beyond the current core poses/reveals
- [ ] Interactive cybersecurity terminal
- [ ] 3D project universe
- [ ] Learning timeline
- [ ] Admin content management expansion/polish
- [ ] Contact form with email delivery
- [ ] Accessibility controls
- [ ] Performance optimization and measurement

## 9. Known issues, risks, and verification needs

- **High priority:** Admin SQL provisioning script is empty; live allowlist membership and database policies are unknown.
- The Vite large-chunk warning remains present in the current production build, but its impact on the live site is not yet measured.
- Starter project descriptions explicitly contain placeholder copy; contact details in the local configuration are blank.
- No browser test or live Supabase test is established by this update.
- Name intro: the pieces read the real `.hero__word` positions once when the intro starts, so resizing the window during the intro does not re-align them (a refresh does). If the hero typography or layout changes, the intro follows automatically. Piece count is about 520 on desktop and 320 under 900 px wide.
- Checked-in SQL describes intended security controls, but they must not be treated as proof that the deployed database enforces them.

## 10. Prioritized roadmap

1. **Next task — Verify Supabase deployment and admin access:** compare the live schema/RLS/grants with checked-in SQL, confirm the intended admin allowlist entry through the project’s approved setup process, then smoke-test public reads and authorized admin operations. Do not put credentials in this document.
2. Replace starter portfolio copy and configure real project/contact content; confirm the published public view.
3. Run `npm run lint` and browser smoke tests; capture actual errors/results.
4. Investigate the reported Vite chunk warning and measure performance before optimizing.
5. Build the planned terminal, project universe, learning timeline, contact email workflow, accessibility controls, and enhanced name/scroll effects.

## 11. Instructions for future AI assistants

- Inspect the current code and configuration before making changes; do not assume this tracker is newer than the implementation.
- Make small, scoped changes and avoid unrelated modifications.
- Run `npm run build` and `npm run lint` for code changes; report actual results and do not claim a check passed unless it ran.
- Treat secrets as private. Never copy `.env` values into this file or expose credentials.
- Update this document only with progress verified from source, configuration, executed checks, or confirmed live-system evidence. Label anything else **Needs Verification**.

## Change log

- **October 25, 2026:** Created initial project status and handoff tracker from repository inspection; build result recorded from the task prompt.
- **October 26, 2026:** Added the 3D name assembly intro (`introState.ts`, `nameTargets.ts`, `NameAssembly.tsx`), the hero intro gating in `useHeroIntro.ts`, the core fade-in in `CyberCore.tsx`, and intro styles in `scene.css`. Desktop behaviour confirmed by the owner; real phones and the deployed site not yet verified.
