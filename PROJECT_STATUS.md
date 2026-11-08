# CYBER // REALITY — Project Status

**Last updated:** November 8, 2026

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
- `src/terminal/` and `src/styles/signal.css`: lazy-loaded SIGNAL command terminal; it reads already-loaded public content through the content context and reads built-in facts through the knowledge store.
- `src/scene/`, `src/shaders/`: React Three Fiber scene, procedural core, particle field, shader code, and the knowledge-reveal engine. The name intro lives in `src/scene/introState.ts` (shared intro status, skip controls, scroll lock), `src/scene/nameTargets.ts` (turns the hero title into target points) and `src/scene/NameAssembly.tsx` (instanced hexagon tiles with a custom physics simulation).
- `src/knowledge/`: built-in fallback facts used by both the core's knowledge reveals and the SIGNAL knowledge command.
- `src/hooks/`: scroll choreography, hero intro, pointer input, card tilt, and reduced-motion preference.
- `src/content/`: Supabase content loading, context, types, and fallback data.
- `src/config/site.ts`: local portfolio content and data types.
- `src/scene/scrollState.ts`: includes the SIGNAL core pose between Skills and Contact.
- `src/admin/`: sign-in, admin routing, dashboard, editors, validation, and content APIs.
- `src/styles/`: public, scene, and admin styles.
- `src/lib/supabase.ts`: browser client initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, or absent when not configured.
- `supabase/sql/`: checked-in schema, seed, admin verification, and reorder SQL scripts.

## 4. Features and implementation status

- **Implemented (code):** Public page sections for Hero, About, Projects, Skills, SIGNAL, and Contact; navigation and skip link. SIGNAL is between Skills and Contact, titled “Talk to the system.” with eyebrow “04 / Signal”; Contact uses “05 / Contact,” and navigation includes Signal.
- **Implemented (code):** Supabase-backed public content loading with a local fallback when unavailable or unsuccessful.
- **Implemented (code):** Procedural Three.js core, animated particles and shader effects, drag-to-spin, idle core spin, tumbling orbit rings, and CSS background fallback when WebGL is unavailable. Mouse-driven core tilt and particle parallax are currently disabled (`MOUSE_TILT` and `MOUSE_PARALLAX` are `0`).
- **Implemented (code), Needs Verification (browser):** Core knowledge reveals use built-in facts, node-facing checks, collision-aware placement, animated tethers, and a small limit on simultaneously visible labels. Loading facts from Supabase is not implemented.
- **Partially Implemented:** GSAP scroll-linked core poses and staggered section reveals exist; the broader planned cinematic transitions are not evidenced as complete.
- **Implemented (code):** Project cards, skill cards/constellation, and contact links. Contact supports opening a `mailto:` link and copying its address; there is no message-submission form.
- **Partially Implemented:** Reduced-motion behavior and basic keyboard/screen-reader affordances exist. A configurable accessibility-controls panel is not present.
- **Implemented (code), Needs Verification (live):** Admin sign-in, access-state UI, dashboard counts, and editors for site text, projects, skill groups, and contact links. Source includes create/edit/delete, publish toggles, and ordering operations; successful use against the deployed database has not been verified.
- **Implemented (code), Needs Verification (real devices, deployed site):** Cinematic 3D name intro: hexagon tiles fall, collide and bounce, then converge into the hero title, followed by a light sweep and a dissolve into the HTML title while the core fades in. Skippable with click, tap, Esc or Space; skipped for reduced motion, without WebGL, and on repeat visits in production. The owner reported it working in a desktop browser on October 26, 2026, and reported no problems in a phone-size browser view or with reduced motion emulated. Testing on a real phone and on the deployed site has not been done.
- **Implemented (code), Needs Verification (browser behavior owner-reported):** SIGNAL.
  - **Behavior:** It is a lazy-loaded, fixed-height simulated command-line session with a continuous transcript and a new prompt after each command. Commands are `help`, `whoami`, `about`, `projects`, `skills`, `knowledge`, `labs`, `education`, `contact`, `clear`, and `date`; input is case-insensitive, accepts a leading `/`, and unknown commands may suggest a match. Help names are clickable; projects, skills, and knowledge accept a number or name. Up/down history holds 50 commands in memory and survives `clear`; scrollback is capped at 200 entries, input at 200 characters, and auto-scroll stays inside the terminal. Tab completes command names only; Ctrl+L clears; Page Up/Down scroll; bare Enter starts a prompt line. The boot sequence has three lines and a hint, starts at 40% visibility, plays once per page load, can be skipped with Esc, Enter, click, or tap, and is disabled for reduced motion or unavailable IntersectionObserver. Lazy loading begins about 600 px before the section; fixed panel height prevents layout shift.
  - **Data sources:** Public content comes from the existing content context; knowledge uses the core's same built-in 46 facts in 10 categories; education/labs are local profile data. Profile education and labs are currently empty.
  - **Security:** Commands use predefined handlers in a Map (no eval or shell execution), with React-rendered output and HTTP(S)/mailto link validation.
  - **Verification status:** No new dependencies were added beyond the documented stack. `npm run build`, `npm run lint`, and the terminal source search for Supabase/environment access were verified; browser checks were owner-reported, not independently run for this update. No screen-reader test has been done.
