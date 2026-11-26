// The app's launch logic: which status screen applies, what the session
// carries from the server, a refusal's reason, the countdown wording, and the
// launch copy the screens read.

import { endedState } from '../accountStatus';
import { subscriptionSummarySerializer, userResponseSerializer } from '../../serializers/authSerializer';
import { reasonOf } from '../../networks/launch/launchNetwork';
import { trialLabel } from '../../components/shared/TrialBanner';
import { LAUNCH, LAUNCH_ERRORS } from '../../config/launchStrings';
import type { SubscriptionSummary } from '../../types';

jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  toApiError: (e: unknown) => e,
}));
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const sub = (over: Partial<SubscriptionSummary> = {}): SubscriptionSummary => ({
  plan: 'warehouse_trial',
  planLabel: 'Free trial',
  expiryDate: '2026-12-20T07:00:00.000Z',
  paymentStatus: 'none',
  isTrial: true,
  trialStartedAt: '2026-11-20T07:00:00.000Z',
  trialConvertedAt: null,
  ...over,
});

describe('endedState', () => {
  it('suspended wins over everything; then trial ended; then plan ended; else deactivated', () => {
    expect(endedState({ companyStatus: 'inactive', subscription: sub({ suspended: true, trialEnded: true }) })).toBe('suspended');
    expect(endedState({ companyStatus: 'suspended', subscription: null })).toBe('suspended');
    expect(endedState({ companyStatus: 'inactive', subscription: sub({ trialEnded: true }) })).toBe('trialEnded');
    expect(
      endedState({ companyStatus: 'inactive', subscription: sub({ isTrial: false, subscriptionStatus: 'expired' }) }),
    ).toBe('planEnded');
    expect(endedState({ companyStatus: 'inactive', subscription: sub({ isTrial: false }) })).toBe('deactivated');
    expect(endedState(null)).toBe('deactivated');
  });
});

describe('session from the server', () => {
  it('keeps trialEnded, suspended and the subscription status', () => {
    const s = subscriptionSummarySerializer({ ...sub(), trialEnded: true, suspended: false, subscriptionStatus: 'expired' });
    expect(s).toMatchObject({ trialEnded: true, suspended: false, subscriptionStatus: 'expired' });
  });

  it('carries pendingKind, and drops one it does not know', () => {
    const backendUser = { id: 'u1', email: 'o@example.com', displayName: 'O', role: 'admin', companyId: 'c1' };
    expect(userResponseSerializer(backendUser, 'pending', { pendingKind: 'trial' }).pendingKind).toBe('trial');
    expect(userResponseSerializer(backendUser, 'pending', { pendingKind: 'approval' }).pendingKind).toBe('approval');
    expect(userResponseSerializer(backendUser, 'pending', { pendingKind: 'mystery' }).pendingKind).toBeNull();
  });
});

describe('reasonOf', () => {
  it('prefers details.reason, then the code', () => {
    expect(reasonOf({ code: 'TRIAL_NOT_ELIGIBLE', details: { reason: 'TRIAL_PHONE_USED' } })).toBe('TRIAL_PHONE_USED');
    expect(reasonOf({ code: 'COMPANY_NOT_SUBMITTABLE' })).toBe('COMPANY_NOT_SUBMITTABLE');
    expect(reasonOf(null)).toBeUndefined();
  });
});

describe('trial banner wording', () => {
  it('last day, one day, many days', () => {
    expect(trialLabel(0)).toBe('Last day of your free trial');
    expect(trialLabel(1)).toBe('1 day left in your free trial');
    expect(trialLabel(12)).toBe('12 days left in your free trial');
  });
});

describe('launch copy', () => {
  it('every string and every error is plain English', () => {
    for (const [k, v] of Object.entries({ ...LAUNCH, ...LAUNCH_ERRORS })) {
      expect([k, typeof v === 'string' && v.length > 0]).toEqual([k, true]);
      expect([k, /[\u0600-\u06FF]/.test(v)]).toEqual([k, false]);
    }
  });
  it('the reasons the trial screen shows exist', () => {
    for (const code of ['TRIAL_EMAIL_USED', 'TRIAL_PHONE_USED', 'TRIAL_TAX_ID_USED', 'TRIAL_DISABLED', 'TRIAL_ENDED', 'ACCOUNT_SUSPENDED', 'COMPANY_SUSPENDED', 'RATE_LIMIT']) {
      expect(LAUNCH_ERRORS[code]).toBeTruthy();
    }
  });
});
