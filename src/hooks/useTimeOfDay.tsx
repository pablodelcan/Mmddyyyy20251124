import { useState, useEffect } from 'react';

interface TimeOfDayColors {
  background: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  hover: string;
  checkbox: string;
  checkboxCompleted: string;
  pink: string;
}

export const useTimeOfDay = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check system preference on initial load
    if (typeof window !== 'undefined' && window.matchMedia) {
      const result = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('[useTimeOfDay] Initial dark mode check:', result);
      return result;
    }
    console.log('[useTimeOfDay] matchMedia not available, defaulting to light mode');
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    console.log('[useTimeOfDay] Setting up listener, current matches:', mediaQuery.matches);

    // Update immediately in case it changed
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      console.log('[useTimeOfDay] Dark mode changed:', e.matches);
      setIsDarkMode(e.matches);
    };

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Return 'day' or 'night' based on system preference
  const result = isDarkMode ? 'night' : 'day';
  console.log('[useTimeOfDay] Returning:', result);
  return result;
};

function getTimeOfDayColors(): TimeOfDayColors {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Time periods (in minutes from midnight)
  const sunriseStart = 5.5 * 60; // 5:30 AM
  const sunriseEnd = 7 * 60;     // 7:00 AM
  const sunsetStart = 18 * 60;   // 6:00 PM
  const sunsetEnd = 19.5 * 60;   // 7:30 PM

  // Sunrise (5:30 AM - 7:00 AM)
  if (timeInMinutes >= sunriseStart && timeInMinutes < sunriseEnd) {
    const progress = (timeInMinutes - sunriseStart) / (sunriseEnd - sunriseStart);
    return getSunriseColors(progress);
  }

  // Day (7:00 AM - 6:00 PM)
  if (timeInMinutes >= sunriseEnd && timeInMinutes < sunsetStart) {
    return {
      background: '#fdf5ed',
      textPrimary: 'rgba(0, 0, 0, 0.9)',
      textSecondary: 'rgba(0, 0, 0, 0.6)',
      textTertiary: 'rgba(0, 0, 0, 0.4)',
      border: 'rgba(0, 0, 0, 0.1)',
      hover: 'rgba(0, 0, 0, 0.05)',
      checkbox: 'rgba(0, 0, 0, 1)',
      checkboxCompleted: 'rgba(0, 0, 0, 0.4)',
      pink: '#be8bad'
    };
  }

  // Sunset (6:00 PM - 7:30 PM)
  if (timeInMinutes >= sunsetStart && timeInMinutes < sunsetEnd) {
    const progress = (timeInMinutes - sunsetStart) / (sunsetEnd - sunsetStart);
    return getSunsetColors(progress);
  }

  // Night (7:30 PM - 5:30 AM)
  return {
    background: '#1a1a1a',
    textPrimary: 'rgba(255, 255, 255, 0.95)',
    textSecondary: 'rgba(255, 255, 255, 0.65)',
    textTertiary: 'rgba(255, 255, 255, 0.4)',
    border: 'rgba(255, 255, 255, 0.15)',
    hover: 'rgba(255, 255, 255, 0.08)',
    checkbox: 'rgba(255, 255, 255, 0.9)',
    checkboxCompleted: 'rgba(255, 255, 255, 0.3)',
    pink: '#e5a8d0'
  };
}

function getSunriseColors(progress: number): TimeOfDayColors {
  // Transition from night to day through sunrise gradient
  const bgGradient = `linear-gradient(to bottom, 
    ${interpolateColor('#2d1b3d', '#ffd6a5', progress)}, 
    ${interpolateColor('#1a1a1a', '#ffb8a5', progress * 0.8)}, 
    ${interpolateColor('#1a1a1a', '#fdf5ed', progress)})`;

  return {
    background: bgGradient,
    textPrimary: interpolateColor('rgba(255, 255, 255, 0.95)', 'rgba(0, 0, 0, 0.9)', progress),
    textSecondary: interpolateColor('rgba(255, 255, 255, 0.65)', 'rgba(0, 0, 0, 0.6)', progress),
    textTertiary: interpolateColor('rgba(255, 255, 255, 0.4)', 'rgba(0, 0, 0, 0.4)', progress),
    border: interpolateColor('rgba(255, 255, 255, 0.15)', 'rgba(0, 0, 0, 0.1)', progress),
    hover: interpolateColor('rgba(255, 255, 255, 0.08)', 'rgba(0, 0, 0, 0.05)', progress),
    checkbox: interpolateColor('rgba(255, 255, 255, 0.9)', 'rgba(0, 0, 0, 1)', progress),
    checkboxCompleted: interpolateColor('rgba(255, 255, 255, 0.3)', 'rgba(0, 0, 0, 0.4)', progress),
    pink: interpolateColor('#e5a8d0', '#be8bad', progress)
  };
}

function getSunsetColors(progress: number): TimeOfDayColors {
  // Transition from day to night through sunset gradient
  const bgGradient = `linear-gradient(to bottom, 
    ${interpolateColor('#fdf5ed', '#ff6b6b', progress * 0.5)}, 
    ${interpolateColor('#fdf5ed', '#ee5a6f', progress * 0.7)}, 
    ${interpolateColor('#fdf5ed', '#c44569', progress * 0.85)}, 
    ${interpolateColor('#fdf5ed', '#1a1a1a', progress)})`;

  return {
    background: bgGradient,
    textPrimary: interpolateColor('rgba(0, 0, 0, 0.9)', 'rgba(255, 255, 255, 0.95)', progress),
    textSecondary: interpolateColor('rgba(0, 0, 0, 0.6)', 'rgba(255, 255, 255, 0.65)', progress),
    textTertiary: interpolateColor('rgba(0, 0, 0, 0.4)', 'rgba(255, 255, 255, 0.4)', progress),
    border: interpolateColor('rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.15)', progress),
    hover: interpolateColor('rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.08)', progress),
    checkbox: interpolateColor('rgba(0, 0, 0, 1)', 'rgba(255, 255, 255, 0.9)', progress),
    checkboxCompleted: interpolateColor('rgba(0, 0, 0, 0.4)', 'rgba(255, 255, 255, 0.3)', progress),
    pink: interpolateColor('#be8bad', '#e5a8d0', progress)
  };
}

function interpolateColor(color1: string, color2: string, progress: number): string {
  // Handle rgba colors
  if (color1.startsWith('rgba') && color2.startsWith('rgba')) {
    const rgba1 = color1.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 1];
    const rgba2 = color2.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 1];

    const r = Math.round(rgba1[0] + (rgba2[0] - rgba1[0]) * progress);
    const g = Math.round(rgba1[1] + (rgba2[1] - rgba1[1]) * progress);
    const b = Math.round(rgba1[2] + (rgba2[2] - rgba1[2]) * progress);
    const a = rgba1[3] + (rgba2[3] - rgba1[3]) * progress;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Handle hex colors
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);

  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);

  const r = Math.round(r1 + (r2 - r1) * progress);
  const g = Math.round(g1 + (g2 - g1) * progress);
  const b = Math.round(b1 + (b2 - b1) * progress);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
