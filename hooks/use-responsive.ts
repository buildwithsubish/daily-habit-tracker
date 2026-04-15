/**
 * Responsive Hook for Habit Tracker
 * Provides breakpoint detection and responsive utilities
 */

import { useState, useEffect } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  width: number;
  height: number;
}

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        breakpoint: 'md',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        width: 1024,
        height: 768,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getCurrentBreakpoint(width);

    return {
      breakpoint,
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
      isLargeDesktop: width >= BREAKPOINTS.xl,
      width,
      height,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getCurrentBreakpoint(width);

      setState({
        breakpoint,
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isDesktop: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
        isLargeDesktop: width >= BREAKPOINTS.xl,
        width,
        height,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
};

function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// Responsive value hook
export const useResponsiveValue = <T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T => {
  const { breakpoint } = useResponsive();
  
  // Find the first matching breakpoint from largest to smallest
  const orderedBreakpoints: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  
  for (const bp of orderedBreakpoints) {
    if (values[bp] !== undefined) {
      // Check if current breakpoint is >= this breakpoint
      if (isBreakpointGte(breakpoint, bp)) {
        return values[bp]!;
      }
    }
  }
  
  return defaultValue;
};

function isBreakpointGte(current: Breakpoint, target: Breakpoint): boolean {
  const currentIndex = Object.keys(BREAKPOINTS).indexOf(current);
  const targetIndex = Object.keys(BREAKPOINTS).indexOf(target);
  return currentIndex >= targetIndex;
}

// Media query hook
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

// Common media query hooks
export const useIsMobile = () => {
  const responsive = useResponsive();
  return responsive.isMobile;
};

export const useIsTablet = () => {
  const responsive = useResponsive();
  return responsive.isTablet;
};

export const useIsDesktop = () => {
  const responsive = useResponsive();
  return responsive.isDesktop;
};

export const useIsLargeDesktop = () => {
  const responsive = useResponsive();
  return responsive.isLargeDesktop;
};

// Orientation hook
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
};

// Device detection hooks
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouch = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    setIsTouch(checkTouch());
  }, []);

  return isTouch;
};

export const useIsReducedMotion = () => {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
};

export const useIsDarkMode = () => {
  return useMediaQuery('(prefers-color-scheme: dark)');
};

// Responsive grid helper
export const useResponsiveGrid = (
  mobileCols: number,
  tabletCols: number,
  desktopCols: number,
  largeDesktopCols?: number
) => {
  const responsive = useResponsive();

  if (responsive.isLargeDesktop && largeDesktopCols) {
    return largeDesktopCols;
  }
  if (responsive.isDesktop) {
    return desktopCols;
  }
  if (responsive.isTablet) {
    return tabletCols;
  }
  return mobileCols;
};

// Container size helper
export const useContainerSize = () => {
  const responsive = useResponsive();

  const getContainerMaxWidth = () => {
    if (responsive.isLargeDesktop) return '1440px';
    if (responsive.isDesktop) return '1280px';
    if (responsive.isTablet) return '1024px';
    return '100%';
  };

  const getContainerPadding = () => {
    if (responsive.isMobile) return '1rem';
    if (responsive.isTablet) return '1.5rem';
    return '2rem';
  };

  return {
    maxWidth: getContainerMaxWidth(),
    padding: getContainerPadding(),
    className: `responsive-container ${responsive.isMobile ? 'mobile' : responsive.isTablet ? 'tablet' : 'desktop'}`,
  };
};

// Breakpoint watcher hook
export const useBreakpointWatcher = (
  breakpoint: Breakpoint,
  callback: (matches: boolean) => void
) => {
  const width = BREAKPOINTS[breakpoint];
  const query = `(min-width: ${width}px)`;
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    callback(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      callback(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query, callback]);
};

// Export all hooks
export default {
  useResponsive,
  useResponsiveValue,
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  useOrientation,
  useIsTouchDevice,
  useIsReducedMotion,
  useIsDarkMode,
  useResponsiveGrid,
  useContainerSize,
  useBreakpointWatcher,
};
