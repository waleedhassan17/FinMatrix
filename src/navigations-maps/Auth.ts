// ═══════════════════════════════════════════════════════
// FinMatrix — Auth / onboarding navigation map
// ═══════════════════════════════════════════════════════
// Route lists for BaseNavigator's session-gate branches (Consultant_Mobile
// convention). Which BRANCH renders is decided by auth/company state in
// BaseNavigator; which NAVIGATOR mounts at the top level is decided by
// AppContainer.renderNavigator(). Route names must never change — deep links
// (finmatrix://) and navigate() strings depend on them.

import type { IRoute } from './types';

import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import RoleSelectionScreen from '../screens/RoleSelection/RoleSelectionScreen';
import SignInScreen from '../screens/Auth/SignIn/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUp/SignUpScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPassword/ForgotPasswordScreen';
import EmailVerificationScreen from '../screens/Auth/EmailVerification/EmailVerificationScreen';
import CompanySetupScreen from '../screens/Auth/CompanySetup/CompanySetupScreen';
import CompanyTypeSelectScreen from '../screens/Auth/CompanyTypeSelect/CompanyTypeSelectScreen';
import CreateCompanyScreen from '../screens/Auth/CreateCompany/CreateCompanyScreen';
import JoinCompanyScreen from '../screens/Auth/JoinCompany/JoinCompanyScreen';
import PendingApprovalScreen from '../screens/Auth/PendingApproval/PendingApprovalScreen';
import CompanyRejectedScreen from '../screens/Auth/CompanyRejected/CompanyRejectedScreen';
import AdminTabNavigator from '../navigators/AdminTabNavigator';
// BILLING-DISABLED BUILD: the three subscription screens are no longer
// registered on any branch. The files stay in the tree.
// import SubscriptionSelectScreen from '../screens/Auth/SubscriptionSelect/SubscriptionSelectScreen';
// import RenewSubscriptionScreen from '../screens/Subscription/RenewSubscriptionScreen';
// import SubscriptionPayScreen from '../screens/Subscription/SubscriptionPayScreen';

export const AuthRouteNames = {
  Onboarding: 'Onboarding',
  RoleSelection: 'RoleSelection',
  SignIn: 'SignIn',
  SignUp: 'SignUp',
  ForgotPassword: 'ForgotPassword',
  EmailVerification: 'EmailVerification',
  PendingApproval: 'PendingApproval',
  CompanyRejected: 'CompanyRejected',
  // BILLING-DISABLED BUILD: un-comment with the route arrays below.
  // RenewSubscription: 'RenewSubscription',
  // SubscriptionPay: 'SubscriptionPay',
  // SubscriptionSelect: 'SubscriptionSelect',
  CompanySetup: 'CompanySetup',
  CompanyTypeSelect: 'CompanyTypeSelect',
  CreateCompany: 'CreateCompany',
  JoinCompany: 'JoinCompany',
  AdminTabs: 'AdminTabs',
} as const;

export type AuthRouteName = typeof AuthRouteNames[keyof typeof AuthRouteNames];

/** Shown once per install before RoleSelection. */
export const ONBOARDING_ROUTE: IRoute = {
  title: AuthRouteNames.Onboarding,
  component: OnboardingScreen,
  options: { animation: 'none' },
};

/** ── Unauthenticated flow ── */
export const UNAUTHENTICATED_ROUTES: IRoute[] = [
  { title: AuthRouteNames.RoleSelection, component: RoleSelectionScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.SignIn, component: SignInScreen },
  { title: AuthRouteNames.SignUp, component: SignUpScreen },
  { title: AuthRouteNames.ForgotPassword, component: ForgotPasswordScreen },
  { title: AuthRouteNames.EmailVerification, component: EmailVerificationScreen },
  // Reachable from SignIn when the server blocks a non-active login.
  { title: AuthRouteNames.PendingApproval, component: PendingApprovalScreen },
  { title: AuthRouteNames.CompanyRejected, component: CompanyRejectedScreen },
];

/** ── Admin: email not verified ── */
export const EMAIL_VERIFY_ROUTES: IRoute[] = [
  { title: AuthRouteNames.EmailVerification, component: EmailVerificationScreen, options: { animation: 'none' } },
];

