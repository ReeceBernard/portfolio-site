# Double Helix Photo Hero — Design

## Summary

Replace the current text-based `Hero` component on the portfolio page with a full-bleed, animated 3D "double helix" of 20 photos — two strands of 10 images each, corkscrewing in CSS 3D space, draggable by the visitor. The technique is ported from [githyperplexed/double-helix-gallery](https://github.com/githyperplexed/double-helix-gallery), adapted from a standalone vanilla TS project into a self-contained React component that drops into the existing portfolio.

## Goals

- A striking, personal hero section built from 20 photos of things the site owner likes.
- Faithful to the reference repo's motion and depth technique (CSS `perspective`, `rotateY` + `translateZ` + `translateY`, ambient rotation, drag-with-momentum).
- Looks great on both mobile and desktop, including touch drag.
- Fits cleanly into the existing React/TypeScript/Tailwind/Vite codebase without fighting Tailwind for 3D transforms.

## Non-goals

- Sourcing/editing the final 20 photos — placeholders are used for now, with one clearly documented swap point for real images later.
- Changing any other section of the portfolio page (Experience, Projects, Skills, Contact, Nav, footer).
- Building a generic/reusable "gallery" component for other use cases — this is a single-purpose hero.

## Architecture

The reference repo's imperative approach is preserved rather than reimplemented in a React-idiomatic (state-driven) way:

- A `requestAnimationFrame` loop updates each card's `transform`/`filter` inline style directly via refs, once per frame.
- React's role is limited to mounting the component, wiring up the loop/listeners in `useEffect`, and tearing them down on unmount (clearing the rAF, removing pointer/resize listeners).
- No per-frame React re-renders — with 20 DOM nodes animating at 60fps, mutating styles directly (as the reference does) avoids reconciliation overhead that a `useState`-driven version would incur.

This mirrors the reference's module split, translated into files that live alongside the new component rather than a standalone project:

- **Helix math** — pure functions for the angle along the strand, depth-based brightness/blur, and the CSS transform string. Same formulas as the reference (`helixAngle`, `depthOf`, `helixTransform`, `depthFilter`).
- **Viewport/breakpoint tracking** — picks the active responsive tier on mount and resize, pushes `--card-width`, `--card-height`, `--perspective` custom properties onto the scene root, and returns the current radius/span for the render loop.
- **Drag/momentum** — pointer-event-based (unifies mouse and touch), converts horizontal drag distance into strand progress, applies friction-based coasting after release. `touch-action: none` on the scene prevents scroll interference while dragging.

## Component structure

- `src/pages/portfolio/components/HelixHero.tsx` — new component, replaces `<Hero />` in `Portfolio.tsx` entirely.
- `src/pages/portfolio/components/helix/` — supporting modules ported from the reference (math helpers, viewport tracker, drag handler, config), scoped to this component.
- `src/pages/portfolio/components/helix/helixHero.css` — plain CSS for `.scene`, `.world`, `.card`, `.vignette`, imported directly into the component. Kept outside Tailwind because the transforms and sizing are driven by JS-computed CSS custom properties per frame/breakpoint, not static utility classes.
- Image list: a single `const` array of 20 entries (strand + index → image source), the one place to swap placeholder URLs for real photos later. Placeholders use seeded `picsum.photos` URLs, matching the reference's placeholder approach, so layout/aspect ratio is realistic even before real photos are in place.

## Content decisions

- **Card count:** 2 strands × 10 cards = 20 total, per the explicit ask (the reference defaults to 20/strand = 40 total). `turns` and `spanFactor` are scaled down from the reference's defaults proportionally so the sparser card count doesn't read as empty gaps in the strand — tuned visually once running, not hard-coded to the reference's numbers.
- **Theme:** dark hero (near-black background, vignette), matching the reference's look. This section intentionally breaks from the light theme used by the rest of the portfolio page, as a hero-specific treatment.
- **Identity overlay:** since the hero replaces all existing text (name, title, bio, buttons), a minimal overlay — name, title, and a scroll-down cue — is pinned subtly in a corner so the section still reads as this person's portfolio rather than an anonymous gallery. The "View Projects" and "Resume" actions from the old `Hero` are dropped from the hero itself (still reachable via `Nav`); the scroll cue replaces the "View Projects" affordance.
- **Responsiveness:** the reference's four-tier breakpoint system (radius/perspective/card size stepping down from desktop to mobile) is ported as-is; it already covers "looks great on mobile and computers" without new breakpoint design work.
- **Reduced motion:** `prefers-reduced-motion` disables ambient rotation (elapsed time frozen at 0), matching the reference — drag still works.

## Testing / verification

- Run the dev server and check the hero directly in a browser at both a desktop and a mobile viewport width.
- Verify drag-and-release momentum feels right on both mouse and touch (simulated).
- Verify `prefers-reduced-motion: reduce` stops ambient rotation but leaves drag functional.
- Confirm no console errors/warnings and no layout shift or scroll jank introduced elsewhere on the page.
