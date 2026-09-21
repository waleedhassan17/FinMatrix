import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import type { AgingPresetKey } from '../../../models/arAgingModel';
import AgingReportView from '../shared/AgingReportView';
import {
  agingQueryFrom,
  fetchARAgingReport,
  persistAgingPreference,
  selectARAgingState,
  setARAgingCustomBuckets,
  setARAgingPreset,
} from './arAgingSlice';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const ARAgingScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectARAgingState);

  // No focus-effect re-seeding here, unlike the dated reports. Aging closes as
  // of now and the server decides what "now" is (in the business time zone), so
  // there is no client-held date to go stale.
  const load = useCallback(() => {
    dispatch(fetchARAgingReport(agingQueryFrom(state)));
    // Only the bucket choice changes the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.preset, state.customBuckets]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPreset = (key: AgingPresetKey) => {
    dispatch(setARAgingPreset(key));
    void persistAgingPreference(key, state.customBuckets);
  };

  const applyCustom = (buckets: string) => {
    dispatch(setARAgingCustomBuckets(buckets));
    void persistAgingPreference('custom', buckets);
  };

  return (
    <AgingReportView
      title="A/R Aging"
      subtitle="Outstanding receivables"
      counterpartyHeader="Customer"
      sectionTitle="By Customer"
      sectionIcon="users"
      loadingLabel="Aging receivables…"
      emptyTitle="No outstanding receivables"
      emptyHint="All customer invoices are settled."
      statementTitle="A/R Aging Summary"
      report={state.report}
      isLoading={state.isLoading}
      error={state.error}
      preset={state.preset}
      customBuckets={state.customBuckets}
      onBack={() => navigation.goBack()}
      onRetry={load}
      onPickPreset={pickPreset}
      onApplyCustom={applyCustom}
    />
  );
};

export default ARAgingScreen;
