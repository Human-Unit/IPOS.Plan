/** Seconds for Motion, milliseconds for the native View Transition. */
export const motionTiming = {
  press: 0.14,
  surface: 0.2,
  panel: 0.24,
  entrance: 0.32,
  wave: 620,
} as const;
export const motionEase = [0.22, 1, 0.36, 1] as const;
export const surfaceTransition = {
  duration: motionTiming.surface,
  ease: motionEase,
};
export const panelReveal = {
  initial: { opacity: 0, x: 6 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: motionTiming.panel, ease: motionEase },
};
