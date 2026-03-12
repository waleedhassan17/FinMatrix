import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../theme';

const NotificationsScreen: React.FC = () => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <Text style={styles.title}>Notifications</Text>
    </View>
    <View style={styles.body}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>🔔</Text>
      </View>
      <Text style={styles.heading}>No Notifications</Text>
      <Text style={styles.subtitle}>
        You're all caught up! New notifications will appear here.
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
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '0C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary + '20',
  },
  iconText: { fontSize: 28 },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
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

export default NotificationsScreen;
