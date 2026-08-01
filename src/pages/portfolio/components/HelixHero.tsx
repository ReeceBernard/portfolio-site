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
    let frameId: number | null = null;
    let visible = false;

    const render = (elapsed: number) => {
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const card = CARDS[i]!;
        const progress = wrap(card.base + elapsed * config.scene.speed, config.scene.perStrand) / config.scene.perStrand;
        const angle = helixAngle(progress, card.phase);
        const y = (progress - 0.5) * view.span;
        el.style.transform = helixTransform(angle, y, view.radius);
        el.style.filter = depthFilter(depthOf(angle));
      });
    };

    const frame = (now: number) => {
      render((now - start) / 1000);
      frameId = visible ? requestAnimationFrame(frame) : null;
    };

    // Ambient rotation only costs anything while the hero is on screen and
    // motion isn't disabled — otherwise render one static frame and stop.
    const startLoop = () => {
      if (frameId !== null) return;
      if (reducedMotion.matches) {
        render(0);
      } else {
        frameId = requestAnimationFrame(frame);
      }
    };

    const stopLoop = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry!.isIntersecting;
        if (visible) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    observer.observe(scene);

    const handleMotionChange = () => {
      stopLoop();
      if (visible) startLoop();
    };
    reducedMotion.addEventListener('change', handleMotionChange);

    return () => {
      stopLoop();
      observer.disconnect();
      reducedMotion.removeEventListener('change', handleMotionChange);
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
