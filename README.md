# Jaime Díaz-Trechuelo — personal academic website

A dependency-free static website designed for GitHub Pages. It does not use the previous Jekyll or Academic Pages template.

## Files

- `index.html` — homepage and research profile
- `cv.html` — responsive, print-ready curriculum vitae
- `notes.html` — lecture-notes catalogue
- `assets/css/styles.css` — complete visual system
- `assets/js/main.js` — mobile navigation, theme switcher, and restrained reveal animation
- `IMAGE_CHECKLIST.md` — exact photographs and filenames to add

## Deploy on GitHub Pages

1. Back up the existing repository or create a branch containing the old site.
2. Delete the old template files from the root of `jtrechu.github.io`.
3. Upload the contents of this folder to the repository root.
4. Add the real photographs listed in `IMAGE_CHECKLIST.md`.
5. Commit and push to the branch configured in **Settings → Pages**.

Because `.nojekyll` is included, GitHub Pages will serve the static files directly.

## Preview locally

From this folder, run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Before publishing

Review dates, names, course descriptions, and the current MSc average. Add cleaned lecture-note PDFs only after checking permissions and notation. The CV page can be printed or saved as PDF directly from the browser.
