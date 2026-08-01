import { config } from './config';

const { strands, perStrand } = config.scene;
const { palette, paletteStrandOffset } = config.appearance;

export type CardMeta = {
  strand: number;
  index: number;
  // strand progress (in cards) this card starts at
  base: number;
  // angular offset between strands, so they interleave rather than overlap
  phase: number;
  // shown while the photo loads, and if it fails to load
  color: string;
  image: string;
};

// Drop photos into src/assets/helix-photos/ (any of these extensions) and
// they're picked up automatically, alphabetically. There are more slots per
// strand than photos, so the set repeats (cycles) to fill every slot — each
// strand starts its cycle at a different offset so the repeats don't line up.
const photoModules = import.meta.glob<{ default: string }>(
  '../../../../assets/helix-photos/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);
const photos = Object.keys(photoModules)
  .sort()
  .map((path) => photoModules[path]!.default);

const photoStrandOffset = Math.round(photos.length / strands) || 1;

const placeholderColor = (strand: number, index: number): string =>
  palette[(index + strand * paletteStrandOffset) % palette.length]!;

const placeholderImage = (strand: number, index: number): string =>
  `https://picsum.photos/seed/portfolio-helix-${strand}-${index}/${config.image.width}/${config.image.height}`;

const photoFor = (strand: number, index: number): string => {
  if (photos.length === 0) return placeholderImage(strand, index);
  return photos[(index + strand * photoStrandOffset) % photos.length]!;
};

export const CARDS: CardMeta[] = (() => {
  const cards: CardMeta[] = [];
  for (let strand = 0; strand < strands; strand++) {
    for (let index = 0; index < perStrand; index++) {
      cards.push({
        strand,
        index,
        base: index,
        phase: (strand / strands) * 2 * Math.PI,
        color: placeholderColor(strand, index),
        image: photoFor(strand, index),
      });
    }
  }
  return cards;
})();
