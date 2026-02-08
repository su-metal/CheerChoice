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
    fontSize: Fonts.size['5xl'],
    fontWeight: Fonts.weight.bold,
    lineHeight: Fonts.size['5xl'] * Fonts.lineHeight.tight,
  },
  h2: {
    fontSize: Fonts.size['4xl'],
    fontWeight: Fonts.weight.bold,
    lineHeight: Fonts.size['4xl'] * Fonts.lineHeight.tight,
  },
  h3: {
    fontSize: Fonts.size['3xl'],
    fontWeight: Fonts.weight.semibold,
    lineHeight: Fonts.size['3xl'] * Fonts.lineHeight.normal,
  },
  h4: {
    fontSize: Fonts.size['2xl'],
    fontWeight: Fonts.weight.semibold,
    lineHeight: Fonts.size['2xl'] * Fonts.lineHeight.normal,
  },
  h5: {
    fontSize: Fonts.size.xl,
    fontWeight: Fonts.weight.medium,
    lineHeight: Fonts.size.xl * Fonts.lineHeight.normal,
  },

  // Body Text
  bodyLarge: {
    fontSize: Fonts.size.lg,
    fontWeight: Fonts.weight.regular,
    lineHeight: Fonts.size.lg * Fonts.lineHeight.relaxed,
  },
  body: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.regular,
    lineHeight: Fonts.size.md * Fonts.lineHeight.relaxed,
  },
  bodySmall: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.regular,
    lineHeight: Fonts.size.sm * Fonts.lineHeight.normal,
  },

  // Special
  caption: {
    fontSize: Fonts.size.xs,
    fontWeight: Fonts.weight.regular,
    lineHeight: Fonts.size.xs * Fonts.lineHeight.normal,
  },
  button: {
    fontSize: Fonts.size.md,
    fontWeight: Fonts.weight.semibold,
    lineHeight: Fonts.size.md * Fonts.lineHeight.tight,
    textTransform: 'uppercase' as const,
    letterSpacing: Fonts.letterSpacing.wide,
  },
  label: {
    fontSize: Fonts.size.sm,
    fontWeight: Fonts.weight.medium,
    lineHeight: Fonts.size.sm * Fonts.lineHeight.normal,
  },
} as const;

export type TypographyKey = keyof typeof Typography;
