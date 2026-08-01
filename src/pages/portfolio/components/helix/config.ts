const scene = {
  strands: 2,
  // slots per strand — more than the 12 real photos so they cycle to fill
  // every slot, but kept modest so the two strands don't overlap into an
  // unreadable clutter of cards (20/strand did that)
  perStrand: 10,
  // full rotations from top of a strand to the bottom — integer, so wrap is seamless.
  // 1 turn spaces 10 cards 36° apart around the cylinder.
  turns: 1,
  // cards per second of ambient descent
  speed: 0.25,
  // strand height relative to viewport, so it runs off both edges before wrapping
  spanFactor: 1.2,
} as const;

const appearance = {
  palette: [
    "#7d9183",
    "#5b7ea3",
    "#c9bfa8",
    "#4f7d78",
    "#a9836a",
    "#6b7280",
    "#77805e",
    "#66757f",
    "#8a8478",
    "#96876f",
    "#5e7268",
    "#6f7d8c",
    "#847e6a",
    "#4e6a74",
  ],
  // keeps adjacent strands from showing the same placeholder colors
  paletteStrandOffset: 7,
  brightnessFloor: 0.12,
  maxBlur: 5,
} as const;

const image = {
  // 2x the largest breakpoint's card size, for sharpness
  width: 520,
  height: 360,
} as const;

// discrete responsive tiers; the first entry whose minWidth fits the viewport
// wins. Radius and perspective step down with card size so each tier keeps
// the same composition and depth character.
const breakpoints = [
  { minWidth: 1440, radius: 560, perspective: 1400, cardWidth: 260, cardHeight: 180 },
  { minWidth: 1024, radius: 420, perspective: 1200, cardWidth: 225, cardHeight: 155 },
  { minWidth: 640, radius: 310, perspective: 1000, cardWidth: 170, cardHeight: 118 },
  { minWidth: 0, radius: 220, perspective: 850, cardWidth: 128, cardHeight: 88 },
] as const;

export type Breakpoint = (typeof breakpoints)[number];

export const config = { scene, appearance, image, breakpoints } as const;
