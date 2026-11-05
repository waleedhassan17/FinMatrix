// FinMatrix Connect network layer: every call goes through the shared axios
// instance, at the contract's paths, and comes back through the serializers.
jest.mock('../../network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  toApiError: jest.fn((e: any) => Object.assign(new Error(e?.message ?? 'Request failed'), { code: e?.code })),
}));

import { api } from '../../network/apiHelpers';
import {
  getContactHealthAPI,
  getMessageTimelineAPI,
  getMessagingSettingsAPI,
  logManualShareAPI,
  messageMediaPath,
  resendMessageAPI,
  sendMessageAPI,
  sendTestMessageAPI,
  updateMessagingSettingsAPI,
} from '../messagingNetwork';

const get = api.get as jest.Mock;
const post = api.post as jest.Mock;
const put = api.put as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('messagingNetwork', () => {
  it('reads the settings and fills in defaults', async () => {
    get.mockResolvedValue({ data: { success: true, data: { enabled: true, eventRules: { statement: 'auto' } } } });
    const s = await getMessagingSettingsAPI();
    expect(get).toHaveBeenCalledWith('/settings/messaging');
    expect(s.enabled).toBe(true);
    expect(s.eventRules.statement).toBe('auto');
    expect(s.eventRules.invoice_issued).toBe('auto');
  });

  it('saves only what changed, with PUT', async () => {
    put.mockResolvedValue({ data: { data: { enabled: false } } });
    await updateMessagingSettingsAPI({ eventRules: { remittance: 'off' } });
    expect(put).toHaveBeenCalledWith('/settings/messaging', { eventRules: { remittance: 'off' } });
  });

  it('asks for a document timeline with docType and docId', async () => {
    get.mockResolvedValue({ data: { data: { messages: [{ id: 'm1', status: 'read', events: [] }] } } });
    const t = await getMessageTimelineAPI('invoice', 'i1');
    expect(get).toHaveBeenCalledWith('/messages', { params: { docType: 'invoice', docId: 'i1' } });
    expect(t[0]).toMatchObject({ id: 'm1', status: 'read' });
  });

  it('sends explicitly, resends, logs a manual share and sends a test', async () => {
    post.mockResolvedValue({ data: { data: { id: 'x', status: 'queued', skipReason: null, duplicate: false } } });
    expect(await sendMessageAPI({ docType: 'invoice', docId: 'i1', event: 'reminder' })).toMatchObject({ status: 'queued' });
    expect(post).toHaveBeenLastCalledWith('/messages/send', { docType: 'invoice', docId: 'i1', event: 'reminder' });
    await resendMessageAPI('m9');
    expect(post).toHaveBeenLastCalledWith('/messages/m9/resend', {});
    await logManualShareAPI({ docType: 'payment', docId: 'p1', toPhone: '0300 1234567' });
    expect(post).toHaveBeenLastCalledWith('/messages/manual-share', { docType: 'payment', docId: 'p1', toPhone: '0300 1234567' });
    await sendTestMessageAPI();
    expect(post).toHaveBeenLastCalledWith('/settings/messaging/test', {});
  });

  it('asks contact health for one contact', async () => {
    get.mockResolvedValue({ data: { data: { summary: { total: 1 }, contacts: [{ id: 'c1', status: 'opted_out' }] } } });
    const h = await getContactHealthAPI({ partyType: 'customer', partyId: 'c1' });
    expect(get).toHaveBeenCalledWith('/messages/contact-health', { params: { partyType: 'customer', partyId: 'c1' } });
    expect(h.contacts[0].status).toBe('opted_out');
  });

  it('keeps the error code for the screen', async () => {
    post.mockRejectedValue({ message: 'Nothing is owed on this invoice', code: 'NOTHING_OWED' });
    await expect(sendMessageAPI({ docType: 'invoice', docId: 'i1' })).rejects.toMatchObject({ code: 'NOTHING_OWED' });
  });

  it('builds the media path for "View PDF sent"', () => {
    expect(messageMediaPath('m1')).toBe('/messages/m1/media');
  });
});