- **Planned:** 3D project universe; learning timeline; contact form with email delivery.
- **Partially Implemented / Planned:** Performance measures include lazy loading the scene/admin app, reduced particle counts on narrow screens, and reduced-motion handling. Further performance optimization and measured device testing remain planned.

## 5. Supabase architecture and access

**Verified in checked-in SQL/source (not proof of live deployment):**

- Tables defined by `supabase/sql/01_schema.sql`: `admin_users`, `site_content` (single row), `projects`, `skill_groups`, and `contact_links`.
- The schema enables RLS. Its policies allow public/`anon` reads of the site text and published project, skill, and contact-link rows; writes are intended for authenticated admins. Site text is update-only through the API grants; content tables have admin write policies.
- `admin_users` is intended as an allowlist. `is_admin()` checks the authenticated user ID against that table; the client uses email/password sign-in and calls this function to decide which admin UI to show.
- SQL also defines input checks, `updated_at` triggers, and reorder functions. The client uses the publishable key; database policy enforcement is essential.
- `supabase/sql/02_seed.sql` contains starter content, including placeholder project descriptions and blank contact links.
- `supabase/sql/03_authorize_admin.sql` is a nonempty provisioning script (108 bytes) with an `INSERT ... SELECT` that adds the matching existing `auth.users` account to `public.admin_users`. The corresponding Auth user must already exist. The script's presence does not establish that it has been run, and its result must be checked against the live project.
- SIGNAL consumes public content already loaded by the site and has no Supabase access of its own.

**Needs Verification (dashboard/live database):**

- Whether the schema, seed, and reorder SQL were applied to the intended Supabase project, and whether live RLS/grants match the checked-in SQL.
- Whether the site-content singleton exists and whether any real admin user is present in `admin_users`.
- `supabase/sql/03_authorize_admin.sql` contains an admin-allowlist provisioning statement, but whether it was successfully run and created the intended entry is unverified. `04_verify_admin.sql` queries the allowlist and matching Auth users.
- Supabase authentication settings, deployed environment configuration, and real public/admin access behavior were not inspected. No environment file values are documented here.

## 6. Admin dashboard and known code issues

The code includes an overview dashboard and navigation to Hero, About, Projects, Skills, Contact text, and Links editors. Project, skills, and links APIs include CRUD/publish/reorder operations. UI route checks are not the security boundary; the SQL RLS policies are intended to enforce permissions.

**TypeScript/build:** `npm run build` passed on November 8, 2026 (711 modules). Output: Terminal 15.21 kB (5.08 kB gzip), index 572.52 kB, and SceneCanvas 1,008.26 kB. Vite still warns about large chunks; index and SceneCanvas sizes were unchanged across the successive SIGNAL builds recorded during Chat 3. No pre-SIGNAL size was recorded.

**Lint/runtime:** `npm run lint` passed on November 8, 2026 with no errors. **Needs Verification (owner-reported browser checks):** The owner reported passing browser checklists after each stage and a final pass covering production preview, offline fallback content, matching content, a temporary unsafe link, keyboard-only navigation, and a real phone. The phone model/browser and whether matching content used live Supabase or fallback data are unknown. Admin behavior requiring a configured Supabase instance remains unverified.

## 7. Latest verified commands and results

- **November 8, 2026 — `npm run build`:** passed; 711 modules. Terminal 15.21 kB (5.08 kB gzip), index 572.52 kB, SceneCanvas 1,008.26 kB. Vite reported a large-chunk warning.
- **November 8, 2026 — `npm run lint`:** passed, no errors.
- **November 8, 2026 — source search:** no `supabase` or `import.meta.env` references in `src/terminal/`.
- **November 8, 2026 — Needs Verification (owner-reported browser checks):** reported pass; see Section 6 for scope and unknown details.
- **Browser checks:** owner-reported, not independently verified. **Admin and live Supabase checks:** not verified.

## 8. Planned features

- [x] 3D name assembly with physics-like collisions
- [ ] Cinematic scroll transitions beyond the current core poses/reveals
- [x] Interactive cybersecurity terminal (SIGNAL)
- [ ] 3D project universe
- [ ] Learning timeline
- [ ] Admin content management expansion/polish
- [ ] Contact form with email delivery
- [ ] Accessibility controls
- [ ] Performance optimization and measurement
- [ ] Optional: Python Lab (separate milestone)
- [ ] Optional: admin-managed education, labs and knowledge

