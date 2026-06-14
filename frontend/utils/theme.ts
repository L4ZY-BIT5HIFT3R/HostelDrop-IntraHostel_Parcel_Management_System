// HostelDrop design system — "Mailroom"
// Art direction: an analog hostel receiving desk. Kraft-paper canvas, rubber-stamp
// status tags, manila-tag cards with dashed perforations, and monospace tracking
// codes (PF1024) as a hero motif. One signature ink — vermilion (priority-mail red) —
// with teal / ink-blue / forest as secondary "stamp inks".
// Every historical token key is preserved so existing screens inherit the new look.

import { Platform } from 'react-native';

export const Colors = {
  // Paper canvas & surfaces (warm kraft tones)
  bg: '#ECE5D6',                    // Kraft desk surface
  surface: '#F7F2E7',               // Manila tag / lighter paper
  surfaceBorder: '#D8CDB4',         // Kraft edge
  surfaceHover: '#EFE8D8',          // Pressed / input fill

  // Ink text
  textPrimary: '#221D16',           // Warm near-black ink
  textSecondary: '#6E6151',         // Faded ink / taupe
  textMuted: '#9C8F78',             // Pencil gray

  // Signature ink — vermilion (priority-mail red)
  accent: '#D23F1C',
  accentPressed: '#AE3216',
  accentDim: 'rgba(210, 63, 28, 0.12)',

  // Status — rubber-stamp inks
  pending: '#A9701A',               // Ochre stamp (awaiting pickup)
  pendingBg: '#F0E2C4',
  unassigned: '#857653',            // Sepia stamp (needs assignment)
  unassignedBg: '#E7DDC6',
  delivered: '#2E6B3E',             // Forest stamp (collected)
  deliveredBg: '#D8E6CC',
  error: '#B5371A',                 // Deep vermilion
  errorBg: 'rgba(181, 55, 26, 0.12)',

  // Named "stamp inks" used across screens
  accentGreen: '#2E6B3E',
  accentGreenDim: 'rgba(46, 107, 62, 0.12)',
  accentBlue: '#2A4D8F',            // Postal ink-blue
  accentBlueDim: 'rgba(42, 77, 143, 0.12)',
  accentRed: '#B5371A',
  accentRedDim: 'rgba(181, 55, 26, 0.12)',
  accentAmber: '#A9701A',
  accentAmberDim: 'rgba(169, 112, 26, 0.12)',
  accentTeal: '#1F6E66',            // Customs-stamp teal
  accentTealDim: 'rgba(31, 110, 102, 0.12)',

  // UI elements
  tabBar: '#F7F2E7',
  tabBarBorder: '#D8CDB4',
  overlay: 'rgba(34, 29, 22, 0.55)',
};

// Distinctive typography: a monospace "tracking code" family is the signature.
export const Fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

// Paper sits flat-ish on the desk: crisp borders over heavy float.
export const Shadows = {
  card: {
    shadowColor: '#3B3122',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  button: {
    shadowColor: '#7A2613',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  subtle: {
    shadowColor: '#3B3122',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
};

// Squared, tag-like corners — not soft SaaS pills.
export const Radii = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 12,
  pill: 999,
};

export const MinimalCard = {
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.surfaceBorder,
  borderRadius: Radii.lg,
  ...Shadows.card,
};

export const MinimalInput = {
  backgroundColor: Colors.surfaceHover,
  borderWidth: 1,
  borderColor: Colors.surfaceBorder,
  borderRadius: Radii.md,
};

// Backward-compatible aliases used across existing screens.
export const GlassCard = MinimalCard;
export const GlassInput = MinimalInput;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  page: 28,
  section: 32,
};

export const Typography = {
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.2 },
  h3: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '500' as const },
  caption: { fontSize: 14, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.2 },
  // Tracking-code / stamp lettering
  mono: { fontFamily: Fonts.mono, letterSpacing: 1 },
  stamp: { fontWeight: '800' as const, letterSpacing: 2, textTransform: 'uppercase' as const },
};
