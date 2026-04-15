/**
 * Responsive Design System for Habit Tracker
 * Mobile-first approach with consistent breakpoints and utilities
 */

import { useState, useEffect } from 'react'

// Breakpoint System
export const BREAKPOINTS = {
  xs: '475px',
  sm: '640px', 
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  // Custom breakpoints
  mobile: { max: '767px' },
  tablet: { min: '768px', max: '1023px' },
  desktop: { min: '1024px' },
  'large-desktop': { min: '1280px' },
} as const

// Container System
export const CONTAINER_SIZES = {
  mobile: '100%',
  tablet: '768px',
  desktop: '1024px',
  large: '1280px',
  xl: '1440px',
}

// Spacing System
export const SPACING = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
}

// Touch-friendly sizing
export const TOUCH_SIZES = {
  min: '44px',    // Minimum touch target
  comfortable: '48px',
  large: '52px',
}

// Grid System
export const GRID_SYSTEM = {
  mobile: { cols: 1, gap: '1rem' },
  tablet: { cols: 2, gap: '1.5rem' },
  desktop: { cols: 3, gap: '2rem' },
  large: { cols: 4, gap: '2rem' },
}

// Typography Scale
export const TYPOGRAPHY = {
  mobile: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
  },
  tablet: {
    xs: '0.875rem',
    sm: '1rem',
    base: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    '2xl': '1.875rem',
    '3xl': '2.25rem',
  },
  desktop: {
    xs: '0.875rem',
    sm: '1rem',
    base: '1.125rem',
    lg: '1.5rem',
    xl: '1.875rem',
    '2xl': '2.25rem',
    '3xl': '3rem',
  }
}

// Animation Durations
export const ANIMATIONS = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '800ms',
}

// Easing Functions
export const EASING = {
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  spring: 'cubic-bezier(0.23, 1, 0.32, 1)',
}

// Component-specific responsive props
export const COMPONENT_SIZES = {
  button: {
    mobile: { height: '44px', padding: '0 1rem', fontSize: '0.875rem' },
    tablet: { height: '48px', padding: '0 1.25rem', fontSize: '1rem' },
    desktop: { height: '52px', padding: '0 1.5rem', fontSize: '1rem' },
  },
  card: {
    mobile: { padding: '1rem', borderRadius: '0.75rem' },
    tablet: { padding: '1.5rem', borderRadius: '1rem' },
    desktop: { padding: '2rem', borderRadius: '1.25rem' },
  },
  input: {
    mobile: { height: '44px', padding: '0 1rem', fontSize: '1rem' },
    tablet: { height: '48px', padding: '0 1.25rem', fontSize: '1rem' },
    desktop: { height: '52px', padding: '0 1.5rem', fontSize: '1.125rem' },
  }
}

// Media Query Helper Functions
export const mediaQuery = {
  mobile: `(max-width: ${BREAKPOINTS.mobile.max})`,
  tablet: `(min-width: ${BREAKPOINTS.tablet.min}) and (max-width: ${BREAKPOINTS.tablet.max})`,
  desktop: `(min-width: ${BREAKPOINTS.desktop.min})`,
  'large-desktop': `(min-width: ${BREAKPOINTS['large-desktop'].min})`,
  
  // Range queries
  upFrom: (breakpoint: string) => `(min-width: ${breakpoint})`,
  downTo: (breakpoint: string) => `(max-width: ${breakpoint})`,
  between: (min: string, max: string) => `(min-width: ${min}) and (max-width: ${max})`,
}

// Responsive utility functions
export const getResponsiveValue = (values: any, breakpoint: string = 'mobile') => {
  if (typeof values === 'string' || typeof values === 'number') {
    return values
  }
  return values[breakpoint] || values.mobile || values.base
}

// Grid helper
export const getGridClasses = (breakpoint: string = 'mobile') => {
  const grid = (GRID_SYSTEM as any)[breakpoint] || GRID_SYSTEM.mobile
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
    gap: grid.gap,
  }
}

// Touch-friendly utilities
export const getTouchClasses = (size: string = 'min') => {
  const touchSize = (TOUCH_SIZES as any)[size]
  return {
    minHeight: touchSize,
    minWidth: touchSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

// Animation utilities
export const getTransitionProps = (duration: string = 'normal', easing: string = 'ease') => {
  return {
    transition: `all ${(ANIMATIONS as any)[duration]} ${(EASING as any)[easing]}`,
  }
}

// Dark mode utilities
export const getDarkModeClasses = (light: any, dark: any) => {
  return {
    [light]: true,
    'dark': true,
    [dark]: true,
  }
}

// Layout utilities
export const LAYOUT_CLASSES = {
  container: 'responsive-container',
  card: 'responsive-card',
  grid: 'responsive-grid',
  text: {
    xs: 'responsive-text-xs',
    sm: 'responsive-text-sm',
    base: 'responsive-text-base',
    lg: 'responsive-text-lg',
    xl: 'responsive-text-xl',
  },
  touch: {
    target: 'touch-target',
    button: 'touch-button',
  }
}

// Device detection helpers
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 767
}

export const isTabletDevice = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= 768 && window.innerWidth <= 1023
}

export const isDesktopDevice = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= 1024
}

// Responsive hook for React components
export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState('mobile')
  
  useEffect(() => {
    const updateBreakpoint = () => {
      if (isMobileDevice()) setBreakpoint('mobile')
      else if (isTabletDevice()) setBreakpoint('tablet')
      else setBreakpoint('desktop')
    }
    
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])
  
  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    getResponsiveValue: (values: any) => getResponsiveValue(values, breakpoint),
    getGridClasses: () => getGridClasses(breakpoint),
    getTouchClasses: (size: string) => getTouchClasses(size),
    getTransitionProps: (duration: string, easing: string) => getTransitionProps(duration, easing),
  }
}
