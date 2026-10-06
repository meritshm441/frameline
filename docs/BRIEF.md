# Frameline: Original Project Brief

The original build brief for Frameline, kept verbatim for reference across sessions.
Decisions made since then that change the brief are listed at the bottom.

---

You are a senior Nuxt engineer and product designer. Build out my existing project, **Frameline**, into a complete, original movie discovery platform.

## Project context (already set up)
- Nuxt 4 (app/ directory structure), TypeScript, Nuxt UI (Tailwind-based), package manager: **pnpm**
- TMDB is connected through server routes: `server/utils/tmdb.ts` exposes `tmdb(path, query)` using a Bearer token from `runtimeConfig.tmdbToken`. Existing routes: `/api/trending`, `/api/search`, `/api/movie/[id]`
- All TMDB calls MUST go through `server/api/*` routes. Never expose the token to the client.
- Use `pnpm add` for any new dependency and tell me exactly what you installed.

## The concept
Frameline is NOT a streaming catalog. No horizontal "rows of posters", no autoplay hero banner, no Netflix/IMDb/Letterboxd layouts.
Frameline is a **cinematic atlas**: a place to wander through film history by mood, place, time, color, and connection. It should feel like a mix of a film archive, a museum exhibit, and a travel journal.

## Design identity
- Dark, cinematic, editorial. Deep near-black background, warm off-white text, one signature accent color (amber/projector-light).
- Subtle film grain overlay and soft vignette (CSS only, lightweight, toggleable for accessibility).
- Typography: an expressive serif for headings (e.g. "Fraunces" or "Playfair Display") + a clean sans for body (e.g. "Inter"). Load with @nuxt/fonts.
- Generous whitespace, asymmetric editorial layouts, large typography, slow and intentional motion (respect `prefers-reduced-motion`).
- Every page should feel designed, not templated. Use Nuxt UI components but restyle them via `app.config.ts` and the theme so they don't look default.

## Core features (build in this order)

### Phase 1: Foundation
1. Global layout: minimal top nav (Compass, Atlas, Time Machine, Spectrum, Journal) + search via a command palette (Nuxt UI `UCommandPalette`, opened with ⌘K / Ctrl+K) hitting `/api/search`.
2. Shared composables: `useTmdbImage(path, size)`, `useMovie(id)`, plus typed interfaces for Movie, MovieDetails, Person, Credits in `shared/types/`.
3. Footer with the required TMDB attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB."

### Phase 2: Mood Compass (home page `/`)
- Instead of "Trending", the home page asks: "What kind of night is it?"
- An interactive 2D compass/dial the user drags a point across: horizontal axis = Light ↔ Heavy, vertical axis = Calm ↔ Intense.
- Extra inputs: "How much time do you have?" (runtime ranges: <100 min, 100–130, epic) and "Watching with?" (solo, date, friends, family).
- Map these inputs to TMDB `/discover/movie` params (genres, `with_runtime.lte/gte`, `vote_count.gte`, certification for family) in a server route `/api/compass`. Document the mapping logic clearly in code comments.
- Show exactly **three** picks as large "tonight's program" cards, styled like a vintage cinema program, with a "Reshuffle" button. Not an infinite grid.

### Phase 3: The Film Dossier (`/movie/[id]`)
- Movie details designed like an archival dossier: large backdrop with color-graded overlay, title in serif, tagline as a pull-quote, "case file" metadata panel (year, runtime, countries, languages, director, budget/revenue if available).
- Trailer in a `UModal` (YouTube embed from the `videos` response, official trailers only).
- Cast as a horizontal strip of portrait cards linking to `/person/[id]`.
- **Double Feature**: suggest one pairing movie (from `/recommendations` + shared keywords via `/movie/{id}/keywords`) and show a short generated reason, e.g. "Shares: heist, 1970s, ensemble cast".
- **Constellation**: an interactive force-directed graph (D3, `pnpm add d3`) showing this film at the center, its top 5 cast/crew as nodes, and other films they're connected to. Clicking a film node navigates to it. Lazy-load it client-only (`<ClientOnly>`).

