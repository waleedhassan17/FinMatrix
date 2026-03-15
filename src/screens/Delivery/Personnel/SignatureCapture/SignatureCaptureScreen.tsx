import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../../../theme';
import type { DPDeliveriesStackParamList } from '../../../../navigators/stacks/DPDeliveriesStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectDeliveries, saveDeliverySignature } from '../../Admin/AssignDeliveries/deliverySlice';
import { resetSignatureState, setHasDrawn } from './dpSignatureCaptureSlice';

type Props = NativeStackScreenProps<DPDeliveriesStackParamList, 'SignatureCapture'>;

interface Point {
  x: number;
  y: number;
}

const encodeBase64 = (plain: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  while (i < plain.length) {
    const c1 = plain.charCodeAt(i++);
    const c2 = plain.charCodeAt(i++);
    const c3 = plain.charCodeAt(i++);

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (c3 >> 6);
    let e4 = c3 & 63;

    if (Number.isNaN(c2)) {
      e3 = 64;
      e4 = 64;
    } else if (Number.isNaN(c3)) {
      e4 = 64;
    }

    output += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return output;
};

const SignatureCaptureScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId } = route.params;
  const dispatch = useAppDispatch();
  const deliveries = useAppSelector(selectDeliveries);
  const delivery = deliveries.find(d => d.id === deliveryId);

  const [strokes, setStrokes] = useState<Point[][]>([]);
  const currentStroke = useRef<Point[]>([]);

  const hasDrawn = useMemo(() => strokes.some(st => st.length > 0), [strokes]);

  const addPoint = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    currentStroke.current.push({ x: locationX, y: locationY });
    setStrokes(prev => {
      const draft = [...prev];
      if (!draft.length || draft[draft.length - 1] !== currentStroke.current) {
        draft.push(currentStroke.current);
      }
      return [...draft];
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        currentStroke.current = [];
        addPoint(evt);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gesture: PanResponderGestureState) => {
        addPoint(evt);
      },
      onPanResponderRelease: () => {
        dispatch(setHasDrawn(true));
      },
    }),
  ).current;

  const handleClear = () => {
    setStrokes([]);
    currentStroke.current = [];
    dispatch(setHasDrawn(false));
  };

  const handleDone = () => {
    if (!hasDrawn || !delivery) return;
    const payload = JSON.stringify({ deliveryId, strokes });
    const signatureBase64 = encodeBase64(payload);
    dispatch(saveDeliverySignature({
      deliveryId,
      signatureBase64,
      signedBy: delivery.customerName,
    }));
    dispatch(resetSignatureState());
    navigation.navigate('CustomerConfirm', { deliveryId });
  };

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><Text style={styles.infoText}>Delivery not found.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>Back</Text></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Customer Signature</Text>
          <Text style={styles.subtitle}>{delivery.referenceNo}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.signOf}>Signature of: {delivery.customerName}</Text>

        <View style={styles.canvas} {...panResponder.panHandlers}>
          {strokes.map((stroke, sIndex) =>
            stroke.map((pt, pIndex) => (
              <View
                key={`${sIndex}-${pIndex}`}
                style={[styles.dot, { left: pt.x - 2, top: pt.y - 2 }]}
              />
            )),
          )}
          {!hasDrawn && <Text style={styles.hint}>Draw signature here</Text>}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.doneBtn, !hasDrawn && styles.doneBtnDisabled]}
            onPress={handleDone}
            disabled={!hasDrawn}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert('Tip', 'Ask customer to sign clearly inside the box.')}
        >
          <Text style={styles.help}>Need help capturing? Tap here.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoText: { ...typography.body, color: colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { ...typography.small, color: colors.primary, fontWeight: '700' },
  headerCenter: { alignItems: 'center' },
  title: { ...typography.h4, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  content: { flex: 1, padding: spacing.lg },
  signOf: { ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.md },
  canvas: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 280,
  },
  hint: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    marginTop: -10,
    ...typography.caption,
    color: '#94A3B8',
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0F172A',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  clearBtnText: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  doneBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: '#16A34A',
  },
  doneBtnDisabled: { backgroundColor: '#9CA3AF' },
  doneBtnText: { ...typography.small, color: colors.white, fontWeight: '700' },
  help: {
    ...typography.caption,
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default SignatureCaptureScreen;