/** ── Admin: company submitted, awaiting approval ── */
export const PENDING_ROUTES: IRoute[] = [
  { title: AuthRouteNames.PendingApproval, component: PendingApprovalScreen, options: { animation: 'none' } },
];

/**
 * ── Admin: subscription expired / deactivated ──
 *
 * BILLING-DISABLED BUILD. The renew-only paywall (phase2.md Flow 2) was the
 * ONLY thing on this branch, so it could not simply be commented out: an
 * empty array makes Stack.Navigator throw "Couldn't find any screens for the
 * navigator", i.e. a white screen for any company a super-admin deactivates.
 *
 * So the branch now lands on CompanyRejectedScreen in its `inactive` mode,
 * which already says "Account deactivated — access is paused until an
 * administrator restores it" and offers sign-out. SignInScreen already sends
 * COMPANY_INACTIVE there too, so both paths converge on one screen.
 *
 * To restore: swap this array back to RENEW_ROUTES below and update the
 * import + usage in navigators/BaseNavigator.tsx.
 */
export const INACTIVE_ROUTES: IRoute[] = [
  {
    title: AuthRouteNames.CompanyRejected,
    component: CompanyRejectedScreen,
    options: { animation: 'none' },
    initialParams: { mode: 'inactive' },
  },
];

// export const RENEW_ROUTES: IRoute[] = [
//   {
//     title: AuthRouteNames.RenewSubscription,
//     component: RenewSubscriptionScreen,
//     options: { animation: 'none' },
//     initialParams: { mode: 'renew' },
//   },
//   { title: AuthRouteNames.SubscriptionPay, component: SubscriptionPayScreen },
// ];

/** ── Admin: company registration rejected ── */
export const REJECTED_ROUTES: IRoute[] = [
  {
    title: AuthRouteNames.CompanyRejected,
    component: CompanyRejectedScreen,
    options: { animation: 'none' },
    initialParams: { mode: 'rejected' },
  },
];

/**
 * ── Admin: company drafted ──
 *
 * BILLING-DISABLED BUILD. A draft used to resume at plan selection + submit.
 * With no plan step, the remaining work is the submit itself, so this branch
 * lands on PendingApproval — which auto-submits the draft on mount and then
 * shows the waiting screen.
 *
 * PendingApproval is not optional here. Left as just [AdminTabs] this branch
 * does not crash, but a draft company 403s every business request
 * (CompanyGuard: "Finish setting up your company to continue"), so the owner
 * would get a dashboard of failures with no way out.
 */
export const DRAFT_COMPANY_ROUTES: IRoute[] = [
  { title: AuthRouteNames.PendingApproval, component: PendingApprovalScreen, options: { animation: 'none' } },
  // { title: AuthRouteNames.SubscriptionSelect, component: SubscriptionSelectScreen, options: { animation: 'none' } },
  // { title: AuthRouteNames.SubscriptionPay, component: SubscriptionPayScreen },
  { title: AuthRouteNames.AdminTabs, component: AdminTabNavigator, options: { animation: 'none' } },
];

/** ── Admin: onboarding (no company yet) ── */
export const COMPANY_ONBOARDING_ROUTES: IRoute[] = [
  { title: AuthRouteNames.CompanySetup, component: CompanySetupScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.CompanyTypeSelect, component: CompanyTypeSelectScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.CreateCompany, component: CreateCompanyScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.JoinCompany, component: JoinCompanyScreen, options: { animation: 'none' } },
  // BILLING-DISABLED BUILD: CreateCompany now submits for approval itself, so
  // onboarding ends at PendingApproval rather than hopping to plan selection.
  { title: AuthRouteNames.PendingApproval, component: PendingApprovalScreen },
  // { title: AuthRouteNames.SubscriptionSelect, component: SubscriptionSelectScreen },
  // { title: AuthRouteNames.SubscriptionPay, component: SubscriptionPayScreen },
  { title: AuthRouteNames.AdminTabs, component: AdminTabNavigator, options: { animation: 'none' } },
];
