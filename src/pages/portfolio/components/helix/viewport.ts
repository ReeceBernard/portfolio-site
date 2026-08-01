import { config } from './config';

export type Viewport = {
  span: number;
  radius: number;
};

const pickBreakpoint = () =>
  config.breakpoints.find((bp) => window.innerWidth >= bp.minWidth) ??
  config.breakpoints[config.breakpoints.length - 1]!;

// Reads the active breakpoint and pushes the CSS-facing values (card size,
// perspective) onto the scene element as custom properties, scoped to this
// component instance rather than the document root.
export const applyViewport = (scene: HTMLElement, view: Viewport): void => {
  const bp = pickBreakpoint();
  view.span = window.innerHeight * config.scene.spanFactor;
  view.radius = bp.radius;

  scene.style.setProperty('--card-width', `${bp.cardWidth}px`);
  scene.style.setProperty('--card-height', `${bp.cardHeight}px`);
  scene.style.setProperty('--perspective', `${bp.perspective}px`);
};
