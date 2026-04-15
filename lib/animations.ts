/**
 * Enhanced Animation System for Habit Tracker
 * Provides smooth transitions and micro-animations for all UI components
 */

import { motion, AnimatePresence, MotionProps } from 'framer-motion';

// Animation duration constants
export const ANIMATION_DURATIONS = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

// Easing functions
export const EASING_FUNCTIONS = {
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  spring: [0.23, 1, 0.32, 1],
  bouncy: [0.68, -0.55, 0.265, 1.55],
} as const;

// Common animation variants
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideDownVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const slideLeftVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideRightVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const bounceVariants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300
    }
  },
  exit: { opacity: 0, scale: 0.3 },
};

// Stagger animations for lists
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Card hover animations
export const cardHoverProps: Partial<MotionProps> = {
  whileHover: { 
    y: -4,
    scale: 1.02,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
    }
  },
  whileTap: { scale: 0.98 },
};

// Button animations
export const buttonTapProps: Partial<MotionProps> = {
  whileTap: { scale: 0.95 },
  transition: {
    type: "spring",
    damping: 15,
    stiffness: 400,
  }
};

export const buttonHoverProps: Partial<MotionProps> = {
  whileHover: { scale: 1.05 },
  ...buttonTapProps,
};

// Drawer animations
export const drawerVariants = {
  hidden: { x: '-100%' },
  visible: { 
    x: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    }
  },
  exit: { 
    x: '-100%',
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING_FUNCTIONS.easeInOut,
    }
  },
};

// Modal animations
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 400,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING_FUNCTIONS.easeInOut,
    }
  },
};

// Overlay animations
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: ANIMATION_DURATIONS.normal }
  },
  exit: { 
    opacity: 0,
    transition: { duration: ANIMATION_DURATIONS.fast }
  },
};

// Loading skeleton animations
export const skeletonVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 1.5,
      ease: "easeInOut",
    }
  },
};

// Progress bar animations
export const progressVariants = {
  hidden: { width: "0%" },
  visible: (width: number) => ({
    width: `${width}%`,
    transition: {
      duration: ANIMATION_DURATIONS.slow,
      ease: EASING_FUNCTIONS.easeOut,
    }
  }),
};

// Tab switch animations
export const tabVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING_FUNCTIONS.easeOut,
    }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING_FUNCTIONS.easeIn,
    }
  },
};

// Notification animations
export const notificationVariants = {
  hidden: { opacity: 0, y: -50, scale: 0.8 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 400,
    }
  },
  exit: { 
    opacity: 0, 
    y: -50, 
    scale: 0.8,
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING_FUNCTIONS.easeIn,
    }
  },
};

// Custom hooks for animations
export const useStaggeredAnimation = (itemCount: number) => {
  return {
    container: staggerContainer,
    item: staggerItem,
    itemCount,
  };
};

// Responsive animation props
export const getResponsiveAnimation = (breakpoint: 'mobile' | 'tablet' | 'desktop') => {
  const baseProps = {
    initial: "hidden",
    animate: "visible",
    exit: "exit",
  };

  switch (breakpoint) {
    case 'mobile':
      return {
        ...baseProps,
        transition: { duration: ANIMATION_DURATIONS.fast },
      };
    case 'tablet':
      return {
        ...baseProps,
        transition: { duration: ANIMATION_DURATIONS.normal },
      };
    case 'desktop':
      return {
        ...baseProps,
        transition: { duration: ANIMATION_DURATIONS.slow },
      };
  }
};

// Reduced motion support
export const reducedMotionProps = {
  transition: { duration: 0 },
  whileHover: undefined,
  whileTap: undefined,
  animate: { opacity: 1 },
  initial: { opacity: 1 },
};

// Export commonly used components
export const AnimatedContainer = motion.div;
export const AnimatedCard = motion.div;
export const AnimatedButton = motion.button;
export const AnimatedInput = motion.input;

// Preset animation combinations
export const presets = {
  // For page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: {
      duration: ANIMATION_DURATIONS.normal,
      ease: EASING_FUNCTIONS.easeInOut,
    }
  },

  // For list items
  listItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING_FUNCTIONS.easeOut,
    }
  },

  // For modals
  modal: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 400,
    }
  },

  // For tooltips
  tooltip: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING_FUNCTIONS.easeOut,
    }
  },
};

export default {
  ANIMATION_DURATIONS,
  EASING_FUNCTIONS,
  fadeInVariants,
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  scaleVariants,
  bounceVariants,
  staggerContainer,
  staggerItem,
  cardHoverProps,
  buttonTapProps,
  buttonHoverProps,
  drawerVariants,
  modalVariants,
  overlayVariants,
  skeletonVariants,
  progressVariants,
  tabVariants,
  notificationVariants,
  useStaggeredAnimation,
  getResponsiveAnimation,
  reducedMotionProps,
  AnimatedContainer,
  AnimatedCard,
  AnimatedButton,
  AnimatedInput,
  presets,
};
