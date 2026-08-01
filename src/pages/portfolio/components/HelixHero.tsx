import { useEffect, useRef } from 'react';
import { PERSONAL_INFO } from '../../home/lib/contants';
import { config } from './helix/config';
import { CARDS } from './helix/cards';
import { applyViewport, type Viewport } from './helix/viewport';
import { helixAngle, depthOf, helixTransform, depthFilter } from './helix/helixMath';
import { wrap } from './helix/math';
import './helix/helixHero.css';

export const HelixHero = () => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToNext = () => {
    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const view: Viewport = { span: 0, radius: 0 };
    const handleResize = () => applyViewport(scene, view);
    handleResize();
    window.addEventListener('resize', handleResize);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const start = performance.now();
    let frameId: number;

    const frame = (now: number) => {
      const elapsed = reducedMotion.matches ? 0 : (now - start) / 1000;

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const card = CARDS[i]!;
        const progress = wrap(card.base + elapsed * config.scene.speed, config.scene.perStrand) / config.scene.perStrand;
        const angle = helixAngle(progress, card.phase);
        const y = (progress - 0.5) * view.span;
        el.style.transform = helixTransform(angle, y, view.radius);
        el.style.filter = depthFilter(depthOf(angle));
      });

      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <section className="helix-scene" ref={sceneRef}>
      <div className="helix-world" ref={worldRef}>
        {CARDS.map((card, i) => (
          <div
            key={`${card.strand}-${card.index}`}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="helix-card"
            style={{ backgroundColor: card.color, backgroundImage: `url(${card.image})` }}
          />
        ))}
      </div>
      <div className="helix-vignette" />
      <div className="helix-overlay">
        <p className="helix-name">Reece Bernard</p>
        <p className="helix-title">{PERSONAL_INFO.title}</p>
        <button className="helix-scroll-cue" onClick={scrollToNext}>
          Scroll ↓
        </button>
      </div>
    </section>
  );
};
