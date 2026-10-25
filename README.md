# Nimbus — landing page

Landing page for **Nimbus**, a Chrome extension that suggests replies inside any text box (X, LinkedIn, WhatsApp Web, Instagram, Gmail and more). You accept a suggestion with **Tab**.

## Design source
The visual language comes from the supplied ink-cloud artwork (`images/clouds.png`):
- **Palette tokens** (`css/style.css :root`): ink `#07040c` → night `#0b0612` → aubergine `#1d1030` → violet `#3f2063` / `#5a2f86` → orchid `#8655b0` → lilac `#c8aed6` → moon cream `#f4ebef`.
- **Metaphor:** a suggestion "condenses" like a cloud. The ghost text is lilac and drifts in from a blur, and pressing Tab "brings it down" into the box.
- **Type:** Geist (UI), Instrument Serif italic (emotional accents), Geist Mono (keys/labels).
- **Texture:** film grain overlay, scalloped SVG clouds with ink outlines and spiral swirls.
- **Dark theme only.**

## Sections (`index.html`)
1. Nav (frosted pill)
2. Hero: WebGL shader sky (`js/sky.js`) that warps the artwork with fbm noise and ink contour lines and reacts to the pointer. It also has twinkling stars and an auto-looping product demo across 5 platforms.
3. Platforms marquee
4. "The ritual": Click → Condense → Tab, with generated ink-cloud SVGs (`js/clouds.js`)
5. **Playground**: a working ghost-text autocomplete. Tab accepts all, → accepts the next word, Alt+] changes tone, Esc dismisses, Enter sends. It has 5 scenarios.
6. Details bento: voice/tone dial, thread context, keyboard, privacy, languages, speed counter
7. Manifesto: words light up as you scroll, over a parallax cloud image
8. Stats counters, testimonials
9. Pricing with a monthly/yearly toggle
10. FAQ accordion
11. Final CTA: big Tab keycap with a stardust burst (click it, or press Tab)
12. Footer

## Files
- `index.html`, `css/style.css`, `js/clouds.js`, `js/sky.js`, `js/main.js`, `images/clouds.png`

## Notes / next steps
- Playground suggestions are pre-written for the demo. There is no backend or LLM.
- The "Add to Chrome" link points to the Chrome Web Store home page. Swap in the real listing URL.
- Stats and testimonials are placeholder copy.
- If WebGL isn't available, the page falls back to the static cloud image. `prefers-reduced-motion` is respected.
