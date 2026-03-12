import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../../theme';

const ACCENT = '#27AE60';

const DPDashboardScreen: React.FC = () => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.brandDot} />
        <Text style={styles.brandLabel}>FINMATRIX DELIVERY</Text>
      </View>
      <Text style={styles.title}>Dashboard</Text>
    </View>
    <View style={styles.body}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>DSH</Text>
      </View>
      <Text style={styles.heading}>Delivery Dashboard</Text>
      <Text style={styles.subtitle}>
        Today's assignments, delivery stats, and quick actions will appear here.
      </Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT,
    marginRight: spacing.xs + 2,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.4,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: typography.fontFamily,
  },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT + '0C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: ACCENT + '20',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '800',
    color: ACCENT,
    fontFamily: typography.fontFamily,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    fontFamily: typography.fontFamily,
  },
});

export default DPDashboardScreen;
