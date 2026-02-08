/**
 * CheerChoice Color Palette
 *
 * Design: US fitness-focused women (Sarah persona)
 * Tone: Positive, energetic, fresh, feminine
 */

export const Colors = {
  // Primary Colors - Coral/Peach (Energetic & Feminine)
  primary: '#FF6B6B',      // Coral - main action color
  primaryLight: '#FF8E8E', // Light coral
  primaryDark: '#FF4949',  // Dark coral

  // Secondary Colors - Mint Green (Healthy & Fresh)
  secondary: '#6BCB77',    // Mint green - success, healthy choice
  secondaryLight: '#8DD99A',
  secondaryDark: '#4CAF50',

  // Accent Colors - Lavender (Calm & Premium)
  accent: '#A28FDB',       // Lavender - special moments
  accentLight: '#BDB0E8',
  accentDark: '#8B73CE',

  // Background Colors
  background: '#FFF8F0',   // Cream/off-white - warm, inviting
  surface: '#FFFFFF',      // Pure white for cards
  surfaceAlt: '#FFF5E9',   // Slightly darker cream

  // Text Colors
  text: '#2D3436',         // Dark charcoal - main text
  textLight: '#636E72',    // Medium gray - secondary text
  textExtraLight: '#B2BEC3', // Light gray - disabled/placeholder

  // Semantic Colors
  success: '#6BCB77',      // Same as secondary
  error: '#FF6B6B',        // Same as primary (keep positive tone)
  warning: '#FFD93D',      // Yellow - caution
  info: '#74B9FF',         // Light blue

  // Special Colors
  overlay: 'rgba(45, 52, 54, 0.6)', // Dark overlay for modals
  border: '#E1E8ED',       // Light border
  divider: '#F1F3F5',      // Very light divider

  // Gradients (for buttons, headers)
  gradientPrimary: ['#FF6B6B', '#FF8E8E'],
  gradientSecondary: ['#6BCB77', '#8DD99A'],
  gradientAccent: ['#A28FDB', '#BDB0E8'],
} as const;

export type ColorKey = keyof typeof Colors;
