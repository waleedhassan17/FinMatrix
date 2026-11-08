import {
  PORTAL_ORDER,
  SIGN_IN_PORTALS,
  portalForRole,
  wrongPortalNotice,
} from '../signInPortalModel';

describe('sign-in portals', () => {
  it('lists the three doors, owner first', () => {
    expect(PORTAL_ORDER).toEqual(['admin', 'staff', 'delivery']);
  });

  it('gives each door a distinct name', () => {
    const titles = PORTAL_ORDER.map(p => SIGN_IN_PORTALS[p].title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  // The credential decides the field the form shows and the request it sends.
  it('signs owners in by email and staff and riders by username', () => {
    expect(SIGN_IN_PORTALS.admin.credential).toBe('email');
    expect(SIGN_IN_PORTALS.staff.credential).toBe('username');
    expect(SIGN_IN_PORTALS.delivery.credential).toBe('username');
  });
});

describe('portalForRole', () => {
  it.each([
    ['admin', 'admin'],
    ['staff', 'staff'],
    ['delivery', 'delivery'],
    // The console is admitted on the owner door only.
    ['super_admin', 'admin'],
    [null, 'admin'],
    [undefined, 'admin'],
    ['something-new', 'admin'],
  ] as const)('maps %s to the %s portal', (role, portal) => {
    expect(portalForRole(role)).toBe(portal);
  });
});

describe('wrongPortalNotice', () => {
  it.each([
    ['admin', 'admin', 'Business Portal'],
    ['staff', 'staff', 'Staff Portal'],
    ['delivery', 'delivery', 'Delivery Portal'],
  ] as const)('sends a %s account to the %s portal', (accountType, door, title) => {
    const n = wrongPortalNotice(accountType);
    expect(n.switchTo).toBe(door);
    expect(n.switchLabel).toBe(`Go to ${title}`);
    expect(n.message).toContain(title);
  });

  // Never the web console's wording: this app HAS a Delivery Portal.
  it('does not tell a rider to use another app', () => {
    expect(wrongPortalNotice('delivery').message).not.toMatch(/android/i);
  });

  it('offers no door to a platform console account', () => {
    const n = wrongPortalNotice('super_admin');
    expect(n.switchTo).toBeNull();
    expect(n.message).toMatch(/Admin app/);
  });

  it('offers no door for an account type it does not know', () => {
    expect(wrongPortalNotice(undefined).switchTo).toBeNull();
  });
});
