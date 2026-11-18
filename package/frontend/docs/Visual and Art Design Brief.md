# PostPock — Visual and Art Design Brief

This brief describes the look, feel and art of the PostPock frontend, and how to extend it without breaking it.
Read it before designing a new page, panel, component or piece of art. The source of truth for every value
quoted here is the code (`src/ui/styles/tokens.css`, `src/ui/icons/Icon.jsx`, `src/ui/art/…`); if they ever
disagree, fix this document.

---

## 1. Theme in one paragraph

**A quiet night gallery for the art you have kept.** PostPock is where people store and revisit illustrations,
comics, videos and files they paid for. The experience should feel relaxed, warm and a little magical — closer to
walking through a small private museum at night than to operating a dashboard. The home page opens on a living,
hand-painted *Starry Night*; everything else is a calm, paper-like room in which the user's collected works are the
largest and brightest things on screen. Functions are present but soft-spoken.

Keywords: **nocturne · atelier · paper and paint · gallery wall · unhurried · gentle contrast · content first**.

Anti-keywords (never): dashboard, neon, glossy/pearlescent, plastic, gamified, emoji, "techy" chrome, loud gradients,
heavy rounded "bubble" UI, cute copywriting.

---

## 2. Core principles

1. **Content and art take the space.** Covers, banners and the painting are the largest elements on every page and
   are seen first. Controls are smaller, quieter and grouped at the edges (top bar, toolbars, sheet footers).
2. **Graded loudness.** Every control has a volume level, and new ones must pick one deliberately:

   | Level | Use for | Treatment |
   | --- | --- | --- |
   | Loud | the one primary action of a surface (开始导出, 同步 N 篇, 创建作者) | `primary` button (night-blue by day, starlight by night) |
   | Normal | frequent actions (search, 同步, 导出 in the top bar) | icon + label, ghost or secondary |
   | Quiet | settings, connections, tasks, edit, add | icon only, or small ghost/quiet text with a tooltip |
   | Silent until needed | status that only matters when wrong | a dot that changes colour (connected → expired), a badge that appears only when > 0 |
3. **Gentle contrast.** No pure black, no pure white. Text is ink-blue on warm paper by day and cream on deep night
   by night. Accents are muted (cobalt, starlight yellow, moss, amber).
4. **Matte, tactile surfaces.** A faint paper grain sits on the page background. Shadows are soft and warm-tinted.
   No glossy highlights, no iridescence, no glassy gradients — the only "glass" is a smoked blur used where controls
   float on top of artwork.
5. **Few, small corners.** Radii are 3/5/8/12 px (`--r-1…4`). Images use small radii; avatars are circles;
   pills are avoided.
6. **Plain words.** Copy says what things are (新增作者, 清空历史, 同步状态检查). No themed wording, no exclamation, no
   emoji. Keep small explanatory notes to the rare cases where an action would otherwise be confusing.
7. **Every interaction has a small reward.** Hover lifts, presses settle, things that appear rise in; selected state
   is unmistakable. Details like a chip "popping" into place or a spiral turning when you scroll are the signature of
   the product — add one thoughtful detail to each new feature, never a pile of effects.

---

## 3. Colour

All colours are CSS variables in `src/ui/styles/tokens.css`, defined once for the light ("day canvas") theme and
overridden under `:root[data-theme='dark']` ("night"). **Never hard-code a UI colour in a component** — use a token
so both themes work. (Fixed colours are allowed only *on top of artwork*, see §7.)

| Role | Token | Day | Night | Use |
| --- | --- | --- | --- | --- |
| Page | `--bg` | `#f3efe7` warm paper | `#0f131a` deep night | page background (with grain) |
| Raised | `--bg-raised` | `#faf7f1` | `#151a23` | dialogs, popovers, cards that need a surface |
| Sunken / field | `--bg-sunken`, `--field` | `#ebe6dc` / `#efe9de` | `#0b0e14` / `#0c1017` | inputs, wells, segmented tracks |
| Ink | `--ink`, `--ink-2/3/4` | `#232a37` → `#b3b5ba` | `#e8e3d6` → `#4c515b` | text: primary → secondary → tertiary → disabled |
| Lines | `--line`, `--line-2` | ink at 10 % / 18 % | cream at 8.5 % / 15 % | hairlines, borders |
| Hover / press | `--hover`, `--press` | ink at 4.5 % / 8.5 % | cream at 5 % / 9 % | interaction tints |
| Primary | `--primary` / `--on-primary` | night blue `#283759` | starlight `#e3ca83` | the one loud action |
| Accent | `--accent` | cobalt `#3b5b9b` | `#94acde` | links, focus, data keys, "updated" |
| Star | `--star`, `--star-ink`, `--star-soft` | `#c4912a` | `#e3c066` | selection, highlights, grouping keys, "not synced", progress |
| Status | `--ok`, `--warn`, `--danger` (+ `-soft`) | moss / amber / brick | lighter variants | connected / expired / error |

