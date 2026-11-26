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
import StartPathScreen from '../screens/Auth/StartPath/StartPathScreen';
import AccountStatusScreen from '../screens/Auth/AccountStatus/AccountStatusScreen';
import BackupExportScreen from '../screens/Settings/BackupExport/BackupExportScreen';
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
  StartPath: 'StartPath',
  AccountStatus: 'AccountStatus',
  BackupExport: 'BackupExport',
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
 * ── Admin: trial ended · plan ended · suspended · deactivated ──
 *
 * AccountStatus says which, and never that data is gone: an owner whose
 * trial or plan ended can still download a full backup (Backup & export is
 * registered here; the server lets owners reach it while lapsed), request
 * activation or book a call. A suspension or deactivation points to support.
 */
export const INACTIVE_ROUTES: IRoute[] = [
  { title: AuthRouteNames.AccountStatus, component: AccountStatusScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.BackupExport, component: BackupExportScreen },
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
 * The company exists but nothing was chosen yet: the owner picks how to
 * start — the free trial (instant when eligible) or a request for approval —
 * on StartPath. An owner who left half-way resumes here. A draft 403s every
 * business request, so AdminTabs is only reached once the server says active.
 */
export const DRAFT_COMPANY_ROUTES: IRoute[] = [
  { title: AuthRouteNames.StartPath, component: StartPathScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.PendingApproval, component: PendingApprovalScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.AdminTabs, component: AdminTabNavigator, options: { animation: 'none' } },
];

/** ── Admin: onboarding (no company yet) ── */
export const COMPANY_ONBOARDING_ROUTES: IRoute[] = [
  { title: AuthRouteNames.CompanySetup, component: CompanySetupScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.CompanyTypeSelect, component: CompanyTypeSelectScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.CreateCompany, component: CreateCompanyScreen, options: { animation: 'none' } },
  { title: AuthRouteNames.JoinCompany, component: JoinCompanyScreen, options: { animation: 'none' } },
  // CreateCompany marks the company a draft; the navigator then moves to the
  // draft branch, which opens on StartPath (trial or approval).
  { title: AuthRouteNames.StartPath, component: StartPathScreen },
  { title: AuthRouteNames.PendingApproval, component: PendingApprovalScreen },
  // { title: AuthRouteNames.SubscriptionSelect, component: SubscriptionSelectScreen },
  // { title: AuthRouteNames.SubscriptionPay, component: SubscriptionPayScreen },
  { title: AuthRouteNames.AdminTabs, component: AdminTabNavigator, options: { animation: 'none' } },
];
