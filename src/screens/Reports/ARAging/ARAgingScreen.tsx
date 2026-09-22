import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import type { AgingPresetKey, AgingSort } from '../../../models/arAgingModel';
import AgingReportView from '../shared/AgingReportView';
import {
  agingDetailQueryFrom,
  agingQueryFrom,
  fetchARAgingReport,
  persistAgingPreference,
  selectARAgingState,
  setARAgingCustomBuckets,
  setARAgingPreset,
  setARAgingBucket,
  setARAgingSort,
  toggleARAgingParty,
  fetchARAgingPartyDocuments,
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


  /**
   * Load one party's open documents, unless they are already in hand.
   *
   * Opening a row that has been fetched costs nothing; a row whose last attempt
   * failed retries. Same shape as the P&L line drill-down.
   */
  const toggleParty = (partyId: string) => {
    dispatch(toggleARAgingParty(partyId));
    const cached = state.documents[partyId];
    const open = !!state.expanded[partyId];
    if (!open && (!cached || cached.status === 'failed')) {
      dispatch(fetchARAgingPartyDocuments({ partyId, query: agingDetailQueryFrom(state) }));
    }
  };

  const retryParty = (partyId: string) => {
    dispatch(fetchARAgingPartyDocuments({ partyId, query: agingDetailQueryFrom(state) }));
  };

  /**
   * Open the record behind a document row.
   *
   * InvoiceDetail and BillDetail live in TransactionsStack and this screen is in
   * ReportsStack, so the hop goes through the tab navigator. `initial: false` is
   * load-bearing: without it React Navigation initialises Transactions as
   * [InvoiceDetail] with no list underneath, and back falls through to the
   * Dashboard while stranding the detail screen on that tab.
   *
   * Only the DOCUMENT is opened, never the party. CustomerDetail/VendorDetail
   * exist in BOTH MoreStack and StaffMoreStack, so a hardcoded stack name here
   * would break for staff users — and the invoice is what someone drilling into
   * a debt actually wants to see.
   */
  const openDocument = (documentType: string, documentId: string) => {
    const screen = documentType === 'bill' ? 'BillDetail' : 'InvoiceDetail';
    const param = documentType === 'bill' ? 'billId' : 'invoiceId';
    if (!documentId) return;
    (navigation as unknown as NativeStackNavigationProp<Record<string, object>>).navigate(
      'TransactionsStack',
      { screen, params: { [param]: documentId }, initial: false },
    );
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
      partyType="customer"
      documentNoun="invoices"
      selectedBucket={state.selectedBucket}
      onSelectBucket={key => dispatch(setARAgingBucket(key))}
      sort={state.sort}
      onChangeSort={(next: AgingSort) => dispatch(setARAgingSort(next))}
      expanded={state.expanded}
      documents={state.documents}
      onToggleParty={toggleParty}
      onRetryParty={retryParty}
      onOpenDocument={openDocument}
    />
  );
};

export default ARAgingScreen;