Semantic colour rules used across the app — keep them consistent in new features:

- **Selected / picked / current** → `--star-soft` background, `--star` edge (chips, rows, calendar range, thumbnails).
- **Grouping (aggregate) keys** are star-tinted; **data keys** are accent-tinted (export file-name editor).
- **Sync statuses**: synced `--ok`, not synced `--star`, updated `--accent`, unavailable `--ink-4` (struck through).
- **Connection**: connected `--ok` dot with a soft halo; expired `--warn`; disconnected a hollow ink ring;
  awaiting / verifying `--accent` with a pulsing ring.
- **Platforms** carry their own brand-softened colour (`platform.color`), used only for the small platform mark and
  colour dots — never as a large surface.

The painting's own palette (night blue `#1d2f6b`, Prussian `#142a4f`, cobalt `#2f5fb3`, sky turquoise `#6fa3b8`,
star yellow `#f1d35a`, moon orange `#e8a53a`, cream `#efe6c4`) is where the UI palette comes from. New art should
draw from the same family.

---

## 4. Typography

Only three typefaces exist in the product, self-hosted from `public/fonts/` (no CDN, no system fallbacks by design):

| Family (CSS name) | File | Role |
| --- | --- | --- |
| `PP Jakarta` | Plus Jakarta Sans (variable 200–800) | Latin text and all numbers |
| `PP Rounded` | Resource Han Rounded CN Regular | all Chinese / Japanese text |
| `PP WenKai` | LXGW WenKai Regular | accents only (the home greeting) |

- Stacks: `--font-sans` = Jakarta → Rounded; `--font-kai` = WenKai → Rounded.
- The CJK faces have a single weight and are declared for the whole weight range, so the browser never fakes bold.
  **Consequence:** hierarchy comes from size, colour and spacing, not boldness. For headings that can contain user
  content in any script (titles, names) use weight **540**, so Latin parts don't outweigh CJK. Use 600–720 only for
  Latin-only labels (platform names, the wordmark).
- Use WenKai sparingly — at most one accent element per screen. Accent text is revealed only after its font has
  loaded (see `useFontReady` in `HomeHero.jsx`), so it never visibly swaps.
- Chinese text uses slightly open tracking (≈ 0.02 em); Latin text is tight (0 to 0.005 em). Use `:lang(en)` to
  adjust.
- Numbers that change or align use tabular figures (`className="num"`).
- Scale in use: 12 · 13 · 14.5 (UI base) · 15–17 (reading) · 19–25 (card titles) · 30–46 (page titles) ·
  46–78 (the greeting). Reading text is 17 px with 1.95 line height for CJK, 1.78 for Latin.

---

## 5. Space, layout and composition

- Content width `--maxw` 1520 px with fluid gutters `--gutter` (20–64 px). Reading columns are 720 px; wide images,
  video and figures break out to 1060 px.
- **Gallery composition:** big art at the top of each page that dissolves into the page colour (home painting,
  author banner, post cover), then the collection laid out like a wall:
  - Home: each platform is a "wing" — a sticky label column (mark, large name, counts, connection) beside a grid
    of author cards.
  - Author page: banner → overlapping avatar and profile → sticky toolbar → large post cards (one or two columns).
  - Post page: framed cover → title block → reading column → neighbours.
- Cards are mostly **borderless**: the image is the surface (small radius, hairline, soft shadow) and text sits on
  the page like a museum label. Hover lifts the image 4 px and slowly zooms it (≈ 1.03–1.045 over 1.2 s).
- Work surfaces that need room (export, sync) open as **sheets** that rise over the page; small decisions use
  centred **dialogs**; contextual tools use anchored **popovers**.
- Every page must remain composed at 1024 px wide: labels collapse to icons, side columns stack, breadcrumbs hide.

---

## 6. Motion

