'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IdleFrame } from '../lib/dogGame';

export type MovementBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type Position = { x: number; y: number };

const START_POSITION: Position = { x: 48, y: 78 };
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export function useDogWander({
  enabled,
  movementBounds,
}: {
  enabled: boolean;
  movementBounds: MovementBounds;
}) {
  const [position, setPosition] = useState<Position>(START_POSITION);
  const [frame, setFrame] = useState<IdleFrame>('idle_front');
  const [isMoving, setIsMoving] = useState(false);
  const positionRef = useRef<Position>(START_POSITION);

  const reset = useCallback(() => {
    positionRef.current = START_POSITION;
    setPosition(START_POSITION);
    setFrame('idle_front');
    setIsMoving(false);
  }, []);

  const pause = useCallback(() => {
    setFrame('idle_front');
    setIsMoving(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;
    let decisionTimer: number | undefined;
    let animationFrame = 0;

    const scheduleDecision = (minMs = 2000, maxMs = 5000) => {
      decisionTimer = window.setTimeout(chooseBehavior, randomBetween(minMs, maxMs));
    };

    const startMoving = () => {
      const from = positionRef.current;
      const target = {
        x: randomBetween(movementBounds.minX, movementBounds.maxX),
        y: randomBetween(movementBounds.minY, movementBounds.maxY),
      };
      const distance = Math.hypot(target.x - from.x, (target.y - from.y) * 1.8);
      const duration = Math.max(2400, Math.min(6200, distance * 105));
      const direction = target.x < from.x ? 'left' : 'right';
      let startedAt = 0;
      let lastPaint = 0;
      let lastFrameChange = 0;
      let frameInterval = randomBetween(300, 450);
      let alternate = Math.random() > 0.5;

      setIsMoving(true);
      setFrame(`idle_${direction}_${alternate ? '02' : '01'}` as IdleFrame);

      const tick = (now: number) => {
        if (!alive) return;
        if (!startedAt) {
          startedAt = now;
          lastFrameChange = now;
        }
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const next = {
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
        };

        positionRef.current = next;
        if (now - lastPaint >= 28 || progress === 1) {
          lastPaint = now;
          setPosition(next);
        }

        if (now - lastFrameChange >= frameInterval) {
          alternate = !alternate;
          setFrame(`idle_${direction}_${alternate ? '02' : '01'}` as IdleFrame);
          lastFrameChange = now;
          frameInterval = randomBetween(300, 450);
        }

        if (progress < 1) animationFrame = requestAnimationFrame(tick);
        else {
          setIsMoving(false);
          setFrame('idle_front');
          scheduleDecision(1000, 3000);
        }
      };

      animationFrame = requestAnimationFrame(tick);
    };

    function chooseBehavior() {
      if (!alive) return;
      if (Math.random() < 0.74) startMoving();
      else {
        setIsMoving(false);
        setFrame('idle_front');
        scheduleDecision();
      }
    }

    scheduleDecision();
    return () => {
      alive = false;
      if (decisionTimer) window.clearTimeout(decisionTimer);
      cancelAnimationFrame(animationFrame);
    };
  }, [enabled, movementBounds.maxX, movementBounds.maxY, movementBounds.minX, movementBounds.minY]);

  return { position, frame: enabled ? frame : 'idle_front' as IdleFrame, isMoving: enabled && isMoving, pause, reset };
}
