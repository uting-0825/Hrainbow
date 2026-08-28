'use client';

import { useEffect, useRef } from 'react';

export default function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frame = 0;
    let stopped = false;
    let cleanup = () => {};

    const boot = async () => {
      const THREE = await import('three');
      if (stopped) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
      camera.position.z = 4.5;

      const count = 58;
      const positions = new Float32Array(count * 3);
      for (let index = 0; index < count; index += 1) {
        positions[index * 3] = (Math.random() - 0.5) * 7.5;
        positions[index * 3 + 1] = (Math.random() - 0.5) * 4.2;
        positions[index * 3 + 2] = (Math.random() - 0.5) * 1.4;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0xf2d7a0,
        size: 0.025,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const dust = new THREE.Points(geometry, material);
      scene.add(dust);

      const pointer = { x: 0, y: 0 };
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const resize = () => {
        const { clientWidth, clientHeight } = canvas;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / Math.max(clientHeight, 1);
        camera.updateProjectionMatrix();
      };
      const onPointer = (event: PointerEvent) => {
        pointer.x = event.clientX / window.innerWidth - 0.5;
        pointer.y = event.clientY / window.innerHeight - 0.5;
      };
      const render = (time = 0) => {
        dust.rotation.z = time * 0.000012;
        dust.rotation.x += (pointer.y * 0.05 - dust.rotation.x) * 0.025;
        dust.rotation.y += (pointer.x * 0.08 - dust.rotation.y) * 0.025;
        renderer.render(scene, camera);
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

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onPointer);
        document.removeEventListener('visibilitychange', onVisibility);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    };

    void boot();
    return () => {
      stopped = true;
      cleanup();
    };
  }, []);

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />;
}
