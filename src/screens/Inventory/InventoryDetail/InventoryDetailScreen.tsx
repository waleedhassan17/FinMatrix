// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Detail Screen
// ═══════════════════════════════════════════════════════
// One item: who it is, how much is on hand and what it is worth, what can be
// done with it, then its details, movements and purchase orders. Laid out to
// match the website's item page (InventoryDetailPage): the same figures, the
// same opening-stock rule, the same owner-only actions.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  ReportContainer,
  ReportHeader,
  Badge,
  ErrorBlock,
  FigureStrip,
  Segmented,
  type FigureItem,
} from '../../../components/reports/ReportUI';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInventoryItems,
  toggleInventoryItem,
  uploadItemImage,
  removeItemImage,
} from '../InventoryList/inventoryListSlice';
import ItemThumbnail from '../../../components/shared/ItemThumbnail';
import FullscreenImageModal from '../../../components/shared/FullscreenImageModal';
import { useItemPhotoPicker } from '../../../hooks/useItemPhotoPicker';
import {
  selectInventoryDetailTab,
  selectInventoryDetailMovements,
  selectInventoryDetailStatus,
  selectInventoryDetailError,
  selectInventoryDetailPOs,
  selectInventoryDetailPendingPOs,
  selectInventoryDetailPOStatus,
  selectInventoryDetailPOError,
  setActiveTab,
  resetInventoryDetail,
  fetchItemMovements,
  fetchItemPurchaseOrders,
} from './inventoryDetailSlice';
import type { InventoryDetailTab } from './inventoryDetailSlice';
import {
  canSetOpeningStock,
  itemStockStatus,
  marginAtAverageCost,
  movementLabel,
  onOrderForItem,
} from '../../../models/inventoryModel';
import { PO_STATUS_COLORS, PO_STATUS_LABELS } from '../../../models/purchaseOrderModel';
import { useCapability, useIsOwner } from '../../../hooks/useCapability';
import type { PurchaseOrderStatus } from '../../../types';
import { isFeatureEnabled } from '../../../utils/featureGates';
import { warehouseAgencies } from '../../../models/agencyModel';
import { formatCurrency, formatDate, formatQty } from '../../../utils/formatters';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';
import { STOCK_STATUS_DISPLAY, itemRowStatus, unitSuffix } from '../stockStatusDisplay';
import OpeningStockSheet from './OpeningStockSheet';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, shadows, spacing, typography } = THEME;

type DetailRoute = RouteProp<InventoryStackParamList, 'InventoryDetail'>;
type Nav = NativeStackNavigationProp<InventoryStackParamList>;

// ── Helpers ───────────────────────────────────────────
// PO_STATUS_LABELS is the canonical vocabulary, but "Partially Received" and
// "Fully Received" are list-screen widths — in a badge sharing a row with a PO
// number, a vendor and a quantity they squeeze the number to an ellipsis. Only
// the two long ones are shortened; the colours stay canonical.
const shortPOStatus = (status: PurchaseOrderStatus) => {
  if (status === 'partially_received') return 'Partial';
  if (status === 'fully_received') return 'Received';
  return PO_STATUS_LABELS[status] ?? status;
};

// Keyed to the movement types the API actually emits. This used to switch on
// 'Purchase' / 'Sale' / 'Adjustment', none of which the backend has ever sent,
// so every badge fell through to grey.
const getMovementColor = (type: string) => {
  switch (type) {
    case 'receipt': return colors.success;
    case 'return': return colors.success;
    case 'sale': return colors.danger;
    case 'delivery': return colors.danger;
    case 'adjustment': return colors.warning;
    case 'transfer': return colors.secondary;
    default: return colors.textSecondary;
  }
};

