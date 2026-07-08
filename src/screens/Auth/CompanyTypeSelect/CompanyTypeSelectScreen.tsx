// ═══════════════════════════════════════════════════════
// FinMatrix — Choose Your Business Type (three-tier model)
// Small business / Large organization / Warehouse. The choice
// sets companyType, which decides the feature set, the two
// subscription plans offered, and which app the user sees.
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { THEME } from '../../../utils/theme';

const DS = {
  navy: '#091E42',
  primary: '#059669',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  border: '#DFE1E6',
  text: { h: '#172B4D', sub: '#5E6C84', muted: '#8993A4', inv: '#FFFFFF' },
};

type CompanyTypeKey = 'small_business' | 'large_org' | 'warehouse';

interface TypeCard {
  key: CompanyTypeKey;
  title: string;
  tagline: string;
  icon: keyof typeof Feather.glyphMap;
  gradient: [string, string];
  bullets: string[];
}

// Feature summaries follow THE MODEL (FinMatrix_Tier_Feature_Guide) so the
// user knows exactly what each type unlocks before choosing.
const TYPE_CARDS: TypeCard[] = [
  {
    key: 'small_business',
    title: 'Small Business',
    tagline: 'Complete accounting, nothing you don’t need',
    icon: 'briefcase',
    gradient: ['#00875A', '#006644'],
    bullets: [
      'Invoices, bills, payments & estimates',
      'Customers, vendors & chart of accounts',
      'Tax tracking built in',
      'P&L, Balance Sheet & aging reports',
    ],
  },
  {
    key: 'large_org',
    title: 'Large Organization',
    tagline: 'Accounting plus people, budgets & control',
    icon: 'layers',
    gradient: ['#0747A6', '#1E3A8A'],
    bullets: [
      'Everything in Small Business',
      'Payroll, employees & payslips',
      'Budgets vs actual & team roles',
      'Audit log & period close (optional inventory)',
    ],
  },
  {
    key: 'warehouse',
    title: 'Warehouse',
    tagline: 'Full inventory & delivery operations',
    icon: 'package',
    gradient: ['#6554C0', '#5243AA'],
    bullets: [
      'Everything in Large Organization',
      'Full inventory with average costing',
      'Purchase orders & 3-way match (GRNI)',
      'Deliveries with a rider app & admin approval',
    ],
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'CompanyTypeSelect'>;

const CompanyTypeSelectScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<CompanyTypeKey | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('CreateCompany', { companyType: selected });
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={DS.navy} />
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[DS.navy, '#1E293B']} style={S.header}>
          <SafeAreaView edges={['top']}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={S.back}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={S.brand}>
              <Text style={{ color: DS.primary }}>Fin</Text>
              <Text style={{ color: '#FFF' }}>Matrix</Text>
            </Text>
            <Text style={S.headerTitle}>Choose your business type</Text>
            <Text style={S.headerSub}>
              This decides which tools your team sees. You’ll pick a plan for it next.
            </Text>
          </SafeAreaView>
        </LinearGradient>

        <View style={S.content}>
          {TYPE_CARDS.map(card => {
            const isSel = selected === card.key;
            return (
              <TouchableOpacity
                key={card.key}
                activeOpacity={0.85}
                onPress={() => setSelected(card.key)}
                style={[S.card, isSel && S.cardSelected]}
              >
                <LinearGradient
                  colors={card.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={S.cardHead}
                >
                  <View style={S.cardHeadRow}>
                    <View style={S.iconWrap}>
                      <Feather name={card.icon} size={20} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.cardTitle}>{card.title}</Text>
                      <Text style={S.cardTagline}>{card.tagline}</Text>
                    </View>
                    <Feather
                      name={isSel ? 'check-circle' : 'circle'}
                      size={22}
                      color={isSel ? '#FFF' : 'rgba(255,255,255,0.6)'}
                    />
                  </View>
                </LinearGradient>
                <View style={S.cardBody}>
                  {card.bullets.map(b => (
                    <View key={b} style={S.bulletRow}>
                      <Feather name="check" size={13} color={DS.primary} />
                      <Text style={S.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[S.cta, !selected && S.ctaDisabled]}
            onPress={handleContinue}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <Text style={S.ctaLabel}>
              {selected
                ? `Continue as ${TYPE_CARDS.find(c => c.key === selected)?.title}`
                : 'Select a type to continue'}
            </Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={S.hint}>
            Not sure? Start with Small Business — an administrator can change your type later
            without losing any data.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },
  scroll: { flexGrow: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 28 },
  back: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 8, marginBottom: 16,
  },
  brand: { fontSize: 20, fontWeight: '800', fontFamily: THEME.typography.fontFamily, marginBottom: 14 },
  headerTitle: {
    fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.5,
    fontFamily: THEME.typography.fontFamily,
  },
  headerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 21, marginTop: 8,
    fontFamily: THEME.typography.fontFamily,
  },

  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: DS.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: DS.border,
    shadowColor: '#0052CC', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardSelected: { borderColor: DS.primary, borderWidth: 2.5 },
  cardHead: { padding: 16 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', fontFamily: THEME.typography.fontFamily },
  cardTagline: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  cardBody: { padding: 14, gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletText: { fontSize: 13, color: DS.text.h, fontFamily: THEME.typography.fontFamily, flex: 1 },

  cta: {
    height: 54, borderRadius: 16, backgroundColor: DS.primary,
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaLabel: { fontSize: 16, fontWeight: '700', color: '#FFF', fontFamily: THEME.typography.fontFamily },
  hint: {
    fontSize: 11, color: DS.text.muted, textAlign: 'center', lineHeight: 17,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default CompanyTypeSelectScreen;
