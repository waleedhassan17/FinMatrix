// THE bottom bar every form and document screen shares. What must hold for it
// to be one system rather than a look: the slots land in one order, a label
// stays on one line, and nothing destructive runs without asking first.
jest.mock('@expo/vector-icons', () => ({ Feather: Object.assign((): null => null, { glyphMap: {} }) }));
jest.mock('../../reports/ReportUI', () => ({ DateField: (): null => null }));
jest.mock('../../../Custom-Components/CustomDropdown', () => ({ __esModule: true, default: (): null => null }));
jest.mock('../../../utils/alert', () => ({ Alert: { alert: jest.fn() } }));
// The sheet is only a Modal with a title: render its rows when it is open.
jest.mock('../../shared/BottomSheet', () => ({
  __esModule: true,
  default: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ActionBar, IconButton, type MoreAction } from '../FormUI';
import { Alert } from '../../../utils/alert';

const alert = Alert.alert as jest.Mock;

const render = (ui: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(ui);
  });
  return tree;
};

/** The bar's tappable controls, by accessibility label, in on-screen order. */
const buttons = (tree: renderer.ReactTestRenderer): string[] =>
  tree.root
    .findAllByType(TouchableOpacity)
    .map(b => b.props.accessibilityLabel as string);

const tap = (tree: renderer.ReactTestRenderer, label: string) => {
  const button = tree.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === label);
  if (!button) throw new Error(`no button "${label}"`);
  act(() => {
    button.props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('slots', () => {
  it('reads Share, More, secondary, primary, left to right', () => {
    const tree = render(
      <ActionBar
        leading={<IconButton icon="share-2" onPress={jest.fn()} accessibilityLabel="Share PDF" />}
        more={[{ label: 'Delete', onPress: jest.fn(), destructive: true }]}
        secondary={{ title: 'Remind', onPress: jest.fn() }}
        primary={{ title: 'Record Payment', onPress: jest.fn() }}
      />,
    );
    expect(buttons(tree)).toEqual(['Share PDF', 'More actions', 'Remind', 'Record Payment']);
  });

  it('draws no empty slot', () => {
    const tree = render(<ActionBar primary={{ title: 'Save', onPress: jest.fn() }} />);
    expect(buttons(tree)).toEqual(['Save']);
  });

  it('takes a node where a button will not do, such as a waiting badge', () => {
    const tree = render(<ActionBar primary={<Text>Awaiting approval</Text>} />);
    expect(buttons(tree)).toEqual([]);
    expect(tree.root.findAllByType(Text).map(t => t.props.children)).toContain('Awaiting approval');
  });

  it('shows the note under the buttons', () => {
    const tree = render(<ActionBar primary={{ title: 'Pay', onPress: jest.fn() }} note="Attach a proof." />);
    expect(tree.root.findAllByType(Text).map(t => t.props.children)).toContain('Attach a proof.');
  });
});

describe('labels', () => {
  it('stay on one line', () => {
    const tree = render(<ActionBar primary={{ title: 'Record Payment', onPress: jest.fn() }} />);
    const label = tree.root.findAllByType(Text).find(t => t.props.children === 'Record Payment');
    expect(label?.props.numberOfLines).toBe(1);
  });
});

describe('More', () => {
  const withMore = (items: MoreAction[]) =>
    render(<ActionBar primary={{ title: 'Apply', onPress: jest.fn() }} more={items} />);

  it('opens a sheet of the actions', () => {
    const tree = withMore([{ label: 'Void', onPress: jest.fn() }]);
    expect(buttons(tree)).not.toContain('Void');
    tap(tree, 'More actions');
    expect(buttons(tree)).toContain('Void');
  });

  it('a plain action runs without a question', () => {
    const onPress = jest.fn();
    const tree = withMore([{ label: 'Edit', onPress }]);
    tap(tree, 'More actions');
    tap(tree, 'Edit');
    act(() => { jest.runAllTimers(); });
    expect(alert).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a destructive action asks first, and runs only on yes', () => {
    const onPress = jest.fn();
    const tree = withMore([{ label: 'Delete', onPress, destructive: true }]);
    tap(tree, 'More actions');
    tap(tree, 'Delete');
    act(() => { jest.runAllTimers(); });
    expect(onPress).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);

    const [, , choices] = alert.mock.calls[0];
    expect(choices[0].style).toBe('cancel');
    choices[1].onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the screen\'s own question when it gives one', () => {
    const tree = withMore([
      {
        label: 'Void',
        onPress: jest.fn(),
        destructive: true,
        confirm: { title: 'Void this credit?', message: 'It cannot be applied.', confirmLabel: 'Void' },
      },
    ]);
    tap(tree, 'More actions');
    tap(tree, 'Void');
    act(() => { jest.runAllTimers(); });
    expect(alert.mock.calls[0].slice(0, 2)).toEqual(['Void this credit?', 'It cannot be applied.']);
  });

  it('confirm: false leaves the asking to the screen', () => {
    const onPress = jest.fn();
    const tree = withMore([{ label: 'Void', onPress, destructive: true, confirm: false }]);
    tap(tree, 'More actions');
    tap(tree, 'Void');
    act(() => { jest.runAllTimers(); });
    expect(alert).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('while the screen is busy', () => {
  it('"⋯" cannot be opened, so no second action can start', () => {
    const tree = render(
      <ActionBar primary={{ title: 'Approve', onPress: jest.fn(), isLoading: true }} moreDisabled more={[{ label: 'Open invoice', onPress: jest.fn() }]} />,
    );
    const more = tree.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === 'More actions');
    expect(more?.props.disabled).toBe(true);
  });

  it('applies to actions shown as buttons too', () => {
    const tree = render(<ActionBar moreDisabled more={[{ label: 'Void', onPress: jest.fn(), destructive: true }]} />);
    const voidBtn = tree.root.findAllByType(TouchableOpacity).find(b => b.props.accessibilityLabel === 'Void');
    expect(voidBtn?.props.disabled).toBe(true);
  });
});

describe('a bar with nothing but More', () => {
  it('shows one action as a button rather than a lone "⋯", still asking first', () => {
    const onPress = jest.fn();
    const tree = render(<ActionBar more={[{ label: 'Void', onPress, destructive: true }]} />);
    expect(buttons(tree)).toEqual(['Void']);
    tap(tree, 'Void');
    expect(onPress).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('shows two as two buttons', () => {
    const tree = render(
      <ActionBar more={[{ label: 'Void', onPress: jest.fn() }, { label: 'Delete', onPress: jest.fn(), destructive: true }]} />,
    );
    expect(buttons(tree)).toEqual(['Void', 'Delete']);
  });
});
