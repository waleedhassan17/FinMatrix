import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../../../theme';
import type { DPProfileStackParamList } from '../../../../navigators/stacks/DPProfileStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectDPSettings, setPushNotifications, setSmsNotifications, setEmailNotifications } from './dpSettingsSlice';

type Props = NativeStackScreenProps<DPProfileStackParamList, 'DPSettings'>;

const DPSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectDPSettings);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>Back</Text></TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Push Notifications</Text>
            <Switch value={settings.pushNotifications} onValueChange={v => { dispatch(setPushNotifications(v)); }} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>SMS Notifications</Text>
            <Switch value={settings.smsNotifications} onValueChange={v => { dispatch(setSmsNotifications(v)); }} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email Notifications</Text>
            <Switch value={settings.emailNotifications} onValueChange={v => { dispatch(setEmailNotifications(v)); }} />
          </View>
        </View>

        <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('Change Password', 'Password reset flow coming soon.') }>
          <Text style={styles.actionLabel}>Change Password</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('Help', 'Contact support@finmatrix.pk') }>
          <Text style={styles.actionLabel}>Help</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('About', 'FinMatrix Delivery v1.0') }>
          <Text style={styles.actionLabel}>About</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { ...typography.small, color: colors.primary, fontWeight: '700' },
  title: { ...typography.h4, color: colors.textPrimary },
  content: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sectionTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...typography.small, color: colors.textPrimary },
  actionRow: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionLabel: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  arrow: { ...typography.h4, color: colors.textSecondary },
});

export default DPSettingsScreen;
