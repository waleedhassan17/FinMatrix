// ═══════════════════════════════════════════════════════
// FinMatrix Connect — WhatsApp delivery API
// (see CONNECT_API_CONTRACT.md). Every call goes through
// the shared axios instance in apiHelpers.
// ═══════════════════════════════════════════════════════
import { api, toApiError } from '../network/apiHelpers';
import {
  contactHealthSerializer,
  enqueueResultSerializer,
  messagingSettingsSerializer,
  messagingStatsSerializer,
  timelineSerializer,
} from '../../serializers/messagingSerializer';
import type {
  ContactHealth,
  EnqueueResult,
  EventRule,
  MessageEvent,
  MessagingSettings,
  MessagingStats,
  QuietHours,
  SendableDocType,
  TimelineMessage,
} from '../../models/messagingModel';

export interface MessagingSettingsPatch {
  enabled?: boolean;
  defaultLanguage?: 'en' | 'ur';
  eventRules?: Partial<Record<MessageEvent, EventRule>>;
  quietHours?: QuietHours | null;
  reminderSchedule?: { beforeDue: number[]; afterDue: number[] };
  monthlyCap?: number | null;
}

const call = async <T>(fn: () => Promise<{ data: any }>, map: (d: any) => T): Promise<T> => {
  try {
    const res = await fn();
    return map(res.data);
  } catch (e) {
    throw toApiError(e);
  }
};

export const getMessagingSettingsAPI = (): Promise<MessagingSettings> =>
  call(() => api.get('/settings/messaging'), messagingSettingsSerializer);

export const updateMessagingSettingsAPI = (patch: MessagingSettingsPatch): Promise<MessagingSettings> =>
  call(() => api.put('/settings/messaging', patch), messagingSettingsSerializer);

export const sendTestMessageAPI = (): Promise<EnqueueResult> =>
  call(() => api.post('/settings/messaging/test', {}), enqueueResultSerializer);

export const confirmContactsConsentAPI = (): Promise<MessagingSettings> =>
  call(() => api.post('/settings/messaging/confirm-contacts-consent', {}), messagingSettingsSerializer);

export const getMessageTimelineAPI = (docType: string, docId: string): Promise<TimelineMessage[]> =>
  call(() => api.get('/messages', { params: { docType, docId } }), timelineSerializer);

export const resendMessageAPI = (messageId: string): Promise<EnqueueResult> =>
  call(() => api.post(`/messages/${messageId}/resend`, {}), enqueueResultSerializer);

export const sendMessageAPI = (body: {
  docType: SendableDocType;
  docId: string;
  event?: string;
  startDate?: string;
  endDate?: string;
}): Promise<EnqueueResult> => call(() => api.post('/messages/send', body), enqueueResultSerializer);

export const logManualShareAPI = (body: {
  docType: SendableDocType;
  docId: string;
  toPhone: string;
  event?: string;
}): Promise<EnqueueResult> => call(() => api.post('/messages/manual-share', body), enqueueResultSerializer);

export const getMessagingStatsAPI = (from?: string, to?: string): Promise<MessagingStats> =>
  call(() => api.get('/messages/stats', { params: { from, to } }), messagingStatsSerializer);

export const getContactHealthAPI = (filter?: {
  partyType: 'customer' | 'vendor';
  partyId: string;
}): Promise<ContactHealth> =>
  call(() => api.get('/messages/contact-health', { params: filter ?? {} }), contactHealthSerializer);

/** Path for authedDownload: the PDF exactly as it was sent. */
export const messageMediaPath = (messageId: string) => `/messages/${messageId}/media`;