/** "+20", "−5" — a real minus sign, which a hyphen only imitates. */
const signedQty = (n: number): string =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatQty(Math.abs(n))}`;

// ── Pieces ────────────────────────────────────────────
const ActionButton: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <TouchableOpacity
    style={[styles.card, styles.actionBtn]}
    activeOpacity={0.7}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={styles.actionIcon}>
      <Feather name={icon} size={18} color={colors.primary} />
    </View>
    {/* Wraps rather than truncating: on a 320pt phone "Adjust stock" does
        not fit a third of the row, and an ellipsis would hide the verb. */}
    <Text style={styles.actionText} numberOfLines={2}>
      {label}
    </Text>
  </TouchableOpacity>
);

type DetailRow = { label: string; value: string };

const DetailSection: React.FC<{ title: string; rows: DetailRow[]; first?: boolean }> = ({
  title,
  rows,
  first,
}) => (
  <View style={[styles.section, !first && styles.sectionBelow]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {rows.map(row => (
      <View key={row.label} style={styles.detailRow}>
        <Text style={styles.detailLabel}>{row.label}</Text>
        <Text style={styles.detailValue}>{row.value}</Text>
      </View>
    ))}
  </View>
);

/** "40", or "Not set" for a stock rule left at zero — not a literal 0. */
const ruleQty = (n: number): string => (n ? formatQty(n) : 'Not set');

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const InventoryDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectInventoryItems);
  const item = items.find(i => i.itemId === route.params.itemId);
  const activeTab = useAppSelector(selectInventoryDetailTab);
  const movements = useAppSelector(selectInventoryDetailMovements);
  const movementsStatus = useAppSelector(selectInventoryDetailStatus);
  const movementsError = useAppSelector(selectInventoryDetailError);
  const purchaseOrders = useAppSelector(selectInventoryDetailPOs);
  const pendingPORequests = useAppSelector(selectInventoryDetailPendingPOs);
  const poStatus = useAppSelector(selectInventoryDetailPOStatus);
  const poError = useAppSelector(selectInventoryDetailPOError);
  // Whether the tab currently has anything to show. A re-fetch keeps these on
  // screen rather than collapsing the card to a spinner.
  const hasPORows = purchaseOrders.length > 0 || pendingPORequests.length > 0;

  // Staff may raise a purchase order — it files a request the owner approves,
  // rather than the 403 this screen used to assume (see utils/capabilities.ts).
  // The label says which of the two tapping will do.
  const poCap = useCapability('purchaseOrder.create');
  const canAdjust = useCapability('inventory.adjust').allowed;
  // A photo is catalogue data, like the name: whoever may edit the item may
  // change it. Viewing it needs nothing.
  const canManage = useCapability('inventory.manageItems').allowed;
  // Recording opening stock and (de)activating an item are the owner's, as on
  // the website. Both used to be offered to everyone, and a staff member's tap
  // ended in the server's refusal.
  const isOwner = useIsOwner();
  const posEnabled = isFeatureEnabled('purchaseOrders');
  const agenciesEnabled = isFeatureEnabled('agencies');
  const { pickPhoto } = useItemPhotoPicker();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);

  const itemId = route.params.itemId;

  useEffect(() => {
    return () => { dispatch(resetInventoryDetail()); };
  }, [dispatch]);

  const loadDetailData = useCallback(() => {
    if (!itemId) return;
    dispatch(fetchItemMovements(itemId));
    if (posEnabled) {
      dispatch(fetchItemPurchaseOrders({ itemId, includePending: poCap.needsApproval }));
    }
  }, [dispatch, itemId, poCap.needsApproval, posEnabled]);

  // On focus, not on mount. Both lists live in one shared slice, so opening a
  // second item overwrites them and unmounting that item clears them — coming
  // back to this one would otherwise show an empty table. Refetching on focus
  // also picks up an adjustment just posted from here, and the PO (or the
  // request for one) just raised from the button below.
  useFocusEffect(loadDetailData);

  const agencyName = useMemo(() => {
    if (!agenciesEnabled || !item?.sourceAgencyId) return null;
    return warehouseAgencies.find(a => a.id === item.sourceAgencyId)?.name ?? null;
  }, [item, agenciesEnabled]);

  // Still to arrive from suppliers, counted from the open orders loaded for
  // the Purchase orders tab (the item's own on-order column is always zero).
  const onOrder = useMemo(
    () => (posEnabled ? onOrderForItem(purchaseOrders, itemId) : { quantity: 0, orders: 0 }),
    [posEnabled, purchaseOrders, itemId],
  );

  const handleEdit = useCallback(() => {
    if (item) navigation.navigate('InventoryForm', { itemId: item.itemId });
  }, [item, navigation]);

  const handleChangePhoto = useCallback(async () => {
    if (!item) return;
    const photo = await pickPhoto();
    if (!photo) return;
    setPhotoBusy(true);
    try {
      await dispatch(uploadItemImage({ itemId: item.itemId, photo })).unwrap();
      Toast.show({ type: 'success', text1: 'Photo saved', text2: item.name });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Photo not saved', text2: e?.message || 'Please try again.' });
    } finally {
      setPhotoBusy(false);
    }
  }, [item, pickPhoto, dispatch]);

  const handleRemovePhoto = useCallback(() => {
    if (!item) return;
    Alert.alert('Remove photo', `Remove the photo of "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setPhotoBusy(true);
          try {
            await dispatch(removeItemImage(item.itemId)).unwrap();
          } catch (e: any) {
            Toast.show({ type: 'error', text1: 'Photo not removed', text2: e?.message || 'Please try again.' });
          } finally {
            setPhotoBusy(false);
          }
        },
      },
    ]);
  }, [item, dispatch]);

  // The full Adjustment screen, not an inline prompt. The old quick action
  // hardcoded reason:'correction' so damage, theft and obsolescence were all
  // filed as corrections — and it ran on Alert.prompt, which is iOS-only, so
  // on Android it offered the Edit screen instead, which cannot move stock.
  const handleAdjust = useCallback(() => {
    if (item) navigation.navigate('Adjustment', { itemId: item.itemId });
  }, [item, navigation]);

  // POForm and PODetail are shared record screens, registered in THIS stack
  // too (navigations-maps/sharedRecords): raising or opening a PO starts here
  // and back comes back here. Opening a PO used to hop into the Transactions
  // tab, where back landed on that tab's hub (QA #9).
  const handleCreatePO = useCallback(() => {
    if (!item) return;
    navigation.navigate('POForm', { prefillItemId: item.itemId });
  }, [item, navigation]);

  const handleOpenPO = useCallback((poId: string) => {
    navigation.navigate('PODetail', { poId });
  }, [navigation]);

  // A pending request is not a purchase order and has nothing to open, so it
  // goes where the PO list's pending strip goes. My Requests is in the staff
  // More tab, so the hop goes through the parent tab navigator — same as
  // POListScreen.openMyRequests.
  const handleOpenMyRequests = useCallback(() => {
    const tabs = (navigation.getParent() ?? navigation) as unknown as {
      navigate: (name: string, params?: Record<string, unknown>) => void;
    };
    tabs.navigate('StaffMoreStack', { screen: 'MyRequests', initial: false });
  }, [navigation]);

  const handleToggle = useCallback(() => {
    if (!item) return;

    // Deactivating an item that still holds stock strands its value in the GL
    // Inventory account with nothing on screen to explain it — the item drops
    // out of every active-items list while 1200 keeps carrying it. The server
    // does not enforce this, so this guard is the only one.
    if (item.isActive && item.quantityOnHand !== 0) {
      Alert.alert(
        'Stock still on hand',
        `This item still holds ${formatQty(item.quantityOnHand)}${unitSuffix(item)} (${formatCurrency(
          item.quantityOnHand * item.unitCost,
        )}). Clear the stock with an adjustment before deactivating.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Adjust Stock', onPress: handleAdjust },
        ],
      );
      return;
    }

    Alert.alert(
      item.isActive ? 'Deactivate Item' : 'Activate Item',
      `Are you sure you want to ${item.isActive ? 'deactivate' : 'activate'} "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isActive ? 'Deactivate' : 'Activate',
          style: item.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await dispatch(toggleInventoryItem(item.itemId)).unwrap();
              Toast.show({
                type: 'success',
                text1: item.isActive ? 'Item deactivated' : 'Item activated',
                text2: item.name,
              });
            } catch (e: any) {
              Toast.show({
                type: 'error',
                text1: item.isActive ? 'Could not deactivate' : 'Could not activate',
                text2: e?.message || 'Please try again.',
              });
            }
          },
        },
      ],
    );
  }, [item, dispatch, handleAdjust]);

  if (!item) {
    return (
      <ReportContainer>
        <ReportHeader title="Item details" onBack={() => navigation.goBack()} backLabel="Inventory" />
        <ErrorBlock message="This item could not be found. It may have been removed." />
      </ReportContainer>
    );
  }

  // ── Derived ───────────────────────────────────────
  const display = STOCK_STATUS_DISPLAY[itemRowStatus(item)];
  const stock = itemStockStatus(item);
  const unit = unitSuffix(item);
  const photoUri = item.thumbnailUrl || item.imageUrl;
  const meta = [item.sku, item.category].filter(Boolean).join(' · ');
  const margin = marginAtAverageCost(item.sellingPrice, item.unitCost);

  // The figures, as the website's tiles have them. On hand is toned only when
  // the stock is short; the value has a row of its own so even a billion-rupee
  // figure is shown whole. The old row put all three in equal thirds, where
  // "Rs 30,000.00" already broke onto two lines.
  const onHandCaption = [
    item.reorderPoint > 0 ? `Reorder at ${formatQty(item.reorderPoint)}` : null,
    onOrder.quantity > 0 ? `${formatQty(onOrder.quantity)} on order` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const figures: FigureItem[] = [
    {
      label: 'On hand',
      value: `${formatQty(item.quantityOnHand)}${unit}`,
      tone: !item.isActive ? 'default' : stock === 'out_of_stock' ? 'danger' : stock === 'low_stock' ? 'warning' : 'default',
      caption: onHandCaption || undefined,
    },
    { label: 'Avg. unit cost', value: formatCurrency(item.unitCost), caption: 'Weighted average' },
    {
      label: 'Stock value',
      value: formatCurrency(item.quantityOnHand * item.unitCost),
      caption: 'On hand × average cost',
    },
  ];

  // Opening stock is a one-time entry for an item that has never moved —
  // the server refuses it otherwise. It used to be offered whenever the
  // quantity was zero, including after the item had sold out.
  const openingAvailable =
    movementsStatus === 'succeeded' && canSetOpeningStock(item, movements.length);

  // ── Tabs ──────────────────────────────────────────
  const TABS: { key: InventoryDetailTab; label: string }[] = [
    { key: 'stock', label: 'Details' },
    { key: 'transactions', label: 'Movements' },
    ...(posEnabled ? [{ key: 'purchaseOrders' as const, label: 'Purchase orders' }] : []),
  ];
  const tabIndex = Math.max(0, TABS.findIndex(t => t.key === activeTab));
  const tab = TABS[tabIndex].key;

  const detailSections: { title: string; rows: DetailRow[] }[] = [
    {
      title: 'Pricing',
      rows: [
        { label: 'Selling price', value: formatCurrency(item.sellingPrice) },
        { label: 'Margin at average cost', value: margin === null ? '—' : `${margin.toFixed(1)}%` },
        { label: 'Cost method', value: 'Weighted average' },
      ],
    },
    {
      title: 'Stock rules',
      rows: [
        { label: 'Unit', value: item.unitOfMeasure?.trim() || '—' },
        { label: 'Reorder point', value: ruleQty(item.reorderPoint) },
        { label: 'Reorder quantity', value: ruleQty(item.reorderQuantity) },
        {
          label: 'Min / max stock',
          value:
            item.minStock || item.maxStock
              ? `${formatQty(item.minStock)} / ${item.maxStock ? formatQty(item.maxStock) : '—'}`
              : 'Not set',
        },
      ],
    },
    {
      title: 'Identification',
      rows: [
        { label: 'Barcode', value: item.barcodeData || '—' },
        // Dropped entirely, not blanked, while the agencies feature is off.
        ...(agenciesEnabled ? [{ label: 'Source agency', value: agencyName || '—' }] : []),
        { label: 'Last updated', value: item.lastUpdated ? formatDate(item.lastUpdated) : '—' },
      ],
    },
  ];

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <ReportContainer>
      <ReportHeader title="Item details" onBack={() => navigation.goBack()} backLabel="Inventory" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity, with the photo ──
            The photo used to fill 280pt above everything else, pushing the
            stock figures and actions off the first screen. It is a thumbnail
            now; tapping it opens the full photo. */}
        <View style={[styles.card, styles.identity]}>
          <View style={styles.photoTile}>
            {photoUri ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setViewerOpen(true)}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Photo of ${item.name}. Tap to view full screen.`}
              >
                <ItemThumbnail uri={photoUri} style={styles.photoImg} resizeMode="cover" iconSize={24} />
              </TouchableOpacity>
            ) : canManage ? (
              <TouchableOpacity
                style={styles.photoAdd}
                activeOpacity={0.7}
                onPress={handleChangePhoto}
                disabled={photoBusy}
                accessibilityRole="button"
                accessibilityLabel="Add a photo"
              >
                <Feather name="camera" size={18} color={colors.primary} />
                <Text style={styles.photoAddText}>Add photo</Text>
              </TouchableOpacity>
            ) : (
              <ItemThumbnail uri={null} style={styles.photoImg} iconSize={24} />
            )}
            {photoBusy && (
              <View style={styles.photoBusy}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>

          <View style={styles.identityText}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            {meta ? <Text style={styles.itemMeta} numberOfLines={1}>{meta}</Text> : null}
            <View style={styles.badgeRow}>
              <Badge label={display.label} color={display.color} />
              {agencyName ? <Badge label={agencyName} color={colors.secondary} dot={false} /> : null}
            </View>
            {/* Two plain buttons, not a menu: on the web build a three-way
                Alert becomes a single OK/Cancel confirm whose OK runs the
                last option — which would have been Remove. */}
            {!!photoUri && canManage && (
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.photoAction}
                  onPress={handleChangePhoto}
                  disabled={photoBusy}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                >
                  <Feather name="camera" size={13} color={colors.primary} />
                  <Text style={styles.photoActionText}>Change photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoAction}
                  onPress={handleRemovePhoto}
                  disabled={photoBusy}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Feather name="trash-2" size={13} color={colors.danger} />
                  <Text style={[styles.photoActionText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── Figures ──
            On Order and Committed used to sit here. Both read real columns
            that the backend only ever writes '0' to — nothing increments
            quantity_on_order on a PO, and quantity_committed is unused
            entirely. What is on order is counted from the open purchase
            orders instead, under On hand. */}
        <FigureStrip items={figures} />

        {/* ── Opening stock ── */}
        {openingAvailable && (
          <View style={[styles.card, styles.openingCard]}>
            <View style={styles.openingIcon}>
              <Feather name="package" size={18} color={colors.primary} />
            </View>
            <View style={styles.openingTextCol}>
              <Text style={styles.openingTitle}>No stock recorded yet</Text>
              <Text style={styles.openingBody}>
                {isOwner
                  ? 'If you already held this item before using FinMatrix, record it as opening stock. Otherwise it arrives when a purchase order is received.'
                  : 'Stock arrives when a purchase order is received, or when the owner records the opening stock.'}
              </Text>
              {isOwner && (
                <TouchableOpacity
                  style={styles.openingBtn}
                  activeOpacity={0.8}
                  onPress={() => setOpeningOpen(true)}
                  accessibilityRole="button"
                >
                  <Feather name="plus" size={15} color={colors.primary} />
                  <Text style={styles.openingBtnText}>Record opening stock</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Actions ── */}
        {(canAdjust || poCap.allowed || canManage) && (
          <View style={styles.actionRow}>
            {canAdjust && <ActionButton icon="sliders" label="Adjust stock" onPress={handleAdjust} />}
            {poCap.allowed && (
              <ActionButton
                icon="file-plus"
                label={poCap.needsApproval ? 'Request PO' : 'Create PO'}
                onPress={handleCreatePO}
              />
            )}
            {canManage && <ActionButton icon="edit-2" label="Edit" onPress={handleEdit} />}
          </View>
        )}

        {/* ── Tabs ── */}
        <Segmented
          options={TABS.map(t => t.label)}
          activeIndex={tabIndex}
          onChange={i => dispatch(setActiveTab(TABS[i].key))}
        />

        {/* ── Details ── */}
        {tab === 'stock' && (
          <View style={styles.card}>
            {detailSections.map((section, i) => (
              <DetailSection key={section.title} title={section.title} rows={section.rows} first={i === 0} />
            ))}
            {item.description ? (
              <View style={[styles.section, styles.sectionBelow]}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Movements ──
            Rows, not a table: five columns in a phone's width wrapped every
            date and cut every reference down to a few letters. */}
        {tab === 'transactions' && (
          <View style={styles.card}>
            {movementsStatus === 'loading' && (
              <View style={styles.emptyTab}>
                <ActivityIndicator color={colors.actionGreen} />
              </View>
            )}

            {movementsStatus === 'failed' && (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>
                  {movementsError || 'Could not load stock movements'}
                </Text>
                <TouchableOpacity onPress={loadDetailData} activeOpacity={0.7} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Only a successful fetch that came back with nothing is an empty
                item. This used to render unconditionally, because the model
                helper behind it returned a hardcoded []. */}
            {movementsStatus === 'succeeded' && movements.length === 0 && (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>No stock movements recorded</Text>
              </View>
            )}

            {movements.map((mv, idx) => {
              const typeColor = getMovementColor(mv.type);
              const qtyColor =
                mv.quantityChange > 0 ? colors.success : mv.quantityChange < 0 ? colors.danger : colors.textSecondary;
              const mvMeta = [mv.date ? formatDate(mv.date) : '', mv.reference || mv.description]
                .filter(Boolean)
                .join(' · ');
              return (
                <View
                  key={mv.id}
                  style={[styles.mvRow, idx > 0 && styles.rowDivider]}
                  accessible
                  accessibilityLabel={`${movementLabel(mv)}, ${signedQty(mv.quantityChange)}, balance ${formatQty(
                    mv.balanceAfter,
                  )}, ${mvMeta}`}
                >
                  <View style={styles.mvMain}>
                    <View style={[styles.mvType, { backgroundColor: typeColor + '14' }]}>
                      <Text style={[styles.mvTypeText, { color: typeColor }]}>{movementLabel(mv)}</Text>
                    </View>
                    {mvMeta ? <Text style={styles.mvMeta} numberOfLines={1}>{mvMeta}</Text> : null}
                  </View>
                  <View style={styles.mvRight}>
                    <Text style={[styles.mvQty, { color: qtyColor }]}>{signedQty(mv.quantityChange)}</Text>
                    <Text style={styles.mvBalance}>Bal {formatQty(mv.balanceAfter)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Purchase orders ── */}
        {tab === 'purchaseOrders' && (
          <View style={styles.card}>
            {/* Only the FIRST load takes over the tab; a background re-fetch
                must never replace rows that are already on screen. Coming back
                from a PO refires the focus effect, and gating the rows on
                'succeeded' collapsed the card to a lone spinner and jumped the
                scroll position every time. Same rule as POListScreen. */}
            {(poStatus === 'loading' || poStatus === 'idle') && !hasPORows && (
              <View style={styles.emptyTab}>
                <ActivityIndicator color={colors.actionGreen} />
              </View>
            )}

            {poStatus === 'failed' && !hasPORows && (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>
                  {poError || 'Could not load purchase orders'}
                </Text>
                <TouchableOpacity onPress={loadDetailData} activeOpacity={0.7} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Requests first: this is the staff member's own PO, waiting on
                the owner. Without it, raising one from this screen and coming
                back to an empty tab reads as "my request vanished" — the same
                gap the PO list closes with its pending strip. */}
            {pendingPORequests.map((req, idx) => (
              <TouchableOpacity
                key={req.id}
                style={[styles.poRow, idx > 0 && styles.rowDivider]}
                activeOpacity={0.7}
                onPress={handleOpenMyRequests}
                accessibilityRole="button"
              >
                <Feather name="clock" size={15} color={colors.warning} style={styles.poClock} />
                <View style={styles.poMain}>
                  <Text style={styles.poNumber} numberOfLines={1}>
                    {req.summary || 'Purchase order request'}
                  </Text>
                  <Text style={styles.poMeta}>Sent to the owner · not a purchase order yet</Text>
                </View>
                <Badge label="Pending" color={colors.warning} dot={false} />
              </TouchableOpacity>
            ))}

            {purchaseOrders.map((po, idx) => {
              // The tab is about THIS item, so the quantity shown is this
              // item's lines, not the PO total.
              const lines = po.lines.filter(l => l.itemId === itemId);
              const ordered = lines.reduce((sum, l) => sum + l.quantity, 0);
              const received = lines.reduce((sum, l) => sum + l.receivedQuantity, 0);
              const statusColor = PO_STATUS_COLORS[po.status] ?? colors.textSecondary;
              return (
                <TouchableOpacity
                  key={po.id}
                  style={[styles.poRow, (idx > 0 || pendingPORequests.length > 0) && styles.rowDivider]}
                  activeOpacity={0.7}
                  onPress={() => handleOpenPO(po.id)}
                  accessibilityRole="button"
                >
                  <View style={styles.poMain}>
                    <Text style={styles.poNumber} numberOfLines={1}>
                      {po.poNumber || 'Purchase order'}
                    </Text>
                    <Text style={styles.poMeta} numberOfLines={1}>
                      {[po.vendorName, po.orderDate ? formatDate(po.orderDate) : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.poQtyBlock}>
                    <Text style={styles.poQty}>{formatQty(ordered)}</Text>
                    {/* Report receipts whenever there are any — the old test
                        also required received < ordered, so the count vanished
                        exactly when the receipt completed. */}
                    <Text style={styles.poQtyLabel}>
                      {received > 0 ? `${formatQty(received)} received` : 'ordered'}
                    </Text>
                  </View>
                  <Badge label={shortPOStatus(po.status)} color={statusColor} dot={false} />
                </TouchableOpacity>
              );
            })}

            {/* Only a settled fetch that found nothing is an empty item —
                otherwise a slow load flashes "no purchase orders" first. The
                server filters by item and every page is read, so "none" is
                the whole answer. */}
            {poStatus === 'succeeded' && !hasPORows && (
              <View style={styles.emptyTab}>
                <Text style={styles.emptyTabText}>No purchase orders for this item</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Activate / Deactivate (owner) ── */}
        {isOwner && (
          <View style={[styles.card, styles.toggleCard]}>
            <Text style={styles.toggleBody}>
              {item.isActive
                ? 'Deactivating hides the item from invoice, order and delivery pickers. Its stock and history stay.'
                : 'Reactivating makes it selectable again.'}
            </Text>
            <TouchableOpacity
              style={[styles.toggleBtn, item.isActive ? styles.toggleBtnDanger : styles.toggleBtnPrimary]}
              activeOpacity={0.8}
              onPress={handleToggle}
              accessibilityRole="button"
            >
              <Feather
                name={item.isActive ? 'slash' : 'check-circle'}
                size={15}
                color={item.isActive ? colors.danger : colors.neutral0}
              />
              <Text style={[styles.toggleBtnText, { color: item.isActive ? colors.danger : colors.neutral0 }]}>
                {item.isActive ? 'Deactivate item' : 'Activate item'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <FullscreenImageModal
        uri={viewerOpen ? item.imageUrl || item.thumbnailUrl : null}
        onClose={() => setViewerOpen(false)}
        accessibilityLabel={`Photo of ${item.name}`}
      />
      {openingOpen && (
        <OpeningStockSheet
          visible
          item={item}
          onClose={() => setOpeningOpen(false)}
          onRecorded={loadDetailData}
          onSetUnitCost={handleEdit}
        />
      )}
    </ReportContainer>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  // The inventory list's gutter, so the two screens share a left edge.
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },

  // The app's card: white, 12pt corners, a hairline border doing the
  // separating and a light shadow lifting it (ReportUI's S.card).
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.xs,
  },

  // ── Identity ──────────────────────────────────────
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  photoTile: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.neutral50,
  },
  photoImg: { width: 72, height: 72, borderRadius: radius.md },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary + '66',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddText: { ...typography.labelSm, color: colors.primary },
  photoBusy: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  identityText: { flex: 1, minWidth: 0 },
  itemName: { ...typography.h3, color: colors.textPrimary },
  itemMeta: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs + 2, marginTop: spacing.xs },
  photoActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  photoAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  photoActionText: { ...typography.labelSm, color: colors.primary },

  // ── Opening stock ─────────────────────────────────
  openingCard: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  openingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openingTextCol: { flex: 1, minWidth: 0 },
  openingTitle: { ...typography.labelLg, color: colors.textPrimary },
  openingBody: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  openingBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primaryLight,
  },
  openingBtnText: { ...typography.labelMd, color: colors.primary },

  // ── Actions ───────────────────────────────────────
  actionRow: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    minHeight: 76,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stretched to the button's width so a long label has a width to wrap
  // within; centred children otherwise size to their text and never wrap.
  actionText: { ...typography.labelMd, color: colors.textPrimary, textAlign: 'center', alignSelf: 'stretch' },

  // ── Details ───────────────────────────────────────
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  sectionBelow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  sectionTitle: { ...typography.overline, color: colors.textTertiary, marginBottom: spacing.xxs },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailLabel: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  detailValue: {
    ...typography.labelMd,
    color: colors.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '60%',
    fontVariant: ['tabular-nums'],
  },
  description: { ...typography.bodySm, color: colors.textPrimary, paddingBottom: spacing.xs },

  // ── Movements ─────────────────────────────────────
  mvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  mvMain: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  mvType: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.xs },
  mvTypeText: { ...typography.labelSm },
  mvMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 4, alignSelf: 'stretch' },
  mvRight: { alignItems: 'flex-end', flexShrink: 0 },
  mvQty: { ...typography.labelLg, fontVariant: ['tabular-nums'] },
  mvBalance: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'], marginTop: 1 },

  // ── Purchase orders ───────────────────────────────
  poRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  poClock: { marginRight: 2 },
  poMain: { flex: 1, minWidth: 0 },
  poNumber: { ...typography.labelMd, color: colors.textPrimary },
  poMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  poQtyBlock: { alignItems: 'flex-end' },
  poQty: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  poQtyLabel: { ...typography.caption, color: colors.textTertiary },

  emptyTab: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTabText: {
    ...typography.bodySm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  retryBtnText: {
    ...typography.labelMd,
    color: colors.secondary,
  },

  // ── Activate / Deactivate ─────────────────────────
  toggleCard: { padding: spacing.md, marginTop: spacing.xs },
  toggleBody: { ...typography.bodySm, color: colors.textSecondary },
  toggleBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  toggleBtnDanger: { borderColor: colors.danger + '55', backgroundColor: colors.surface },
  toggleBtnPrimary: { borderColor: colors.primary, backgroundColor: colors.primary },
  toggleBtnText: { ...typography.labelMd },
});

export default InventoryDetailScreen;
