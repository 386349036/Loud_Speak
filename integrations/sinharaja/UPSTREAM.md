# Sinharaja local integration

Source: https://github.com/sahilkavishka/sinharaja (main archive downloaded 2026-10-23).

Archive SHA-256: `35E6231D8B9BA5AB82D8C5120805C2C08245F951774FD2937E0224672C49D753`.

Only the active React / Three.js frontend is used. The original Django project, SQLite database, unused 2D engine, CRA development scaffolding and SEO metadata are not deployed. The active 3D frontend does not request the Django scene API. Its procedural scene and synthesized sounds do not load the original 2D textures or MP3 files.

The downloaded upstream archive contains no explicit LICENSE file. Upstream game code and image rights remain with their respective owners. This integration records attribution for local use and does not grant an additional redistribution license. Dependency notices for React, React DOM, Scheduler and Three.js are shipped alongside the bundle.

Local changes:

- Build a production bundle with pinned React 19.2.3, React DOM 19.2.3, Three.js 0.186.1 and esbuild 0.25.12, retaining editable source and lockfile here.
- Serve the game at `/games/sinharaja/` from Loud's existing static service. The homepage entry opens a new tab; no separate Python service or extra exposed port is required.
- Default UI language is Simplified Chinese, with a persistent Chinese/English/Sinhala cycle. The local React text adapter translates all shared HUD dictionary keys, chapter cards, pause/controls, and primary Chapter 1 interactions/dialogue. Some field-guide descriptions, evidence details and later-chapter text remain upstream. Language selection never changes game IDs or saved progress.
- Remove Google Fonts network loading and use system fallbacks. Copy all referenced chapter/menu photographs locally. First chapter image `photo-1511497584788-87676104235f` returned 404, so reuse the fifth chapter's forest image. Other photo IDs: `photo-1432405972618-c60b0225b8f9`, `photo-1518709268805-4e9042af9f23`, `photo-1509198397868-475647b2a1e5`, `photo-1542273917363-3b1817f69a2d`, `photo-1586075010923-2dd4570fb338`. These are the upstream-referenced Unsplash images.
- Restrict game runtime resources to the same origin with a CSP; no CDN, telemetry or backend connection is needed.
- Fix upstream's missing Compass icon, hide a difficulty control whose method is absent from the active 3D engine, restart the engine for a same-chapter restart, and stop survival timers/input during menus and background focus loss.
- Supply the missing 3D `setAnalogMove` adapter and a canvas touch-look handler so the original on-screen joystick can operate without calling an undefined method.

Install dependencies with `npm ci --prefix integrations/sinharaja --ignore-scripts`, then build with `npm run build:sinharaja`. The generated static assets are ready to serve without installing build dependencies on the deployment host. Run `npm run test:sinharaja` with Loud available at `http://127.0.0.1:3108`; set `SINHARAJA_TEST_URL` to verify another local port.
