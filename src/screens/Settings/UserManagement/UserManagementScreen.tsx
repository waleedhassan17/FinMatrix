import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectUser } from '../../Auth/authSlice';
import {
  selectUsers, selectUserMgmtLoading, selectInviteModal,
  selectInviteEmail, selectInviteRole, selectIsInviting,
  fetchUsers, openInviteModal, closeInviteModal,
  setInviteEmail, setInviteRole, inviteUser,
  changeUserRole, deleteUser,
} from './userManagementSlice';
import type { CompanyMember } from '../../Auth/companySlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomButton from '../../../Custom-Components/CustomButton';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const P = {
  brand: '#059669',
  brandLight: '#ECFDF5',
  pageBg: '#F6F8FB',
  card: '#FFFFFF',
  text: '#1E293B',
  sub: '#94A3B8',
  divider: '#E2E8F0',
  admin: '#2563EB',
  adminBg: '#EFF6FF',
  delivery: '#059669',
  deliveryBg: '#ECFDF5',
  danger: '#DE350B',
};

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  admin: { bg: P.adminBg, fg: P.admin },
  delivery: { bg: P.deliveryBg, fg: P.delivery },
};

const UserManagementScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectUser);
  const users = useAppSelector(selectUsers);
  const loading = useAppSelector(selectUserMgmtLoading);
  const showModal = useAppSelector(selectInviteModal);
  const email = useAppSelector(selectInviteEmail);
  const role = useAppSelector(selectInviteRole);
  const inviting = useAppSelector(selectIsInviting);

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);

  const isOwnUser = useCallback(
    (u: CompanyMember) => currentUser?.uid === u.userId,
    [currentUser],
  );

  const handleRoleToggle = useCallback(
    (u: CompanyMember) => {
      if (isOwnUser(u)) {
        Alert.alert('Restricted', 'You cannot change your own role.');
        return;
      }
      const newRole = u.role === 'admin' ? 'delivery' : 'admin';
      dispatch(changeUserRole({ userId: u.userId, role: newRole }));
    },
    [dispatch, isOwnUser],
  );

  const handleDelete = useCallback(
    (u: CompanyMember) => {
      if (isOwnUser(u)) {
        Alert.alert('Restricted', 'You cannot remove yourself.');
        return;
      }
      Alert.alert('Remove User', `Remove ${u.displayName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { dispatch(deleteUser(u.userId)); } },
      ]);
    },
    [dispatch, isOwnUser],
  );

  const handleInvite = useCallback(() => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation', 'Enter a valid email address.');
      return;
    }
    dispatch(inviteUser());
  }, [dispatch, email]);

  const renderUser = ({ item }: { item: CompanyMember }) => {
    const colour = ROLE_COLORS[item.role] ?? ROLE_COLORS.admin;
    const own = isOwnUser(item);
    return (
      <View style={s.userCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {item.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={s.userInfo}>
          <View style={s.nameRow}>
            <Text style={s.userName}>{item.displayName}</Text>
            {own && <Text style={s.youBadge}>You</Text>}
          </View>
          <Text style={s.userEmail}>{item.email}</Text>
          <View style={s.metaRow}>
            <TouchableOpacity
              style={[s.roleBadge, { backgroundColor: colour.bg }]}
              activeOpacity={own ? 1 : 0.6}
              onPress={() => handleRoleToggle(item)}
            >
              <Text style={[s.roleText, { color: colour.fg }]}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </Text>
              {!own && <Feather name="repeat" size={11} color={colour.fg} style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
            {!own && (
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={16} color={P.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>User Management</Text>
        <TouchableOpacity onPress={() => { dispatch(openInviteModal()); }}>
          <Feather name="user-plus" size={20} color={P.brand} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={i => i.userId}
        renderItem={renderUser}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Text style={s.empty}>Loading…</Text>
          ) : (
            <Text style={s.empty}>No users found</Text>
          )
        }
      />

      {/* Invite Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Invite User</Text>
              <TouchableOpacity onPress={() => { dispatch(closeInviteModal()); }}>
                <Feather name="x" size={20} color={P.text} />
              </TouchableOpacity>
            </View>

            <CustomInput
              label="Email Address"
              value={email}
              onChangeText={v => { dispatch(setInviteEmail(v)); }}
              placeholder="user@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={s.roleSelectLabel}>Role</Text>
            <View style={s.roleRow}>
              {(['admin', 'delivery'] as const).map(r => {
                const sel = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.roleOption, sel && { backgroundColor: P.brandLight, borderColor: P.brand }]}
                    onPress={() => { dispatch(setInviteRole(r)); }}
                  >
                    <Feather
                      name={r === 'admin' ? 'shield' : 'truck'}
                      size={16}
                      color={sel ? P.brand : P.sub}
                    />
                    <Text style={[s.roleOptText, sel && { color: P.brand, fontWeight: '600' }]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <CustomButton
              title={inviting ? 'Sending…' : 'Send Invite'}
              onPress={handleInvite}
              disabled={inviting}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default UserManagementScreen;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: P.card,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    fontFamily: THEME.typography.fontFamily,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 14,
    color: P.sub,
    fontFamily: THEME.typography.fontFamily,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: P.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: P.brand,
    fontFamily: THEME.typography.fontFamily,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: P.text,
    fontFamily: THEME.typography.fontFamily,
  },
  youBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: P.brand,
    backgroundColor: P.brandLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
    overflow: 'hidden',
  },
  userEmail: {
    fontSize: 13,
    color: P.sub,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: P.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    fontFamily: THEME.typography.fontFamily,
  },
  roleSelectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: P.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: P.divider,
    gap: 6,
  },
  roleOptText: {
    fontSize: 14,
    color: P.sub,
    fontFamily: THEME.typography.fontFamily,
  },
});
