// The segmented control never breaks a label across lines: equal segments
// when the labels fit, widths by label when they do not, a sideways scroll
// when even that runs out of room. Inventory Valuation's four tabs are the
// case that wrapped "Reconciliation" mid-word.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (): null => null,
  useAppDispatch: () => jest.fn(),
}));
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));

import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { Segmented, segmentFit } from '../ReportUI';

const TABS = ['Items', 'Top sellers', 'Health', 'Reconciliation'];

describe('segmentFit', () => {
  it('keeps equal segments when every label fits its share', () => {
    expect(segmentFit([50, 55, 66], 300)).toBe('equal');
  });

  it('sizes segments by label when one does not fit an equal share', () => {
    // Inventory Valuation on a 360dp phone: ~205dp of text in a ~315dp track.
    expect(segmentFit([31, 60, 36, 78], 315)).toBe('content');
  });

  it('scrolls when the labels need more than the track', () => {
    expect(segmentFit([80, 90, 100, 120], 315)).toBe('scroll');
  });

  it('draws equal before anything is measured', () => {
    expect(segmentFit([], 300)).toBe('equal');
    expect(segmentFit([40, 40], 0)).toBe('equal');
  });
});

describe('Segmented', () => {
  const mounted: renderer.ReactTestRenderer[] = [];
  afterEach(() => {
    act(() => mounted.splice(0).forEach(t => t.unmount()));
  });
  const render = (onChange = jest.fn()) => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Segmented options={TABS} activeIndex={3} onChange={onChange} />);
    });
    mounted.push(tree);
    return tree;
  };

  /** Labels a screen reader reaches: not inside the hidden measuring copy. */
  const heardLabels = (tree: renderer.ReactTestRenderer) =>
    tree.root
      .findAllByType(Text)
      .filter(t => {
        for (let p = t.parent; p; p = p.parent) if (p.props?.accessibilityElementsHidden) return false;
        return true;
      });

  it('reads each label once, on one line', () => {
    const labels = heardLabels(render());
    expect(labels.map(t => t.props.children)).toEqual(TABS);
    labels.forEach(t => expect(t.props.numberOfLines).toBe(1));
  });

  it('hands the tapped index back', () => {
    const onChange = jest.fn();
    const tree = render(onChange);
    // The first match per label is the touchable itself.
    const button = (label: string) =>
      tree.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === label)[0];
    act(() => button('Top sellers, 2 of 4').props.onPress());
    expect(onChange).toHaveBeenCalledWith(1);
    expect(button('Reconciliation, 4 of 4').props.accessibilityState).toEqual({ selected: true });
  });

  /** Lays the track out at `track` wide and each hidden label at its width. */
  const layOut = (tree: renderer.ReactTestRenderer, track: number, widths: number[]) => {
    const hidden = tree.root.find(n => n.props?.accessibilityElementsHidden === true);
    const measures = hidden.findAllByType(Text);
    const trackView = hidden.parent!;
    act(() => {
      trackView.props.onLayout({ nativeEvent: { layout: { width: track + 6, height: 38, x: 0, y: 0 } } });
      measures.forEach((t, i) => t.props.onLayout({ nativeEvent: { layout: { width: widths[i], height: 18, x: 0, y: 0 } } }));
    });
  };
  const segmentStyles = (tree: renderer.ReactTestRenderer) =>
    tree.root
      .findAll(n => typeof n.props.onPress === 'function' && !!n.props.accessibilityLabel && n.props.style !== undefined)
      .map(n => StyleSheet.flatten(n.props.style));

  it('gives a long label the room it needs once measured', () => {
    const tree = render();
    layOut(tree, 315, [31, 60, 36, 78]);
    const styles = segmentStyles(tree);
    expect(styles.length).toBeGreaterThan(0);
    styles.forEach(s => expect(s.flexBasis).toBe('auto'));
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(0);
  });

  it('scrolls sideways when even that overflows', () => {
    const tree = render();
    layOut(tree, 315, [80, 90, 100, 120]);
    expect(tree.root.findAllByType(ScrollView)).toHaveLength(1);
  });
});
