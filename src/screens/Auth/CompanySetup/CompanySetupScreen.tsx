import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME } from '../../../utils/theme';
import { useAppSelector } from '../../../hooks/useReduxHooks';
import { selectActiveCompany } from '../companySlice';
import { ROUTES } from '../../../navigations-map/Base';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanySetup'>;

// ═══════════════════════════════════════════════════════
// Design System — matches auth flow screens
// ═══════════════════════════════════════════════════════
const DS = {
  navy900: '#0B1120',
  navy800: '#0F172A',
  navy700: '#1E293B',

  green500: '#059669',
  green400: '#00875A',
  green300: '#34D399',
  green50: '#ECFDF5',
  greenBorder: '#A7F3D0',

  blue600: '#2563EB',
  blue500: '#0065FF',
  blue100: '#DBEAFE',
  blue50: '#EFF6FF',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',

  white: '#FFFFFF',

  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },

  shadowMd: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
};

// ═══════════════════════════════════════════════════════
// Screen
// ═══════════════════════════════════════════════════════
const CompanySetupScreen: React.FC<Props> = ({ navigation }) => {
  const activeCompany = useAppSelector(selectActiveCompany);

  useEffect(() => {
    if (activeCompany) {
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.ADMIN_TABS as any }],
      });
    }
  }, [activeCompany, navigation]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={DS.navy900} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* ═══════════════════════════════
            GRADIENT HEADER
           ═══════════════════════════════ */}
        <LinearGradient
          colors={[DS.navy900, DS.navy800, DS.navy700]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={s.header}>
          <View style={[s.orb, s.orbTopRight]} />
          <View style={[s.orb, s.orbBottomLeft]} />
          <View style={[s.orb, s.orbMidLeft]} />

          <SafeAreaView edges={['top']} style={s.headerInner}>
            {/* Top bar — pill only, no back button on root setup */}
            <View style={s.topBar}>
              <View style={s.rolePill}>
                <View style={s.rolePillDot} />
                <Text style={s.rolePillText}>Getting Started</Text>
              </View>
            </View>

            {/* Header copy */}
            <View>
              <Text style={s.headerTitle}>Set up your workspace</Text>
              <Text style={s.headerSub}>
                Create a new company or join an existing one to start managing
                finances, inventory, and deliveries.
              </Text>
            </View>

            <View style={s.headerTagRow}>
              <Ionicons name="grid-outline" size={16} color={DS.green300} />
              <Text style={s.headerTagText}>Workspace Setup</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ═══════════════════════════════
            OPTION CARDS
           ═══════════════════════════════ */}
        <View style={s.cardsZone}>
          {/* Create Company Card */}
          <View>
            <TouchableOpacity
              style={s.optionCard}
              onPress={() => navigation.navigate(ROUTES.CREATE_COMPANY as any)}
              activeOpacity={0.7}>
              {/* Icon area */}
              <View style={s.optionIconArea}>
                <View style={[s.optionIconOuter, { backgroundColor: DS.navy800 + '08' }]}>
                  <View style={[s.optionIconInner, { backgroundColor: DS.navy800 + '12' }]}>
                    <Ionicons name="business" size={24} color={DS.navy800} />
                  </View>
                </View>
              </View>

              {/* Text */}
              <View style={s.optionTextArea}>
                <View style={s.optionTitleRow}>
                  <Text style={s.optionTitle}>Create New Company</Text>
                  <View style={[s.optionBadge, { backgroundColor: DS.blue50 }]}>
                    <Text style={[s.optionBadgeText, { color: DS.blue600 }]}>New</Text>
                  </View>
                </View>
                <Text style={s.optionDesc}>
                  Register your business, set up agencies, and invite your team members
                </Text>
              </View>

              {/* Features row */}
              <View style={s.featureRow}>
                <View style={s.featureChip}>
                  <Ionicons name="layers-outline" size={12} color={DS.slate500} />
                  <Text style={s.featureChipText}>Agencies</Text>
                </View>
                <View style={s.featureChip}>
                  <Ionicons name="people-outline" size={12} color={DS.slate500} />
                  <Text style={s.featureChipText}>Team</Text>
                </View>
                <View style={s.featureChip}>
                  <Ionicons name="cube-outline" size={12} color={DS.slate500} />
                  <Text style={s.featureChipText}>Inventory</Text>
                </View>
              </View>

              {/* CTA */}
              <View style={s.optionCta}>
                <Text style={s.optionCtaLabel}>Get Started</Text>
                <Ionicons name="arrow-forward" size={16} color={DS.white} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divText}>or</Text>
            <View style={s.divLine} />
          </View>

          {/* Join Company Card */}
          <View>
            <TouchableOpacity
              style={s.optionCard}
              onPress={() => navigation.navigate(ROUTES.JOIN_COMPANY as any)}
              activeOpacity={0.7}>
              {/* Icon area */}
              <View style={s.optionIconArea}>
                <View style={[s.optionIconOuter, { backgroundColor: DS.green500 + '08' }]}>
                  <View style={[s.optionIconInner, { backgroundColor: DS.green500 + '14' }]}>
                    <Ionicons name="people" size={24} color={DS.green500} />
                  </View>
                </View>
              </View>

              {/* Text */}
              <View style={s.optionTextArea}>
                <View style={s.optionTitleRow}>
                  <Text style={s.optionTitle}>Join Existing Company</Text>
                </View>
                <Text style={s.optionDesc}>
                  Enter a 6-digit invite code from your admin to join an existing workspace
                </Text>
              </View>

              {/* Code preview */}
              <View style={s.codePreviewRow}>
                {['_', '_', '_', '_', '_', '_'].map((c, i) => (
                  <View key={i} style={s.codePreviewBox}>
                    <Text style={s.codePreviewChar}>{c}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              <View style={[s.optionCtaOutline]}>
                <Ionicons name="enter-outline" size={16} color={DS.navy800} style={{ marginRight: 6 }} />
                <Text style={s.optionCtaOutlineLabel}>Enter Invite Code</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security footer */}
        <View style={s.secFooter}>
          <View style={s.secDot} />
          <Text style={s.secText}>Your data is encrypted and secure</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.slate50 },
  scroll: { flexGrow: 1 },

  // ── Header (gradient) ──
  header: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  orbTopRight: { width: 180, height: 180, top: -60, right: -40 },
  orbBottomLeft: { width: 100, height: 100, bottom: -30, left: -20 },
  orbMidLeft: { width: 60, height: 60, top: 80, left: -10 },
  headerInner: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DS.radius.full,
    gap: 6,
  },
  rolePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.green400,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: THEME.typography.fontFamily,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: DS.white,
    marginBottom: 8,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  headerTagRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: DS.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerTagText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 0.3,
  },

  // ── Cards zone ──
  cardsZone: {
    paddingHorizontal: 16,
    marginTop: -1,
    paddingBottom: 8,
  },

  // ── Option card ──
  optionCard: {
    backgroundColor: DS.white,
    borderRadius: DS.radius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: DS.slate100,
    ...DS.shadowLg,
  },
  optionIconArea: {
    marginBottom: 16,
  },
  optionIconOuter: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextArea: {
    marginBottom: 16,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.navy800,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: -0.2,
  },
  optionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DS.radius.full,
  },
  optionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionDesc: {
    fontSize: 14,
    color: DS.slate500,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 20,
  },

  // Feature chips
  featureRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.slate50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DS.radius.full,
    borderWidth: 1,
    borderColor: DS.slate200,
    gap: 5,
  },
  featureChipText: {
    fontSize: 11,
    color: DS.slate500,
    fontWeight: '500',
    fontFamily: THEME.typography.fontFamily,
  },

  // Code preview
  codePreviewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    justifyContent: 'center',
  },
  codePreviewBox: {
    width: 38,
    height: 44,
    borderRadius: DS.radius.md,
    backgroundColor: DS.slate50,
    borderWidth: 1.5,
    borderColor: DS.slate200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codePreviewChar: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.slate300,
    fontFamily: THEME.typography.fontFamily,
  },

  // CTAs
  optionCta: {
    height: 48,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.navy800,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadowMd,
  },
  optionCtaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.white,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 0.3,
  },
  optionCtaOutline: {
    height: 48,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.white,
    borderWidth: 1.5,
    borderColor: DS.slate200,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCtaOutlineLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.navy800,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 0.2,
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    paddingHorizontal: 8,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: DS.slate200,
  },
  divText: {
    fontSize: 11,
    color: DS.slate400,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '500',
    marginHorizontal: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Security footer ──
  secFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  secDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.green500,
  },
  secText: {
    fontSize: 12,
    color: DS.slate400,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default CompanySetupScreen;
