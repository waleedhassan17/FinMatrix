// ═══════════════════════════════════════════════════════
// FinMatrix — Who the item is, at a glance
// ═══════════════════════════════════════════════════════
// The top of the item explorer, as the web's page header shows it: the
// item's photo (tap for full size), one badge for the state of its stock —
// the most urgent first — and the facts its record page leads with: SKU,
// category, the unit it is sold by.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { THEME } from '../../../theme';
import { statusStyle } from '../../../theme/theme';
import ItemThumbnail from '../../../components/shared/ItemThumbnail';
import { STOCK_BADGE, type StockBadgeKey } from '../../../models/itemExplorerModel';
import type { ItemFacts } from '../../../models/inventoryValuationModel';

const { colors, radius, spacing, typography } = THEME;

interface Props {
  name: string;
  sku: string;
  facts: ItemFacts | null;
  badge: StockBadgeKey | null;
  onOpenPhoto: () => void;
}

const ItemIdentityCard: React.FC<Props> = ({ name, sku, facts, badge, onOpenPhoto }) => {
  const shown = badge ? STOCK_BADGE[badge] : null;
  const tone = shown ? statusStyle(shown.status) : null;
  const facts1 = [sku ? `SKU ${sku}` : null, facts?.category || null].filter(Boolean).join(' · ');
  const photo = facts?.thumbnailUrl ?? facts?.imageUrl ?? null;

  return (
    <View style={styles.card}>
      {photo ? (
        <Pressable
          onPress={onOpenPhoto}
          accessibilityRole="imagebutton"
          accessibilityLabel={`View the photo of ${name} full size`}
          style={styles.thumbBox}
        >
          <ItemThumbnail uri={photo} style={styles.thumb} iconSize={24} />
        </Pressable>
      ) : (
        <View style={styles.thumbBox}>
          <ItemThumbnail uri={null} style={styles.thumb} iconSize={24} />
        </View>
      )}
      <View style={styles.body}>
        {shown && tone ? (
          <View
            style={[styles.badge, { backgroundColor: tone.bg }]}
            accessible
            accessibilityLabel={shown.hint ? `${shown.label}: ${shown.hint}` : shown.label}
          >
            <Text style={[styles.badgeText, { color: tone.fg }]}>{shown.label}</Text>
          </View>
        ) : null}
        {facts1 ? (
          <Text style={styles.fact} numberOfLines={2}>
            {facts1}
          </Text>
        ) : null}
        {facts ? <Text style={styles.factMuted}>Sold by {facts.unitOfMeasure}</Text> : null}
        {shown?.hint ? <Text style={styles.factMuted}>{shown.hint}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  thumbBox: { borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  body: { flex: 1, gap: 4, alignItems: 'flex-start' },
  badge: { borderRadius: radius.xs, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  badgeText: { ...typography.labelSm },
  fact: { ...typography.bodySm, color: colors.textSecondary },
  factMuted: { ...typography.caption, color: colors.textTertiary },
});

export default ItemIdentityCard;
