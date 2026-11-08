// ═══════════════════════════════════════════════════════
// FinMatrix — Sign-in portals
// ═══════════════════════════════════════════════════════
// The one place that says which doors the app has, what each is called, and
// which credential it takes. RoleSelection draws its cards from this, SignIn
// its header and fields, and the network layer the `portal` it posts.
//
// Each portal maps to exactly one server portal (POST /auth/signin `portal`),
// and the server refuses an account that belongs on another door with
// WRONG_PORTAL before issuing a token. So the door a person picks here is not
// a hint: it is checked. The server names the account's real type in
// `details.accountType`, and wrongPortalNotice() turns that into the app's
// own words — the server's message is written for the web console, which has
// no Delivery Portal and tells riders to "use the Android app".

import type { UserRole } from '../types';

export type SignInPortal = 'admin' | 'staff' | 'delivery';

export type PortalIcon = 'briefcase' | 'user' | 'truck';

export interface SignInPortalInfo {
  /** The name used on the card, the sign-in pill and every notice. */
  title: string;
  /** Who the door is for — the card's one line of description. */
  audience: string;
  icon: PortalIcon;
  /** Owners have an inbox; staff and riders get a username from the owner. */
  credential: 'email' | 'username';
  /** Said on the card so people have the right credential ready. */
  credentialHint: string;
  signInSubtitle: string;
}

export const PORTAL_ORDER: readonly SignInPortal[] = ['admin', 'staff', 'delivery'];

const USERNAME_HINT = 'Sign in with the username your company gave you';

export const SIGN_IN_PORTALS: Record<SignInPortal, SignInPortalInfo> = {
  admin: {
    title: 'Business Portal',
    audience: 'For owners and administrators, with full access to the business.',
    icon: 'briefcase',
    credential: 'email',
    credentialHint: 'Sign in with your email address',
    signInSubtitle: 'Sign in to manage your business.',
  },
  staff: {
    title: 'Staff Portal',
    audience: 'For sales, warehouse and office staff at your company.',
    icon: 'user',
    credential: 'username',
    credentialHint: USERNAME_HINT,
    signInSubtitle: 'Sign in with the login your company gave you.',
  },
  delivery: {
    title: 'Delivery Portal',
    audience: 'For delivery riders: your assigned deliveries and proof of delivery.',
    icon: 'truck',
    credential: 'username',
    credentialHint: USERNAME_HINT,
    signInSubtitle: 'Sign in to see the deliveries assigned to you.',
  },
};

/**
 * The door for a role. A platform console account is admitted by the server
 * on the owner door only, and anything unrecognised falls back to it too —
 * the owner door is the one a stranger to the app most likely wants.
 */
export const portalForRole = (role: UserRole | string | null | undefined): SignInPortal =>
  role === 'staff' || role === 'delivery' ? role : 'admin';

export interface WrongPortalNotice {
  title: string;
  message: string;
  /** Null when no door in this app admits the account. */
  switchTo: SignInPortal | null;
  switchLabel: string | null;
}

/**
 * What to tell someone whose password was right but whose account belongs on
 * another door. Only reachable after the server accepted the password, so
 * naming the account type tells nothing to anyone but its owner.
 */
export const wrongPortalNotice = (
  accountType: UserRole | string | null | undefined,
): WrongPortalNotice => {
  const title = 'Wrong portal';
  switch (accountType) {
    case 'admin':
      return {
        title,
        message: 'This is a business owner account. Sign in on the Business Portal with your email address.',
        switchTo: 'admin',
        switchLabel: 'Go to Business Portal',
      };
    case 'staff':
      return {
        title,
        message: 'This is a staff account. Sign in on the Staff Portal.',
        switchTo: 'staff',
        switchLabel: 'Go to Staff Portal',
      };
    case 'delivery':
      return {
        title,
        message: 'This is a delivery rider account. Sign in on the Delivery Portal.',
        switchTo: 'delivery',
        switchLabel: 'Go to Delivery Portal',
      };
    case 'super_admin':
      return {
        title,
        message: 'This account signs in through the FinMatrix Admin app.',
        switchTo: null,
        switchLabel: null,
      };
    default:
      return {
        title,
        message: 'This account cannot sign in on this portal.',
        switchTo: null,
        switchLabel: null,
      };
  }
};
