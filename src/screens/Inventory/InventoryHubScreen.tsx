import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../theme';

const InventoryHubScreen: React.FC = () => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <Text style={styles.title}>Inventory</Text>
    </View>
    <View style={styles.body}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>INV</Text>
      </View>
      <Text style={styles.heading}>Inventory Hub</Text>
      <Text style={styles.subtitle}>
        Products, stock levels, warehouse management, and inventory adjustments
        will be handled here.
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
    backgroundColor: '#1B3A5C' + '0C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: '#1B3A5C' + '20',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B3A5C',
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

export default InventoryHubScreen;
