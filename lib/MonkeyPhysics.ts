export const SWING_SPRING = {
  type: "spring",
  stiffness: 100,
  damping: 10,
  mass: 1
};

export const ROAM_TRANSITION = {
  duration: 4,
  ease: "easeInOut"
};

export const GREETING_TRANSITION = {
  type: "spring",
  stiffness: 260,
  damping: 20
};

export const getSwingRotation = (t: number) => {
  return Math.sin(t * Math.PI * 2) * 15;
};
