/**
 * CheerChoice Typography System
 *
 * Font Stack:
 * - Headings: System font (iOS: SF Pro, Android: Roboto)
 * - Body: System font
 * - Future: Poppins (headings), Inter (body)
 */

export const Fonts = {
  // Font Families
  heading: 'System',  // Will be replaced with Poppins later
  body: 'System',     // Will be replaced with Inter later
  mono: 'Courier',    // For numbers, code

  // Font Sizes
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },

  // Font Weights
  weight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

// Typography Presets (ready-to-use styles)
export const Typography = {
  // Headings
  h1: {
    fontSize: Fonts.size['6xl'],
    fontWeight: Fonts.weight.extrabold,
    lineHeight: 64,
    letterSpacing: -1.2,
  },
  h2: {
    fontSize: Fonts.size['4xl'],
    fontWeight: Fonts.weight.extrabold,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  h3: {
    fontSize: Fonts.size['3xl'],
    fontWeight: Fonts.weight.bold,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h4: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.bold,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h5: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.semibold,
    lineHeight: 26,
  },

  // Body Text
  bodyLarge: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.regular,
    lineHeight: 26,
  },
  body: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.regular,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    lineHeight: 20,
  },

  // Special
  eyebrow: {
    fontSize: 11,
    fontWeight: Fonts.weight.bold,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.medium,
    lineHeight: 16,
  },
  button: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.extrabold,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  label: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.semibold,
    lineHeight: 20,
  },
} as const;

export type TypographyKey = keyof typeof Typography;