### Phase 4: Atlas (`/atlas`)
- Full-screen interactive world map using Mapbox GL JS (`pnpm add mapbox-gl`, public token from `runtimeConfig.public.mapboxToken` / `NUXT_PUBLIC_MAPBOX_TOKEN`).
- Click a country → side drawer (`USlideover`) with acclaimed films originating there (`/discover/movie?with_origin_country=XX&sort_by=vote_average.desc&vote_count.gte=200`).
- A decade slider filters the results (1920s → 2020s).
- Feels like a travel journal: "You've visited 4 countries' cinema" counter (stored locally).

### Phase 5: Time Machine (`/time-machine`)
- User picks a year (1920 to the current year) on a large scrubbable timeline.
- Shows "what was playing in [year]" (`primary_release_year`, sorted by popularity) plus that year's highest-rated films.
- The page's visual style shifts by decade: different font accents, color grading, and grain intensity (e.g. sepia for the 1920s, Technicolor saturation for the 1950s, neon for the 1980s). Implement as a decade → theme token map.

### Phase 6: Spectrum (`/spectrum`)
- Browse films by the dominant color of their poster.
- Show a color wheel; selecting a hue shows posters whose dominant color is closest.
- Extract dominant colors client-side with canvas (`crossOrigin="anonymous"`), cache results in memory/localStorage, and fall back gracefully if extraction fails. Start from a pool of popular + top-rated films.

### Phase 7: Reel Journal (`/journal`)
- Personal watch log, no account needed, stored in localStorage via a `useJournal()` composable (wrap all storage access in try/catch).
- Each logged film becomes a "ticket stub" card (perforated edge, date watched, seat number generated for fun, personal 1–5 rating, one-line note).
- Stats: films logged, countries visited (ties into Atlas), decades explored, favorite mood quadrant.
- Export/import journal as JSON.

## Technical requirements
- TypeScript everywhere, no `any` in final code.
- Use `useFetch`/`useAsyncData` with proper keys, loading skeletons (`USkeleton`), and friendly empty/error states.
- Cache TMDB server responses with `defineCachedEventHandler` (e.g. 1 hour for discover/trending, 24 hours for movie details).
- Fully responsive (mobile first) and accessible: keyboard navigable, visible focus states, alt text, sufficient contrast.
- SEO: `useSeoMeta` on every page, dynamic OG title/description on movie pages.
- Images: use `@nuxt/image` with TMDB as a provider/domain, appropriate sizes, lazy loading.
- Clean folder structure: `app/components/{compass,dossier,atlas,spectrum,journal,ui}`, `app/composables`, `server/api`, `shared/types`.
- No streaming, downloading, or links to unofficial sources. Trailers only via official YouTube embeds.

## How to work
- Work one phase at a time. At the end of each phase: list files created/changed, packages installed, and anything I need to configure (env vars, tokens).
- Explain any non-obvious decision in 1–2 sentences.
- Ask me before adding any paid service or changing the overall concept.

Start with Phase 1.

---

## Decisions & status log

