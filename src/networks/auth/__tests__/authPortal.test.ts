// Each sign-in door names itself, so the server can refuse an account that
// belongs on another one (WRONG_PORTAL) before issuing a token.
jest.mock('../../network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  setTokens: jest.fn().mockResolvedValue(undefined),
  setStoredCompanyId: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
  getAccessToken: jest.fn().mockResolvedValue(null),
  extractErrorMessage: jest.fn(() => 'Request failed'),
}));

import { api } from '../../network/apiHelpers';
import { authDeliveryLogin, authLogin, RATE_LIMITED_MESSAGE } from '../authNetwork';

const post = api.post as jest.Mock;

const ok = (role: string) => ({
  data: {
    data: {
      user: { id: 'u1', email: 'a@b.c', username: 'u', displayName: 'U', role },
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
      companyId: 'c1',
      companyStatus: 'active',
      companyType: 'warehouse',
      features: {} as Record<string, boolean>,
    },
  },
});

describe('sign-in portals', () => {
  beforeEach(() => post.mockReset());

  it('the Business Portal signs in as the owner door', async () => {
    post.mockResolvedValueOnce(ok('admin'));
    await authLogin({ signInInfo: { email: ' owner@x.z ', password: 'pw' } });
    expect(post).toHaveBeenCalledWith('/auth/signin', {
      identifier: 'owner@x.z',
      email: 'owner@x.z',
      password: 'pw',
      portal: 'admin',
    });
  });

  // Each username door posts itself, so the server checks the account against
  // exactly the portal picked: a rider on the Staff Portal is refused.
  it.each(['staff', 'delivery'] as const)(
    'the %s portal posts its own door, not the shared team door',
    async portal => {
      post.mockResolvedValueOnce(ok(portal));
      await authDeliveryLogin({
        signInInfo: { username: 'verify.staff', password: 'pw', portal },
      });
      expect(post).toHaveBeenCalledWith('/auth/signin', {
        identifier: 'verify.staff',
        email: 'verify.staff',
        password: 'pw',
        portal,
      });
    },
  );

  const wrongPortal = (accountType: string) => ({
    response: {
      status: 403,
      data: {
        error: {
          code: 'WRONG_PORTAL',
          message: 'This is a business owner account.',
          details: { accountType, portal: 'staff' },
        },
      },
    },
  });

  it('turns WRONG_PORTAL on a username door into a typed error naming the account', async () => {
    post.mockRejectedValueOnce(wrongPortal('delivery'));
    await expect(
      authDeliveryLogin({ signInInfo: { username: 'acme.imran', password: 'pw', portal: 'staff' } }),
    ).rejects.toMatchObject({ code: 'WRONG_PORTAL', accountType: 'delivery' });
  });

  it('turns WRONG_PORTAL on the Business Portal into the same typed error', async () => {
    post.mockRejectedValueOnce(wrongPortal('staff'));
    await expect(
      authLogin({ signInInfo: { email: 'manager', password: 'pw' } }),
    ).rejects.toMatchObject({ code: 'WRONG_PORTAL', accountType: 'staff' });
  });

  it.each([
    ['username door', () => authDeliveryLogin({ signInInfo: { username: 'u', password: 'pw', portal: 'delivery' } })],
    ['Business Portal', () => authLogin({ signInInfo: { email: 'o@x.z', password: 'pw' } })],
  ])('says plainly when the %s is rate-limited', async (_door, call) => {
    post.mockRejectedValueOnce({
      response: { status: 429, data: { statusCode: 429, message: 'ThrottlerException: Too Many Requests' } },
    });
    await expect(call()).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      message: RATE_LIMITED_MESSAGE,
    });
  });

  // The platform console moved to its own app, but the server still admits it
  // through the Business Portal and returns a real token — so the client is the
  // only thing standing between a console account and a company navigator it
  // has no company for. Refused before setTokens, so no session is left behind.
  it('refuses the platform console on the Business Portal, without storing a session', async () => {
    const { setTokens, setStoredCompanyId } = jest.requireMock('../../network/apiHelpers');
    (setTokens as jest.Mock).mockClear();
    (setStoredCompanyId as jest.Mock).mockClear();
    post.mockResolvedValueOnce(ok('super_admin'));

    await expect(
      authLogin({ signInInfo: { email: 'platform@x.z', password: 'pw' } }),
    ).rejects.toThrow('This account signs in through the FinMatrix Admin app.');

    expect(setTokens).not.toHaveBeenCalled();
    expect(setStoredCompanyId).not.toHaveBeenCalled();
  });
});