Tokens: `--ease-out` (default for everything entering or moving), `--ease-in-out` (exits, theme reveal),
`--ease-back` (small playful pops: chips, avatars, deck cards), `--ease-spring`; durations `--dur-1…4`
(120 / 220 / 380 / 640 ms).

- **Enter:** rise 10–16 px and fade in; lists stagger by 40–70 ms per item.
- **Exit:** faster than enter (150–320 ms), fade and settle.
- **Press:** 1 px down or scale 0.94–0.97.
- **Page navigation:** React `<ViewTransition>` — pages cross-fade and rise; covers **morph** into the next page's
  banner/cover using shared names (`author-art-<id>`, `post-art-<id>`). New pages that show an item's artwork must
  reuse the same naming so the morph continues to work.
- **Theme switch:** a circle grows from the toggle and reveals the new theme.
- Loading: content keeps its place (transitions wait for data); progress uses calm bars and rings, spinners only
  as a last resort and after a short delay.
- Respect `prefers-reduced-motion`: base styles already shorten all animations, and the painting stops moving.

---

## 7. The art

### 7.1 The home painting (Starry Night)

Location: `src/ui/art/starry/`. It is a faithful port of the impasto technique from scene 12 of *The Pelican Test*
(MIT), recomposed for an ultra-wide panel (2800 × 820 composition units).

- **Technique:** every mark is a "dash" — a loaded brush stroke with 2–9 bristle streaks mixing two colours, plus a
  height map that is lit (diffuse, gloss, cavity) to produce raised paint over a canvas weave. Do not replace it with
  flat drawing; extend it with the same `dash()` / `light()` engine (`engine.js`).
- **Composition** (`composition.js`): great double spiral right of centre, four small spirals, twenty haloed stars,
  crescent moon kept below the top bar, cypress at the right edge, village and farms across the land, field at the
  bottom (hidden by the fade). The left third is kept calmer because the greeting and cards sit there.
- **Layers** (`bake.js`): one static picture plus spinning discs (spirals, star halos, moon halo), flares, three
  waves of village windows, and one upright cypress. Painted in a Web Worker, streamed to the page as each layer
  finishes, cached in IndexedDB as WebP.
- **Life:** slow idle rotation; pointer movement stirs nearby spirals; scrolling spins them; clicking a star or the
  moon makes it flare; the cypress bends gently, and sways once more when the pointer brushes it; windows light up
  in three waves. All motion stops off-screen and under reduced motion.
- **Moving painted things:** never cross-fade separately painted versions of a shape (the strokes do not line up and
  read as flicker). Paint it once and move it on screen (rotate a disc, bend the cypress in device-pixel bands).
- **Windows** (`windowPlan` in `paint.js`): each window is seeded to stay dark (about half), be lit from the start,
  or light up in a wave; only some lit windows glow. A glow is a soft warm falloff, wider than tall — no strokes
  (small yellow dabs on a pale wall read as extra windows). Each wave layer is painted by replaying the village in
  picture order with everything except that wave's windows drawn as an eraser, so houses and trees in front hide
  windows behind them exactly as in the main picture.
- **Moon:** the sky paints a broad yellow glow around the moon; the turning halo layer sits on it and ends in the
  same moon-yellows, thinning out at its edge, so the two read as one light.
- **Rules for changes:** bump `VERSION` in `composition.js` whenever the picture changes (it invalidates caches);
  keep stars/moon away from the top 90 units (the bar sits there); keep the cypress inside the visible range at
  1024 px (`ANCHOR_X` in `StarryNight.jsx`); check the first-paint time stays reasonable.
- **On top of the painting** the UI is fixed cream (`#f6f0de`) text and smoked glass
  (`rgba(11,17,40,.42)` + blur) in both themes — the painting is always night.
- **Fade:** the painting dissolves into `--bg` with a multi-stop eased mask (≈ 70 % → 100 % of the hero height) so
  the village stays visible and there is no muddy band.

### 7.2 Author banners

Built-in banners (`src/ui/art/banners/banners.js`) are pure SVG scenes, 1800 × 600: swirl, dawnhills, tide,
snowfield, cloudland, mosaic, meadow, lanterns. New authors get one at random; covers are cropped from banners
(16:10, user-adjustable focus point).

To add a banner: add a function to `SCENES` that returns SVG markup, keep it **flat and matte** (gradients only for
skies and glows, no gloss), keep the subject within the centre 50 % so the cover crop works, use palettes from the
app family, and check it in both themes next to real covers.

