import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import type { AgingPresetKey } from '../../../models/arAgingModel';
import AgingReportView from '../shared/AgingReportView';
import { agingQueryFrom, persistAgingPreference } from '../ARAging/arAgingSlice';
import {
  fetchAPAgingReport,
  selectAPAgingState,
  setAPAgingCustomBuckets,
  setAPAgingPreset,
} from './apAgingSlice';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const APAgingScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectAPAgingState);

  const load = useCallback(() => {
    dispatch(fetchAPAgingReport(agingQueryFrom(state)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.preset, state.customBuckets]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPreset = (key: AgingPresetKey) => {
    dispatch(setAPAgingPreset(key));
    void persistAgingPreference(key, state.customBuckets);
  };

  const applyCustom = (buckets: string) => {
    dispatch(setAPAgingCustomBuckets(buckets));
    void persistAgingPreference('custom', buckets);
  };

  return (
    <AgingReportView
      title="A/P Aging"
      subtitle="Outstanding payables"
      // The payload keys are customerId/customerName on both sides — the server
      // builds them with one helper — but on this side they hold a vendor.
      counterpartyHeader="Vendor"
      sectionTitle="By Vendor"
      sectionIcon="truck"
      loadingLabel="Aging payables…"
      emptyTitle="No outstanding payables"
      emptyHint="All vendor bills are settled."
      statementTitle="A/P Aging Summary"
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

export default APAgingScreen;