## 9. Known issues, risks, and verification needs

- **Needs Verification:** The nonempty admin provisioning script assumes its target account already exists in Supabase Auth. Whether it has been run and whether the live allowlist and database policies are correct remain unknown.
- The Vite large-chunk warning remains present in the current production build, but its impact on the live site is not yet measured.
- Starter project descriptions explicitly contain placeholder copy; contact details in the local configuration are blank.
- Live Supabase and admin behavior remain unverified; do not infer either from SIGNAL's owner-reported browser pass.
- **Needs Verification (owner-reported browser checks):** the reported final pass's phone model/browser and whether matching content came from live Supabase or local fallback were not recorded. Screen-reader behavior is untested; long polite live-region output may be verbose. Tab completes command names only, Ctrl+L may be intercepted by some browsers (the `clear` command remains available), and the boot sequence replays on every page load. Education and labs are empty until populated in `src/terminal/profileData.ts`; project descriptions and contact links reflect published content, including starter placeholders.
- Name intro: the pieces read the real `.hero__word` positions once when the intro starts, so resizing the window during the intro does not re-align them (a refresh does). If the hero typography or layout changes, the intro follows automatically. Piece count is about 520 on desktop and 320 under 900 px wide.
- Checked-in SQL describes intended security controls, but they must not be treated as proof that the deployed database enforces them.

## 10. Prioritized roadmap

1. **Next task — Verify Supabase deployment and admin access:** compare the live schema/RLS/grants with checked-in SQL, confirm the intended admin allowlist entry through the project’s approved setup process, then smoke-test public reads and authorized admin operations. Do not put credentials in this document.
   This is an open prerequisite task, separate from the five-chat roadmap below.
2. Replace starter portfolio copy and configure real project/contact content; confirm the published public view.
3. Run `npm run lint` and browser smoke tests; capture actual errors/results.
4. Investigate the reported Vite chunk warning and measure performance before optimizing.
5. Build the project universe, learning timeline, contact email workflow, accessibility controls, and enhanced name/scroll effects. The terminal item is done.

### Five-chat roadmap

1. Project foundation and Supabase/admin stabilisation (done)
2. Cinematic 3D name assembly (done)
3. Interactive cybersecurity terminal (done)
4. 3D project universe and scroll animations (next)
5. Final optimization and deployment

### Chat 4 handoff

- Inspect the current code before changes. `SECTION_POSES` includes a `signal` pose between `skills` and `contact`; `.signal__panel` is in the knowledge keep-out selectors and core-drag ignore list.
- The SIGNAL panel has a fixed height so lazy loading does not shift scroll-trigger positions. Existing `REVEAL_GROUPS` are in `src/hooks/useScrollChoreography.ts`.
- New interactive elements or sections added in Chat 4 must be added to the core-drag ignore list and the knowledge keep-out selectors. Adding or reordering sections also means updating site.nav, the section eyebrow numbers, and SECTION_POSES.
- Preserve the name assembly and SIGNAL behavior while implementing the next roadmap item. Avoid changes to their code unless required and verified.

## 11. Instructions for future AI assistants

- Inspect the current code and configuration before making changes; do not assume this tracker is newer than the implementation.
- Make small, scoped changes and avoid unrelated modifications.
- Run `npm run build` and `npm run lint` for code changes; report actual results and do not claim a check passed unless it ran.
- Treat secrets as private. Never copy `.env` values into this file or expose credentials.
- Update this document only with progress verified from source, configuration, executed checks, or confirmed live-system evidence. Label anything else **Needs Verification**.

## Change log

- **October 25, 2026:** Created initial project status and handoff tracker from repository inspection; build result recorded from the task prompt.
- **October 26, 2026:** Added the 3D name assembly intro (`introState.ts`, `nameTargets.ts`, `NameAssembly.tsx`), the hero intro gating in `useHeroIntro.ts`, the core fade-in in `CyberCore.tsx`, and intro styles in `scene.css`. Desktop behaviour confirmed by the owner; real phones and the deployed site not yet verified.
- **November 6, 2026:** Added core knowledge reveals backed by built-in facts, refined tether/label motion, disabled mouse tilt and particle parallax, and updated orbit-ring motion. `npm run build` and `npm run lint` passed; browser and live Supabase behavior remain unverified.
- **November 8, 2026:** Added the SIGNAL terminal and documented its command/data boundaries, verification status, limitations, and Chat 4 handoff. Build and lint passed; SIGNAL browser checks were owner-reported. Supabase/admin verification remains outstanding.