- **2026-10-05, Phase 1 complete.** Layout, ⌘K search palette, composables, shared types, TMDB footer attribution, and theme all done; typecheck and lint pass.
- **2026-10-05, Phase 4 map: decided.** D3 + `world-atlas` TopoJSON instead of Mapbox (no paid service, no token). `mapboxToken` removed from `runtimeConfig` and `.env.example`.
- **2026-10-05, Phase 2 complete.** Mood Compass on `/`: draggable 2D dial (snaps to 0.25 detents; keyboard via two native range inputs), runtime + company choices, `/api/compass` maps mood to genres by distance on the same plane, picks three via a seeded shuffle. State lives in the URL (`?x&y&runtime&company&seed`) so programmes are shareable and render on the server. Mood quadrants are in `shared/utils/compass.ts` for reuse by Phase 7's journal stats.
- **2026-10-05, Phase 3 complete.** Film Dossier on `/movie/[id]`: graded backdrop hero, tagline pull-quote, case-file panel, official-trailer `UModal` (youtube-nocookie, iframe exists only while open), cast strip, Double Feature, Constellation. New routes `/api/movie/[id]/double-feature`, `/api/movie/[id]/constellation` and `/api/person/[id]` (all cached 24 h). Added `/person/[id]` since the cast strip links there. D3 only runs the physics; Vue renders the SVG so nodes are real, keyboard-focusable links, with a text index below. The Constellation lazy-loads only when scrolled near. Missing films and people return a real 404. Also fixed a Phase 2 image bug: a bare `sizes="100vw"` in @nuxt/image 2.1 resolves to a 1px screen and serves 92px images, so breakpoint-less vw sizes must be written as `xs:100vw`.
- **2026-10-05, Phase 4 complete.** Atlas on `/atlas`: Equal Earth map of Natural Earth 1:110m countries (Antarctica dropped), D3 for projection and zoom, Vue renders the SVG. Gestures are cooperative so the page still scrolls (Ctrl/⌘ + wheel or pinch zooms, two fingers pan on touch). Choosing a country flies to it and opens a non-modal `USlideover` with `/api/atlas/[country]` (cached 1 h; brief's discover params plus a release-date cap of today, since unreleased films with hype votes otherwise top the list). A two-thumb decade slider (1920s to 2020s) filters, "Next reel" pages on. State lives in the URL (`?country&from&to`). Additions beyond the brief: the Soviet Union, Czechoslovakia and Yugoslavia are openable (TMDB files Stalker under `SU`, not `RU`), and they link to and from their successor states; Hong Kong and Singapore are map markers; a country finder (`USelectMenu`) is the keyboard route. Passport stamps (code + first-visit date) live in localStorage under `fl-atlas-passport` via `usePassport()`; Phase 7 should read that for "countries visited". The numeric to alpha-2 code table and fixed country names are in `shared/utils/atlas.ts` (not `Intl.DisplayNames`, which varies by ICU version and would break hydration).
- **2026-10-06, Phase 5 complete.** Time Machine on `/time-machine`: a scrubbable ruler (1920 to the current year, one tick per year) with pointer drag, a hidden native range for keyboard and screen readers (arrows ±1 year, Page Up/Down ±10, Home/End), step buttons and a decade index. The year lives in the URL (`?year=1957`). The page restyles live while dragging; it fetches on release. `/api/time-machine/[year]` (cached 1 h) returns "what was playing" (`primary_release_year`, popularity) and the highest-rated films. Both use vote floors scaled by era, since raw popularity surfaces near-empty records and softcore, and a 1920s classic has a hundredth of a 2010s one's votes. The honour roll steps down a 1000→50 ladder until ten films qualify. The decade → theme token map is `ERAS` in `app/composables/useEra.ts`: room tokens (`--fl-bg`, `--fl-accent`, `--fl-grade`, grain, vignette) go on `<html>` via `useHead`, so they SSR and reset when you leave the page, and they cross-fade because `main.css` registers them with `@property`. Per-decade film-stock filters (`era-stock`) and lettering (`era-type`: family, weight, italic, case, tracking, text-shadow) use only the already-loaded Fraunces and Inter. Fraunces' SOFT/WONK axes aren't served by the Google provider, so they aren't used.
- **2026-10-06, Phase 6 complete.** Spectrum on `/spectrum`: a colour wheel where angle is OKLCH hue and distance from the centre is "vividness", so black-and-white posters gather at the centre. Every poster in the pool is plotted on it as a dot in its own colour; the 18 nearest the chosen point (Euclidean distance on the disc) are lit and shown below as paint-sample cards. `/api/spectrum` (cached 1 h) gathers the pool: pages 1–5 of `/movie/popular` and `/movie/top_rated`, interleaved and deduplicated (about 190 films). Colours are read client-side in `useSwatches`: each w92 poster is loaded with `crossOrigin="anonymous"` (TMDB's CDN sends `Access-Control-Allow-Origin: *`), drawn to a 46×69 canvas, and passed to `readSwatch` (`app/utils/swatch.ts`), which bins colourful pixels by OKLab hue weighted by chroma and takes the heaviest bin, since a plain average turns everything brown and the commonest pixel is usually black. Swatches are cached in memory and in localStorage (`fl-spectrum-swatches`, keyed by poster path, which TMDB never reuses, newest 600 kept). Failed posters are left off the wheel; if none can be read, the page says so and shows the pool unsorted. State lives in the URL (`?hue=178&vivid=60`); the marker and lit dots follow a drag live, while the grid and URL update on release. Keyboard: two hidden ranges (←/→ hue, ↑/↓ vividness, Page Up/Down ±30°, Home/End centre/rim) plus ten preset buttons. The room's `--fl-grade` is faintly tinted with the chosen hue. SVG coordinates are rounded to two decimals because Node's and the browser's `Math.sin` can differ in the last digit, which broke hydration.
- **2026-10-06, Atlas passport can be cleared.** "Clear passport" in the Atlas travel log, confirmed inline (focus moves to "Keep"); `usePassport().clear()` removes `fl-atlas-passport`.
- **2026-10-06, Phase 7 complete.** Reel Journal on `/journal`, stored in localStorage under `fl-journal` (`{ version: 1, entries }`) by `useJournal()`. Every storage call is wrapped in try/catch; if a save fails, the page warns and suggests exporting. Entries snapshot the film (id, title, year, poster, genre ids, origin countries) so the journal and its stats never call TMDB again. Each viewing is its own entry with its own id, so rewatches work. Everything read from storage or an import is validated by `parseEntry` in `shared/utils/journal.ts`. You can log from the journal ("Log a film" searches with `/api/search`, then reads `/api/movie/[id]`) or from the dossier hero ("Log in journal" or "Log a rewatch", with a "last watched" line). The stub is a ticket on paper-coloured stock: the body has the film, rating and note; a perforated stub has the date, row and seat (randomly drawn, rows skip I/O, re-drawable) and a serial number. The notches and torn edge are cut with a CSS mask (`fl-ticket` in `main.css`). Edit is in place; "Tear up" offers Undo in a toast; "Clear journal" asks first, inline. Stats: films logged (with rewatches and average rating); countries visited, the union of logged films' origin countries and Atlas passport stamps, with each count shown; decades explored, as a bar strip; favourite mood. A film's mood is the weighted centre of its genres' pins: `GENRE_PINS` moved from `/api/compass` to `shared/utils/compass.ts` so both use the same plane. Ties go to the quadrant rated higher, and "Set the Compass here" links back. Export downloads `frameline-journal-YYYY-MM-DD.json` (`format: 'frameline-journal'`). Import merges by entry id, never overwrites, and reports added, skipped and unreadable counts. `UiComingSoon` was unused afterwards and has been removed.
- **2026-10-06, Where to watch.** Films can't be played in Frameline (see Constraints: no streaming, no unofficial sources), so each dossier gets a "Where to watch it tonight" section with official Stream / Free / Rent / Buy offers from TMDB's watch-provider data (JustWatch, credited on the page). `/api/movie/[id]/watch?region=GB` caches all regions per film for a day and returns one region plus the list of regions that have offers. TMDB gives one link per region (its own watch page, which links out to each service), so every logo points there. The region is guessed from `Accept-Language` on the server (`useWatchRegion`), and a region the viewer picks is kept in localStorage (`fl-watch-region`). A "Where to watch" button in the hero jumps to the section.
