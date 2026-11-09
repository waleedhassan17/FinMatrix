// The row Pay Bills and Receive Payment both settle documents with.
jest.mock('@expo/vector-icons', () => ({ Feather: (): null => null }));

import React from 'react';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { AllocationHeader, AllocationNote, AllocationRow } from '../AllocationRow';

const render = (ui: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(ui);
  });
  return tree;
};
const base = { kind: 'Bill', number: 'BILL-1', balance: 'Rs 8,000.00', detail: 'Due Sep 8, 2026' };
const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => t.props.children);

describe('AllocationRow', () => {
  it('tapping the row ticks it, and it reads its state to a screen reader', () => {
    const onToggle = jest.fn();
    const tree = render(<AllocationRow {...base} checked={false} onToggle={onToggle} />);
    const row = tree.root.findByType(TouchableOpacity);
    expect(row.props.accessibilityLabel).toBe('Bill BILL-1, balance Rs 8,000.00');
    expect(row.props.accessibilityState.checked).toBe(false);
    act(() => row.props.onPress());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('a document credit already covers shows ticked and cannot be unticked', () => {
    const tree = render(<AllocationRow {...base} checked={false} locked onToggle={jest.fn()} />);
    const row = tree.root.findByType(TouchableOpacity);
    expect(row.props.disabled).toBe(true);
    expect(row.props.accessibilityState.checked).toBe(true);
  });

  it('keeps the balance whole on one line', () => {
    const tree = render(<AllocationRow {...base} checked={false} onToggle={jest.fn()} />);
    const balance = tree.root.findAllByType(Text).find(t => t.props.children === base.balance);
    expect(balance?.props.numberOfLines).toBe(1);
  });

  it('passes typed amounts up, and shows the field only when it is given', () => {
    const onChangeText = jest.fn();
    const tree = render(
      <AllocationRow
        {...base}
        checked
        onToggle={jest.fn()}
        amount={{ label: 'Settle (Rs)', value: '', onChangeText, accessibilityLabel: 'Amount on BILL-1' }}
      />,
    );
    act(() => tree.root.findByType(TextInput).props.onChangeText('500'));
    expect(onChangeText).toHaveBeenCalledWith('500');

    const without = render(<AllocationRow {...base} checked onToggle={jest.fn()} />);
    expect(without.root.findAllByType(TextInput)).toHaveLength(0);
  });

  it('shows what it is given under the due date', () => {
    const tree = render(
      <AllocationRow {...base} checked={false} onToggle={jest.fn()}>
        <AllocationNote tone="success">Paid in full</AllocationNote>
      </AllocationRow>,
    );
    expect(texts(tree)).toContain('Paid in full');
  });
});

describe('AllocationHeader', () => {
  it('is a plain label unless it can select all', () => {
    const plain = render(<AllocationHeader label="Invoice" />);
    expect(plain.root.findAllByType(TouchableOpacity)).toHaveLength(0);
    expect(texts(plain)).toEqual(['Invoice', 'Balance']);

    const onToggleAll = jest.fn();
    const all = render(<AllocationHeader label="Select all" onToggleAll={onToggleAll} allChecked />);
    const toggle = all.root.findByType(TouchableOpacity);
    expect(toggle.props.accessibilityState.checked).toBe(true);
    act(() => toggle.props.onPress());
    expect(onToggleAll).toHaveBeenCalledTimes(1);
  });
});
