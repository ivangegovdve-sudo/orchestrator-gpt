# Design-history snapshots

`design-history.js` builds its timeline from the `ERAS` array and looks for one
capture per era at:

```
/web/evolution/snapshots/<era-id>.jpg
```

If the file is missing the slot stays a correctly-sized, clearly-labelled
placeholder — the timeline still reads as complete, it just hasn't been
photographed yet. Drop a file in and it appears on the next load. **No code
change is needed.**

## Expected files

| Era | File | Period |
|---|---|---|
| The prompt builder | `prompt-builder.jpg` | Dec 2025 — Feb 2026 |
| Forest HUB | `forest-hub.jpg` | Mar 2026 — Jun 2026 |
| The constellation | `constellation.jpg` | 21 Jun 2026 — 14 Jul 2026 |
| Forest of light | `forest-of-light.jpg` | 14 Jul 2026 — 23 Jul 2026 |
| The dusk-forest jewel | `dusk-forest.jpg` | 23 Jul 2026 — 25 Jul 2026 |
| Forest HUB foundation | `hub-foundation.jpg` | 25 Jul 2026 — today |

## What to capture

- **16:9**, so it drops straight into the slot without cropping. 1600×900 is
  plenty; the thumbnail renders at ~370px wide and the lightbox at up to 920px.
- **The landing page at the top of the scroll**, viewport-sized — not a
  full-page capture. Thumbnails are `object-fit: cover` anchored to the top, so
  a tall image would show only its header.
- **JPEG**, quality ~80. These are decorative; six of them should not cost more
  than a few hundred KB in total.

To photograph a past era, check the commit out into a worktree and serve it:

```bash
git worktree add ../sdforest-era-<id> <commit>
```

The commit for each era is shown in that era's lightbox caption.
