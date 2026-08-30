'use client';

import { useEffect, useRef } from 'react';

type DustParticle = {
  x: number;
  y: number;
  size: number;
  depth: number;
  phase: number;
  speed: number;
};

export default function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let width = 1;
    let height = 1;
    const pointer = { x: 0, y: 0 };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles: DustParticle[] = Array.from({ length: 58 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.7 + Math.random() * 1.65,
      depth: 0.35 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 0.8,
    }));

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(canvas.clientWidth, 1);
      height = Math.max(canvas.clientHeight, 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const onPointer = (event: PointerEvent) => {
      pointer.x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      pointer.y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
    };

    const render = (time = 0) => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        const drift = time * 0.000025 * particle.speed + particle.phase;
        const x = particle.x * width + Math.sin(drift) * 12 + pointer.x * 18 * particle.depth;
        const y = particle.y * height + Math.cos(drift * 0.72) * 8 + pointer.y * 12 * particle.depth;
        const alpha = 0.12 + (Math.sin(drift * 1.8) + 1) * 0.1;
        context.beginPath();
        context.fillStyle = `rgba(242, 215, 160, ${alpha})`;
        context.arc(x, y, particle.size * particle.depth, 0, Math.PI * 2);
        context.fill();
      });
    };

    const tick = (time: number) => {
      render(time);
      frame = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(tick);
    };

    resize();
    render();
    if (!reduced) frame = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />;
}
