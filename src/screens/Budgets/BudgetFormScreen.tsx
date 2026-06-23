import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../utils/theme';
import { getAccountsAPI } from '../../network/coaNetwork';
import { createBudgetAPI } from '../../network/budgetNetwork';
import { formatCurrency } from '../../utils/formatters';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import { ReportContainer, ReportHeader, Card, SectionCard } from '../../components/reports/ReportUI';
import type { ReportsStackParamList } from '../../navigators/stacks/ReportsStack';

type Nav = NativeStackNavigationProp<ReportsStackParamList>;
interface LineDraft { accountId: string; annual: string; }
const rs = (n: number) => formatCurrency(n, 'Rs ');

const BudgetFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [accounts, setAccounts] = useState<{ label: string; value: string }[]>([]);
  const [name, setName] = useState('');
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [lines, setLines] = useState<LineDraft[]>([{ accountId: '', annual: '0' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAccountsAPI({ limit: 200 } as any).then((res: any) => {
      const arr = res?.data?.accounts ?? res?.data?.data ?? res?.data ?? [];
      setAccounts((Array.isArray(arr) ? arr : []).map((a: any) => ({ label: `${a.accountNumber} ${a.name}`, value: a.id })));
    }).catch(() => {});
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.annual) || 0), 0), [lines]);
  const updateLine = (i: number, patch: Partial<LineDraft>) => setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!name.trim()) { Alert.alert('Missing name', 'Enter a budget name.'); return; }
    const valid = lines.filter(l => l.accountId && parseFloat(l.annual) > 0);
    if (valid.length === 0) { Alert.alert('No lines', 'Add at least one account with an annual amount.'); return; }
    setSaving(true);
    try {
      await createBudgetAPI({
        name, fiscalYear: parseInt(fiscalYear, 10) || new Date().getFullYear(), status: 'active',
        lines: valid.map(l => {
          const monthly = (parseFloat(l.annual) || 0) / 12;
          return { accountId: l.accountId, monthlyAmounts: Array.from({ length: 12 }, () => Math.round(monthly * 100) / 100) };
        }),
      });
      navigation.goBack();
    } catch (e: any) { Alert.alert('Save failed', e?.message ?? 'Could not save budget'); }
    finally { setSaving(false); }
  };

  return (
    <ReportContainer>
      <ReportHeader title="New Budget" subtitle="Annual amounts split evenly by month" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CustomInput label="Budget Name" value={name} onChangeText={setName} placeholder="FY2026 Operating Budget" />
          <CustomInput label="Fiscal Year" value={fiscalYear} onChangeText={setFiscalYear} keyboardType="numeric" />
        </Card>

        <SectionCard title="Budget Lines" icon="list">
          {lines.map((l, i) => (
            <View key={i} style={styles.lineRow}>
              <View style={styles.lineMain}>
                <CustomDropdown label={`Account ${i + 1}`} placeholder="Select account" options={accounts} value={l.accountId} onChange={v => updateLine(i, { accountId: v })} />
                <CustomInput label="Annual Amount" value={l.annual} onChangeText={v => updateLine(i, { annual: v })} keyboardType="numeric" />
              </View>
              {lines.length > 1 && (
                <TouchableOpacity onPress={() => setLines(prev => prev.filter((_, idx) => idx !== i))} style={styles.del}>
                  <Feather name="trash-2" size={16} color={THEME.colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <CustomButton title="+ Add Account" variant="secondary" onPress={() => setLines(prev => [...prev, { accountId: '', annual: '0' }])} />
        </SectionCard>

        <Card>
          <View style={styles.totalRow}><Text style={styles.bold}>Total Budget</Text><Text style={styles.bold}>{rs(total)}</Text></View>
        </Card>

        <CustomButton title="Create Budget" onPress={save} isLoading={saving} fullWidth />
        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  lineMain: { flex: 1 },
  del: { paddingTop: 28, paddingHorizontal: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bold: { ...THEME.typography.bodyMd, fontWeight: '800', color: THEME.colors.textPrimary },
});

export default BudgetFormScreen;
