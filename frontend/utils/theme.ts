// Minimal Black & White Theme for HostelDrop
// Clean, modern design with generous whitespace and subtle gradients

export const Colors = {
  // Core palette - pure white/black with soft grays
  bg: '#FFFFFF',                    // Pure white background
  surface: '#F7F7F8',               // Soft off-white card surface
  surfaceBorder: '#EBEBED',         // Subtle gray border
  surfaceHover: '#F0F0F1',          // Lighter hover state
  
  // Text hierarchy
  textPrimary: '#111111',           // Near-black primary text
  textSecondary: '#6B6B6B',         // Medium gray secondary
  textMuted: '#A0A0A0',             // Light gray muted
  
  // Minimal accent (near-black for CTAs/buttons)
  accent: '#1A1A1A',
  accentDim: 'rgba(26, 26, 26, 0.08)',
  
  // Status colors - subdued monochrome tones
  pending: '#555555',               // Medium gray
  pendingBg: '#F0F0F0',
  unassigned: '#888888',            // Lighter gray  
  unassignedBg: '#F5F5F5',
  delivered: '#333333',             // Dark gray (success)
  deliveredBg: '#E8E8E8',
  error: '#C44',                    // Subdued red (only for errors)
  errorBg: 'rgba(196, 68, 68, 0.08)',
  
  // Legacy compatibility (map old colors to new)
  accentGreen: '#333333',
  accentGreenDim: 'rgba(51, 51, 51, 0.08)',
  accentBlue: '#555555',
  accentBlueDim: 'rgba(85, 85, 85, 0.08)',
  accentRed: '#C44',
  accentRedDim: 'rgba(196, 68, 68, 0.08)',
  accentAmber: '#888888',
  accentAmberDim: 'rgba(136, 136, 136, 0.08)',
  
  // UI elements
  tabBar: '#FFFFFF',
  tabBarBorder: '#EBEBED',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const MinimalCard = {
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.surfaceBorder,
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3, // Android shadow
};

export const MinimalInput = {
  backgroundColor: Colors.bg,
  borderWidth: 1,
  borderColor: Colors.surfaceBorder,
  borderRadius: 12,
};

// Backward-compatible aliases used across existing screens.
export const GlassCard = MinimalCard;
export const GlassInput = MinimalInput;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};

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
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '500' as const },
  caption: { fontSize: 14, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '500' as const },
};
