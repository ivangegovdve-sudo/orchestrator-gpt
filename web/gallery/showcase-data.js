/* Curated web-design showcase — the data behind /web/gallery/.
 *
 * Everything here is SOMEONE ELSE'S WORK. Nothing in this file is Ivan's, and
 * the page says so out loud. The rule that keeps that honest:
 *
 *   EMBED, NEVER COPY.
 *
 * Each entry points at the author's own CodePen embed URL. The code is served
 * from their account, runs from their account, and counts as a view on their
 * account. We never vendor a copy of the source into this repo — if a piece
 * cannot be embedded, it does not go in the showcase.
 *
 * Adding an item — append an object with these fields:
 *   id          slug, unique on the page (used for the DOM id + deep links)
 *   title       what Ivan calls it (the author's own name for the piece wins)
 *   penTitle    the pen's literal title on CodePen, shown as the source line
 *   author      { name, handle, profile } — name is displayed, handle is @user
 *   penUrl      canonical pen page, for "view the source"
 *   embedUrl    codepen.io/<user>/embed/<id>?default-tab=result  ← auto-runs
 *   poster      still image shown until the visitor presses play
 *   posterAlt   fallback still if `poster` ever 404s (pens can be re-saved)
 *   tags        3-4 short technique labels
 *   why         Ivan's curation note. One or two lines. This is the whole
 *               point of the page — without it this is a list of links.
 *   technical   an honest technical note, or "" if there isn't a real one.
 *               Do not invent one. "No assets at all" is a claim; only make
 *               it when the author made it.
 *   controls    input hint, or "" for pieces you just watch
 *   heavy       true = real-time 3D; the card warns phone visitors
 *
 * Verified 2026-08-16: pen live, embed endpoint returns the running result
 * iframe, and both poster URLs return 1280x720. shots.codepen.io does NOT
 * serve this pen (404s with a placeholder JPEG) — use the pen's own
 * <pen-id>.codepen.dev/.codepen/screenshots/ host instead.
 */
window.FOREST_SHOWCASE = [
  {
    id: "hoshi-no-tani",
    title: "Hoshi-no-Tani — The Valley of Stars",
    penTitle: "claude-opus-5-ghibli",
    author: {
      name: "Lentils",
      handle: "lentils801",
      profile: "https://codepen.io/lentils801",
    },
    penUrl: "https://codepen.io/lentils801/pen/019f9b4b-10d7-7f77-817f-f4eb83fdb289",
    embedUrl: "https://codepen.io/lentils801/embed/019f9b4b-10d7-7f77-817f-f4eb83fdb289?default-tab=result",
    poster: "https://019f9b4b-10d7-7f77-817f-f4eb83fdb289.codepen.dev/.codepen/screenshots/latest/1280.jpg",
    posterAlt: "https://019f9b4b-10d7-7f77-817f-f4eb83fdb289.codepen.dev/.codepen/screenshots/da3804573392dc6d292a0fe65757fd0291ac76af01fcee0663a07e9fa2bbd69c/1280.jpg",
    tags: ["WebGL", "Procedural terrain", "Live wind simulation", "Zero assets"],
    why: "Most “no assets” demos prove the point and stop there. This one keeps going until it has weather — you walk into a valley that exists only as arithmetic, the wind moves through the grass while you stand still, and a train runs past on a schedule nobody is watching.",
    technical: "No textures, no models, no recordings. The terrain, the light, the wind and the train are all computed at runtime from code alone.",
    controls: "WASD to walk · mouse to look · fly and cinematic modes",
    heavy: true,
  },
];
