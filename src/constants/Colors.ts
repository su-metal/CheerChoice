/**
 * CheerChoice Color Palette
 *
 * Design: US fitness-focused women (Sarah persona)
 * Tone: Positive, energetic, fresh, feminine
 */

export const Colors = {
  // Primary Colors - Vivid Pink/Magenta (Energetic)
  primary: '#f425af',
  primaryLight: '#f968c6',
  primaryDark: '#d11d94',

  // Secondary Colors - Orange (Healthy & Warning)
  secondary: '#ff8c42',
  secondaryLight: '#ffa771',
  secondaryDark: '#e66e2a',

  // Accent Colors - Deep Magenta (Premium)
  accent: '#f425af',
  accentLight: '#f968c6',
  accentDark: '#d11d94',

  // Background Colors
  background: '#fdf8fb',
  backgroundDark: '#22101c',
  surface: '#FFFFFF',
  surfaceAlt: '#f8fafc',

  // Text Colors
  text: '#0f172a',
  textLight: '#64748b',
  textExtraLight: '#94a3b8',

  // Semantic Colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Special Colors
  overlay: 'rgba(15, 23, 42, 0.6)',
  border: '#f1f5f9',
  divider: '#f1f5f9',

  // Gradients
  gradientPrimary: ['#f425af', '#ff8c42'],
  gradientSecondary: ['#ff8c42', '#f425af'],
  gradientAccent: ['#f425af', '#ff8c42'],
} as const;

export type ColorKey = keyof typeof Colors;
