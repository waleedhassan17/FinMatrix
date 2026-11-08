// The item's detail screen, rendered: the figures shown whole, the status in
// words, the opening-stock rule and the owner-only actions — the same rules
// as the website's item page.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), getParent: (): null => null }),
  useRoute: () => ({ params: { itemId: 'i1' } }),
  useFocusEffect: (): void => undefined,
}));
jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (select: () => unknown) => select(),
  useAppDispatch: () => jest.fn(),
}));
jest.mock('../../../hooks/useCapability', () => ({
  useCapability: () => ({ allowed: true, needsApproval: false }),
  useIsOwner: () => mockState.owner,
}));
jest.mock('../../../hooks/useItemPhotoPicker', () => ({ useItemPhotoPicker: () => ({ pickPhoto: jest.fn() }) }));
jest.mock('../../../utils/featureGates', () => ({
  isFeatureEnabled: (key: string) => key === 'purchaseOrders',
}));
jest.mock('../../../components/shared/FullscreenImageModal', () => (): null => null);
// ReportUI reads the company block for its statement headers; the real module
// pulls in expo-print, which has no native side under Jest.
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
jest.mock('../InventoryList/inventoryListSlice', () => ({
  selectInventoryItems: () => mockState.items,
  toggleInventoryItem: jest.fn(),
  uploadItemImage: jest.fn(),
  removeItemImage: jest.fn(),
  setOpeningStock: jest.fn(),
}));
jest.mock('../InventoryDetail/inventoryDetailSlice', () => ({
  selectInventoryDetailTab: () => mockState.tab,
  selectInventoryDetailMovements: () => mockState.movements,
  selectInventoryDetailStatus: () => mockState.movementsStatus,
  selectInventoryDetailError: (): null => null,
  selectInventoryDetailPOs: () => mockState.purchaseOrders,
  selectInventoryDetailPendingPOs: (): unknown[] => [],
  selectInventoryDetailPOStatus: (): string => 'succeeded',
  selectInventoryDetailPOError: (): null => null,
  setActiveTab: jest.fn(),
  resetInventoryDetail: jest.fn(),
  fetchItemMovements: jest.fn(),
  fetchItemPurchaseOrders: jest.fn(),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import InventoryDetailScreen from '../InventoryDetail/InventoryDetailScreen';
import type { InventoryItemData, StockMovement } from '../../../models/inventoryModel';

const baseItem: InventoryItemData = {
  id: 'i1',
  itemId: 'i1',
  sku: 'COK-002',
  name: '10kg Ghee',
  description: '',
  category: 'Cooking Oil',
  unitOfMeasure: 'Unit',
  costMethod: 'average',
  unitCost: 10000,
  sellingPrice: 12000,
  quantityOnHand: 3,
  quantityOnOrder: 0,
  quantityCommitted: 0,
  reorderPoint: 10,
  reorderQuantity: 0,
  minStock: 0,
  maxStock: 0,
  isActive: true,
  barcodeData: '',
  locationId: '',
  imageUrl: '',
  thumbnailUrl: '',
  lastUpdated: '2026-11-01',
};

const movement: StockMovement = {
  id: 'm1',
  date: '2026-11-01',
  type: 'receipt',
  reference: 'PO-0012',
  description: '',
  quantityChange: 3,
  balanceAfter: 3,
  sourceType: 'purchase_order',
  sourceId: 'po1',
  createdAt: '2026-11-01T10:00:00Z',
};

const mockState: {
  items: InventoryItemData[];
  tab: string;
  movements: StockMovement[];
  movementsStatus: string;
  purchaseOrders: unknown[];
  owner: boolean;
} = { items: [], tab: 'stock', movements: [], movementsStatus: 'succeeded', purchaseOrders: [], owner: true };

const setup = (over: Partial<InventoryItemData> = {}, state: Partial<typeof mockState> = {}) => {
  Object.assign(mockState, {
    items: [{ ...baseItem, ...over }],
    tab: 'stock',
    movements: [movement],
    movementsStatus: 'succeeded',
    purchaseOrders: [],
    owner: true,
    ...state,
  });
};

const mounted: renderer.ReactTestRenderer[] = [];
afterEach(() => {
  act(() => mounted.splice(0).forEach(t => t.unmount()));
});

const drawnText = (): string => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<InventoryDetailScreen />);
  });
  mounted.push(tree);
  return tree.root
    .findAll(() => true)
    .flatMap(n => {
      const c = n.props?.children;
      return Array.isArray(c) ? c : [c];
    })
    .filter(c => typeof c === 'string' || typeof c === 'number')
    .map(String)
    .join(' ')
    .replace(/\s+/g, ' ');
};

describe('InventoryDetailScreen', () => {
  it('shows a billion-rupee stock value whole', () => {
    setup({ quantityOnHand: 1250, unitCost: 1116253.16, unitOfMeasure: 'ton' });
    const text = drawnText();
    expect(text).toContain('Rs 1,395,316,450.00');
    expect(text).toContain('1,250 ton');
  });

  it('says Low stock in words, and where the reorder point sits', () => {
    setup();
    const text = drawnText();
    expect(text).toContain('Low stock');
    expect(text).toContain('Reorder at 10');
  });

  it('says Inactive for an inactive item, whatever its stock', () => {
    setup({ isActive: false });
    const text = drawnText();
    expect(text).toContain('Inactive');
    expect(text).not.toContain('Low stock');
  });

  it('shows the margin on price, as the website does', () => {
    setup();
    expect(drawnText()).toContain('16.7%');
  });

  it('prints an unset stock rule as Not set, not 0', () => {
    setup();
    expect(drawnText()).toContain('Not set');
  });

  it('counts what is on order from the open purchase orders', () => {
    setup({}, {
      purchaseOrders: [
        { id: 'po1', status: 'sent', poNumber: 'PO-1', vendorName: 'V', orderDate: '', lines: [{ itemId: 'i1', quantity: 10, receivedQuantity: 0 }] },
      ],
    });
    expect(drawnText()).toContain('10 on order');
  });

  describe('opening stock', () => {
    it('is offered to the owner while the item has never moved', () => {
      setup({ quantityOnHand: 0 }, { movements: [] });
      const text = drawnText();
      expect(text).toContain('No stock recorded yet');
      expect(text).toContain('Record opening stock');
    });

    it('tells staff it is the owner who records it', () => {
      setup({ quantityOnHand: 0 }, { movements: [], owner: false });
      const text = drawnText();
      expect(text).toContain('No stock recorded yet');
      expect(text).not.toContain('Record opening stock');
    });

    it('is not offered once the item has moved, even at zero', () => {
      setup({ quantityOnHand: 0 }, { movements: [movement] });
      expect(drawnText()).not.toContain('No stock recorded yet');
    });

    it('waits for the movements to load before offering it', () => {
      setup({ quantityOnHand: 0 }, { movements: [], movementsStatus: 'loading' });
      expect(drawnText()).not.toContain('No stock recorded yet');
    });
  });

  it('offers Deactivate to the owner only', () => {
    setup({ quantityOnHand: 0 });
    expect(drawnText()).toContain('Deactivate item');
    setup({ quantityOnHand: 0 }, { owner: false });
    expect(drawnText()).not.toContain('Deactivate item');
  });

  it('lists movements as rows with a signed quantity and the balance', () => {
    setup({}, { tab: 'transactions' });
    const text = drawnText();
    expect(text).toContain('Receipt');
    expect(text).toContain('+3');
    expect(text).toContain('Bal 3');
    expect(text).toContain('PO-0012');
  });
});
