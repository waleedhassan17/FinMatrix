import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './useReduxHooks';
import { selectFeatures } from '../screens/Auth/authSlice';
import {
  fetchMessagingSettings,
  selectMessagingSettings,
  selectMessagingSettingsLoaded,
  selectMessagingSettingsLoading,
} from '../screens/Settings/WhatsAppConnect/whatsAppConnectSlice';
import { canUseWhatsappConnect, hasWhatsappConnectFeature } from '../utils/featureGates';
import { getContactHealthAPI } from '../networks/messaging/messagingNetwork';
import type { ContactHealthRow, EventRule, MessageEvent, MessagingSettings } from '../models/messagingModel';

/**
 * FinMatrix Connect for this session.
 *   featureOn — the plan includes it (server feature map, strict)
 *   enabled   — featureOn AND the owner switched it on: show Connect UI
 * Settings load once per session, only when the feature is on.
 */
export function useWhatsappConnect(): {
  featureOn: boolean;
  enabled: boolean;
  settings: MessagingSettings | null;
  loading: boolean;
  ruleFor: (event: MessageEvent) => EventRule;
  refresh: () => void;
} {
  const dispatch = useAppDispatch();
  const features = useAppSelector(selectFeatures);
  const settings = useAppSelector(selectMessagingSettings);
  const loaded = useAppSelector(selectMessagingSettingsLoaded);
  const loading = useAppSelector(selectMessagingSettingsLoading);
  const featureOn = hasWhatsappConnectFeature(features);

  useEffect(() => {
    if (featureOn && !loaded && !loading) void dispatch(fetchMessagingSettings());
  }, [dispatch, featureOn, loaded, loading]);

  const refresh = useCallback(() => {
    if (featureOn) void dispatch(fetchMessagingSettings());
  }, [dispatch, featureOn]);

  const ruleFor = useCallback(
    (event: MessageEvent): EventRule => settings?.eventRules?.[event] ?? 'off',
    [settings],
  );

  return {
    featureOn,
    enabled: canUseWhatsappConnect(features, settings),
    settings,
    loading,
    ruleFor,
    refresh,
  };
}

/**
 * One customer's or vendor's WhatsApp status (Ready / No number / Not on
 * WhatsApp / Opted out), from the server's contact-health check. Null while
 * loading, or when Connect is not on.
 */
export function useContactWhatsapp(
  partyType: 'customer' | 'vendor',
  partyId: string | null | undefined,
  active: boolean,
  refreshKey?: unknown,
): ContactHealthRow | null {
  const [row, setRow] = useState<ContactHealthRow | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!active || !partyId) return undefined;
    getContactHealthAPI({ partyType, partyId })
      .then(h => {
        if (!cancelled) setRow(h.contacts.find(c => c.id === partyId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setRow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [partyType, partyId, active, refreshKey]);
  // A row for another contact (or with Connect off) is never shown.
  return active && row && row.id === partyId ? row : null;
}
