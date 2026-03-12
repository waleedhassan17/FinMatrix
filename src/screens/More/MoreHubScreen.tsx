import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

interface MoreRow {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
  onPress: (nav: Nav) => void;
}

const ROWS: MoreRow[] = [
  {
    key: 'coa',
    icon: '📒',
    label: 'Chart of Accounts',
    subtitle: 'Manage accounts, balances, and categories',
    onPress: nav => nav.navigate('COAList'),
  },
  {
    key: 'company',
    icon: '🏢',
    label: 'Company Profile',
    subtitle: 'Business info, logo, and settings',
    onPress: () => {},
  },
  {
    key: 'team',
    icon: '👥',
    label: 'Team Management',
    subtitle: 'Invite members and manage roles',
    onPress: () => {},
  },
  {
    key: 'settings',
    icon: '⚙️',
    label: 'Settings',
    subtitle: 'App preferences and configuration',
    onPress: () => {},
  },
];

const MoreHubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {ROWS.map(row => (
          <TouchableOpacity
            key={row.key}
            style={styles.row}
            activeOpacity={0.6}
            onPress={() => row.onPress(navigation)}
          >
            <View style={styles.rowIcon}>
              <Text style={styles.rowIconText}>{row.icon}</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '0C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowIconText: { fontSize: 20 },
  rowContent: { flex: 1, marginRight: spacing.sm },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textLight,
  },
});

export default MoreHubScreen;
