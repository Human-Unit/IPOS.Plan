"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";

/** Emphasise a real change, retaining the real number even on the first paint. */
export function ChangingNumber({
  value,
  ready,
}: {
  value: number;
  ready: boolean;
}) {
  const previous = useRef<number | undefined>(undefined);
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!ready) return;
    if (
      previous.current !== undefined &&
      previous.current !== value &&
      !reduced
    )
      void controls.start({
        opacity: [0.55, 1],
        transition: { duration: 0.2 },
      });
    previous.current = value;
  }, [value, ready, controls, reduced]);
  return (
    <motion.strong initial={false} animate={controls}>
      {value}
    </motion.strong>
  );
}
