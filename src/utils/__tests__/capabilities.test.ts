import {
  ALL_CAPABILITIES,
  GOVERNANCE_CAPABILITIES,
  STAFF_REQUEST_CAPABILITIES,
  can,
  capabilityFor,
  needsApproval,
  submitLabelFor,
  type Capability,
} from '../capabilities';

/**
 * The capability map against the permission matrices.
 *
 * This is the client's copy of a contract the server enforces, so the risk is
 * DRIFT: someone widens a server route and forgets this file, or vice versa,
 * and the app grows a button that 403s or hides one that would have worked.
 * Spelling the matrix out here means that drift breaks a test.
 */
describe('capabilities — Table A', () => {
  describe('the owner', () => {
    it('does everything directly, including governance', () => {
      for (const capability of ALL_CAPABILITIES) {
        expect(capabilityFor('admin', capability)).toBe('direct');
      }
    });

    it('never has anything queued for approval — they are the approver', () => {
      for (const capability of ALL_CAPABILITIES) {
        expect(needsApproval('admin', capability)).toBe(false);
      }
    });
  });

  describe('staff — value in, done directly', () => {
    const directForStaff: Capability[] = [
      'invoice.create',
      'estimate.create',
      'salesOrder.create',
      'payment.receive',
      'customer.manage',
      'vendor.manage',
      'delivery.create',
      'delivery.assign',
      'delivery.rejectCompletion',
      'personnel.manage',
      'stock.receive',
      'inventory.manageItems',
    ];

    it.each(directForStaff)('%s completes immediately', capability => {
      expect(capabilityFor('staff', capability)).toBe('direct');
    });

    it('assigning a delivery is direct even though it posts to the ledger', () => {
      // Table B row 2: Dr Goods in Transit / Cr Inventory at cost. The one
      // ledger-moving action staff take with no approval, and the easiest
      // thing in the whole feature to gate by accident.
      expect(capabilityFor('staff', 'delivery.assign')).toBe('direct');
      expect(needsApproval('staff', 'delivery.assign')).toBe(false);
    });

    it('signing off a rider delivery is the OWNER\'S, but rejecting one is not', () => {
      // The pair that is easiest to get wrong, because they sit side by side
      // on the same screen and go through the same service method.
      //
      // Approving recognises the sale — Dr A/R / Cr Sales, then Dr COGS / Cr
      // Goods in Transit — so it is the owner's signature. Rejecting posts no
      // revenue at all; it puts the stock back and reverses Goods in Transit,
      // so staff keep it and a failed delivery is not stranded in transit
      // until the owner next logs in.
      expect(capabilityFor('staff', 'delivery.approveCompletion')).toBe(false);
      expect(capabilityFor('admin', 'delivery.approveCompletion')).toBe('direct');
      expect(capabilityFor('staff', 'delivery.rejectCompletion')).toBe('direct');

      // Refused outright, not queued: there is no request path for signing off
      // a delivery — the owner does it in their own inbox.
      expect(needsApproval('staff', 'delivery.approveCompletion')).toBe(false);
    });

    it('approving a delivery is withheld from staff without being governance', () => {
      // GOVERNANCE_CAPABILITIES is the set staff never reach AT ALL. Staff
      // very much still reach the delivery queue — they submit to it, watch it
      // and reject from it — so this capability is deliberately false without
      // being listed there. Guards the tempting "tidy-up" of merging the two.
      expect(can('staff', 'delivery.approveCompletion')).toBe(false);
      expect(GOVERNANCE_CAPABILITIES).not.toContain('delivery.approveCompletion');
    });
  });

  describe('staff — money out and corrections, by request', () => {
    const requestForStaff: Capability[] = [
      'inventory.adjust',
      'journal.post',
      'creditMemo.manage',
      'vendorCredit.manage',
      'transaction.void',
      'bill.pay',
      'purchaseOrder.create',
      'delivery.undo',
    ];

    it.each(requestForStaff)('%s becomes a pending request', capability => {
      expect(capabilityFor('staff', capability)).toBe('request');
      expect(needsApproval('staff', capability)).toBe(true);
      // Visible, but as a request — not hidden.
      expect(can('staff', capability)).toBe(true);
    });

    it('is exactly the eight gated types, no more and no fewer', () => {
      expect([...STAFF_REQUEST_CAPABILITIES].sort()).toEqual(
        [...requestForStaff].sort(),
      );
    });
  });

  describe('staff — governance, refused', () => {
    it.each(GOVERNANCE_CAPABILITIES)('%s is unavailable', capability => {
      expect(capabilityFor('staff', capability)).toBe(false);
      expect(can('staff', capability)).toBe(false);
      // Not merely "needs approval": there is no request path for governance.
      expect(needsApproval('staff', capability)).toBe(false);
    });

    it('covers all four governance areas from the matrix', () => {
      expect([...GOVERNANCE_CAPABILITIES].sort()).toEqual(
        [
          'approvals.decide',
          'chartOfAccounts.manage',
          'period.close',
          'settings.manage',
          'users.manage',
        ].sort(),
      );
    });
  });

  describe('other roles', () => {
    it('riders and the platform console reach none of these surfaces', () => {
      for (const capability of ALL_CAPABILITIES) {
        expect(can('delivery', capability)).toBe(false);
        expect(can('super_admin', capability)).toBe(false);
      }
    });

    it('a signed-out user has no capabilities', () => {
      expect(can(null, 'invoice.create')).toBe(false);
      expect(can(undefined, 'invoice.create')).toBe(false);
    });
  });
});

describe('submitLabelFor', () => {
  it('tells staff a gated action will go to the owner', () => {
    expect(submitLabelFor('staff', 'bill.pay', 'Pay bill')).toBe('Send for approval');
  });

  it('leaves direct actions worded normally', () => {
    expect(submitLabelFor('staff', 'invoice.create', 'Save invoice')).toBe(
      'Save invoice',
    );
    expect(submitLabelFor('admin', 'bill.pay', 'Pay bill')).toBe('Pay bill');
  });
});
