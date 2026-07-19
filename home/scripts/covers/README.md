# Blog cover images

Blog cards show a cover image when the post declares one:

```yaml
---
title: Announcement of Apache HertzBeat™ 1.8.0 Release
image: /img/blog/covers/hertzbeat-v1-8-0.jpg
---
```

Posts without `image` fall back to a cover generated at render time from the same
palette, so a post never looks broken for lacking one. Covers are optional.

## Adding a cover

1. Add an entry to `manifest.json`:

   ```json
   {
     "file": "monitor-iotdb.jpg",
     "headline": "Monitoring Apache IoTDB",
     "kicker": "Tutorials",
     "accent": "#6fc7b4",
     "accent2": "#8fb8ee",
     "posts": ["2023-01-05-monitor-iotdb.md"]
   }
   ```

2. Render it:

   ```bash
   npx playwright install chromium   # once
   node scripts/covers/generate.js monitor-iotdb.jpg
   ```

3. Add `image: /img/blog/covers/monitor-iotdb.jpg` to the post's front matter, in
   `blog/` and in every `i18n/<locale>/docusaurus-plugin-content-blog/` copy. One
   image serves all locales.

Running `node scripts/covers/generate.js` with no arguments re-renders everything;
output is deterministic, so unchanged entries produce identical files.

## Design rules

- **1800×766** (≈2.35:1), matching the card and hero cover areas. Cards crop with
  `object-fit: cover`, so the template keeps generous padding — text placed near
  an edge gets cut off.
- **Headline is a condensed title, not the full one.** The card already shows the
  full title underneath; repeating it verbatim reads as a placeholder.
- **Light background, brand purple accents.** Generated fallbacks use the same
  gradient and the same five accent pairs, so both kinds of cover sit together on
  one page. A cover in a different visual language will not blend.
- **No busy texture.** An earlier revision had a grid overlay; at card size it
  reads as noise.
- Keep files under ~150 KB. JPEG quality 88 lands around 50–80 KB.
