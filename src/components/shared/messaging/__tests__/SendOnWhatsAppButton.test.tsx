// The one WhatsApp button: with Connect on the SERVER sends; with it off the
// wa.me chat opens as before and the share is logged; with no usable number it
// is disabled and says why.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock('../../../../networks/messaging/messagingNetwork', () => ({
  sendMessageAPI: jest.fn(),
  logManualShareAPI: jest.fn(),
}));
const connect = { enabled: true, featureOn: true };
jest.mock('../../../../hooks/useWhatsappConnect', () => ({
  useWhatsappConnect: () => connect,
}));
jest.mock('../../../../Custom-Components/CustomButton', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => (
      <RN.TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} testID="btn">
        <RN.Text>{title}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };
});

import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import SendOnWhatsAppButton from '../SendOnWhatsAppButton';
import { logManualShareAPI, sendMessageAPI } from '../../../../networks/messaging/messagingNetwork';

const send = sendMessageAPI as jest.Mock;
const log = logManualShareAPI as jest.Mock;

const render = (props: Partial<React.ComponentProps<typeof SendOnWhatsAppButton>> = {}) => {
  const fallback = jest.fn().mockResolvedValue({ opened: true });
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <SendOnWhatsAppButton
        title="Send reminder"
        docType="invoice"
        docId="i1"
        event="reminder"
        phone="0312 4890176"
        fallback={fallback}
        {...props}
      />,
    );
  });
  return { tree, fallback };
};
const press = async (tree: renderer.ReactTestRenderer) => {
  await act(async () => {
    tree.root.findByProps({ testID: 'btn' }).props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  connect.enabled = true;
  connect.featureOn = true;
  send.mockResolvedValue({ id: 'm1', status: 'queued', skipReason: null, duplicate: false });
  log.mockResolvedValue({ id: 'm2', status: 'sent' });
});

it('Connect on: the server sends, the chat does not open', async () => {
  const { tree, fallback } = render();
  await press(tree);
  expect(send).toHaveBeenCalledWith({ docType: 'invoice', docId: 'i1', event: 'reminder' });
  expect(fallback).not.toHaveBeenCalled();
});

it('Connect off: opens the wa.me chat, then logs the share', async () => {
  connect.enabled = false;
  const { tree, fallback } = render();
  await press(tree);
  expect(fallback).toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith({ docType: 'invoice', docId: 'i1', toPhone: '0312 4890176', event: 'reminder' });
});

it('Connect not in the plan: opens the chat and logs nothing', async () => {
  connect.enabled = false;
  connect.featureOn = false;
  const { tree, fallback } = render();
  await press(tree);
  expect(fallback).toHaveBeenCalled();
  expect(log).not.toHaveBeenCalled();
});

it('no WhatsApp number: disabled, with the reason', () => {
  const { tree } = render({ phone: '12345' });
  expect(tree.root.findByProps({ testID: 'btn' }).props.disabled).toBe(true);
  const texts = tree.root.findAllByType(Text).map(t => t.props.children);
  expect(texts).toContain('No WhatsApp number');
});

it('opted out: disabled, with the reason', () => {
  const { tree } = render({ optedOut: true });
  expect(tree.root.findByProps({ testID: 'btn' }).props.disabled).toBe(true);
  const texts = tree.root.findAllByType(Text).map(t => t.props.children);
  expect(texts).toContain('Opted out of WhatsApp');
});