### 7.3 Illustrations, icons and the logo

- **Logo:** a pocket holding a crescent moon (`src/ui/icons/Logo.jsx`); the pocket takes `currentColor`, the moon is
  starlight yellow.
- **Icons** (`src/ui/icons/Icon.jsx`): the only icon source. 24 × 24 grid, 1.6 px round-cap strokes, mostly
  outline, solid only for tiny details (dots) and media controls. Signature icons are thematic (the sync icon is a
  spiral). To add an icon, add an entry to the map in the same style — check it at 15, 17 and 19 px and beside
  neighbouring icons. Never use emoji, icon fonts or third-party icon sets.
- **Empty states** use the small "empty frame under the moon" vignette (`EmptyArt` in `feedback.jsx`). New empty
  states reuse it, or add a sibling vignette with the same line weight and colours (ink-3/4 lines, star accent).
- **Mock artwork** (`src/data/mock/art.js`) only stands in for downloaded images; it is data, not UI art.

---

## 8. Component vocabulary

Reuse before creating. All live in `src/ui/components/`:

- `Button` (primary / secondary / ghost / quiet / danger; `tone="art"` on artwork), `IconButton` (with tooltip),
  `Chip` (toggles), `Segmented` (sliding indicator), `Select`, `Checkbox` / `Tick` (animated check), `Field`,
  `TextInput`, `TextArea`.
- `Popover`, `Dialog`, `Sheet`, `Tooltip` (overlay.jsx) — they bring presence animations, focus trapping, Escape
  handling and scroll locking.
- `Calendar` / `DateField`, `Picture` (fade-in image with focus crop), `Avatar`, `Pagination`, `ProgressBar`,
  `ProgressRing`, `Spinner`, `Empty`, `StatusDot`, `PlatformMark`, `toast()`.
- `AuthorSelector` (AuthorSelector.jsx) — the one way to choose authors anywhere (export, sync, search). `split`
  layout: platform column + author grid + selected tray, for popovers; `stacked` layout: collapsible platform
  sections, for side panes. It is built to stay usable with dozens of platforms and hundreds of authors, so new
  features that pick authors or platforms should reuse it rather than list them as chips.
- `FolderPicker` (features/folders) — the in-app folder browser; every "choose a folder" action goes through it.

Scale rule: any list of platforms or authors must assume dozens of each. Show a summary (count, first names,
stacked avatars) and open the full selector on demand; never lay every option out on the page.

A new component should: use only tokens; work in both themes; have hover, active, focus-visible and disabled states;
animate in with the shared easings; and stay under the "quiet" level unless it is the primary action.

---

## 9. Designing a new feature — checklist

1. **Decide the surface:** page (has art and content), sheet (a workspace), dialog (a short decision), popover
   (contextual tool), or inline.
2. **Decide the loudness** of each control (§2) — one loud action at most per surface.
3. **Let content lead:** if the feature shows works, show their images large; text supports them.
4. **Use the vocabulary:** existing components, tokens, icons, the three fonts; plain copy in both `zh-CN.js` and
   `en.js`.
5. **Add one meaningful detail:** a morph, a gentle pop, a progress that tells a story — tied to what the user is
   doing, not decoration.
6. **States:** empty (with the vignette and a clear next step), loading (keep layout), error (plain words, a way out),
   very long text, very many items, CJK and Latin mixes.
7. **Check:** light and dark, Chinese and English, 1024–2560 px wide, keyboard only, reduced motion.
8. **If it adds art:** follow §7 — matte, same palette family, readable controls on top, fade into the page if it is a
   header.

---

## 10. Do and don't

| Do | Don't |
| --- | --- |
| Let covers, banners and the painting be the biggest things on screen | Fill the screen with stat tiles, charts and buttons |
| Use tokens for every UI colour | Hard-code colours (except cream / smoked glass on artwork) |
| Use weight 540 for user-content headings | Bold mixed CJK/Latin titles |
| Use the project icon set, extended in its style | Use emoji, icon fonts or borrowed icon packs |
| Small radii, hairlines, soft warm shadows, paper grain | Pills everywhere, thick borders, glossy or pearlescent effects |
| One accent element per screen in WenKai | WenKai for body or UI text |
| Plain labels (新增作者, 开始导出) | Themed or cute copy, long hint text under every field |
| Calm, purposeful motion with the shared easings | Bouncy, long or looping decorative animations |
