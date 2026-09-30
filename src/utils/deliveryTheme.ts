// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Brand Tokens (DP_BRAND)
// ═══════════════════════════════════════════════════════
// The rider app's own palette. Separate from theme.ts on purpose: the admin app
// and the web console are navy, and the rider portal is green.
//
// The greens below were sampled from the product screenshot the colour was
// specified from — #2C9F1C is the "Continue Delivery" button fill, #248418 the
// darker stop of its header gradient. Hue ~113°, so the tints are derived on
// that hue rather than carried over from the teal this replaced, which would
// have read as a different colour sitting next to it.
//
// ⚠ ACCESSIBILITY — READ BEFORE CHANGING `primary`
//
// White text on #2C9F1C is 3.45:1. That clears the 3:1 bar for large text and
// UI components, and FAILS the 4.5:1 WCAG AA bar for body text. It was chosen
// deliberately, for brand fidelity, with the trade-off understood:
//
//   PASSES   userName 28px/800 on primary .......... 3.45  (large-text bar 3.0)
//            gradient end, primaryDark ............. 4.79
//            duty / date pill on the dark overlays . 4.59 / 5.48
//            primaryDark as text on white .......... 4.79
//            primaryDark as text on primarySoft .... 4.54
//
//   FAILS    white button label 15px/600 on primary  3.45  ← known exception
//            white greeting 11px/600 on primary .... 3.45  ← known exception
//
// Those two cannot be fixed without changing the colour, so they are recorded
// here rather than quietly tolerated, and deliveryTheme.test.ts excludes them
// BY NAME with this reason. Anything that puts white text on a brand fill and
// is not one of those two must use `primaryDark`.
//
// The header overlays were white-alpha and are now dark-alpha. That was a
// separate, pre-existing failure — the pills were 3.86–4.33:1 on the old teal,
// below AA before this change — and it is also what the screenshot shows: its
// "Off Duty" pill is darker than the header, not lighter.

export const DP_BRAND = {
  // Core brand ramp
  primary: '#2C9F1C', // the sampled button green — fills and identity
  primaryDark: '#248418', // gradient end / status bar / pressed / text on white
  // Lighter than it looks like it needs to be, on purpose: primaryDark as text
  // on this surface is 4.54:1, and on the more saturated #EAF6E8 it was 4.29 —
  // under AA. The tint is still distinct from white (1.05).
  primarySoft: '#F4FBF2', // tinted surface behind brand icons
  primaryBorder: '#D1E9CE', // hairline border for brand-tinted surfaces

  white: '#FFFFFF',

  // On-gradient text + overlays. Dark-alpha so a white label on top of them
  // clears AA over the brand green; white-alpha did not.
  headerTextSecondary: 'rgba(255, 255, 255, 0.92)',
  headerOverlay: 'rgba(15, 23, 42, 0.18)', // icon buttons on header
  headerOverlaySolid: 'rgba(15, 23, 42, 0.28)', // pills / badges on header
  headerOverlayBorder: 'rgba(255, 255, 255, 0.28)', // hairline on overlay pills
} as const;

export type DPBrand = typeof DP_BRAND;
