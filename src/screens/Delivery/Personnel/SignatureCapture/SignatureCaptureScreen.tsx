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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DPDeliveriesStackParamList } from '../../../../navigators/stacks/DPDeliveriesStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectDeliveries, saveDeliverySignature } from '../../Admin/AssignDeliveries/deliverySlice';
import { resetSignatureState, setHasDrawn } from './dpSignatureCaptureSlice';
import { THEME } from '../../../../utils/theme';

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
        <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.surface} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={20} color={THEME.colors.neutral700} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capture Signature</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Feather name="inbox" size={28} color={THEME.colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Delivery Not Found</Text>
          <Text style={styles.emptySubtitle}>This delivery may have been removed.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={THEME.colors.neutral700} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Customer Signature</Text>
          <Text style={styles.headerSubtitle}>{delivery.referenceNo}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Customer Info Card */}
        <View style={styles.customerCard}>
          <View style={styles.customerIconWrap}>
            <Feather name="edit-3" size={20} color={THEME.colors.warning} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>SIGNATURE REQUIRED FROM</Text>
            <Text style={styles.customerName}>{delivery.customerName}</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionIcon}>
            <Text style={styles.instructionIconText}>ℹ️</Text>
          </View>
          <Text style={styles.instructionText}>
            Please ask the customer to sign in the white area below to confirm delivery
          </Text>
        </View>

        {/* Signature Canvas */}
        <View style={styles.canvasContainer}>
          <View style={styles.canvasHeader}>
            <View style={styles.canvasLabel}>
              <View style={styles.canvasLabelDot} />
              <Text style={styles.canvasLabelText}>SIGN HERE</Text>
            </View>
            {hasDrawn && (
              <TouchableOpacity onPress={handleClear} style={styles.clearLink}>
                <Feather name="trash-2" size={14} color={THEME.colors.danger} />
                <Text style={styles.clearLinkText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.canvas} {...panResponder.panHandlers}>
            {/* Signature guideline */}
            <View style={styles.guideline} />
            
            {/* Signature dots */}
            {strokes.map((stroke, sIndex) =>
              stroke.map((pt, pIndex) => (
                <View
                  key={`${sIndex}-${pIndex}`}
                  style={[styles.dot, { left: pt.x - 3, top: pt.y - 3 }]}
                />
              )),
            )}
            
            {/* Placeholder hint */}
            {!hasDrawn && (
              <View style={styles.hintContainer}>
                <View style={styles.hintIconWrap}>
                  <Feather name="edit-3" size={24} color={THEME.colors.textTertiary} />
                </View>
                <Text style={styles.hintText}>Draw signature here</Text>
                <Text style={styles.hintSubtext}>Use your finger to sign</Text>
              </View>
            )}
          </View>

          <View style={styles.canvasFooter}>
            <Text style={styles.canvasFooterText}>
              {hasDrawn ? 'Signature captured' : 'Waiting for signature...'}
            </Text>
            <View style={[styles.canvasFooterDot, hasDrawn && styles.canvasFooterDotActive]} />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={THEME.colors.neutral600} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.confirmButton, !hasDrawn && styles.confirmButtonDisabled]}
            onPress={handleDone}
            disabled={!hasDrawn}
            activeOpacity={0.9}
          >
            <Feather name="check" size={18} color={THEME.colors.textInverse} />
            <Text style={styles.confirmButtonText}>Confirm Signature</Text>
          </TouchableOpacity>
        </View>

        {/* Help Link */}
        <TouchableOpacity
          style={styles.helpLink}
          onPress={() => Alert.alert(
            'Signature Tips',
            '• Ask the customer to sign clearly inside the white box\n• Use a finger to draw the signature\n• Tap "Clear" to start over if needed\n• Press "Confirm Signature" when done'
          )}
        >
          <Feather name="help-circle" size={16} color={THEME.colors.primary} />
          <Text style={styles.helpText}>Need help capturing?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.neutral50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    ...THEME.typography.h2,
    color: THEME.colors.neutral700,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...THEME.typography.h3,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },

  content: {
    flex: 1,
    padding: 20,
  },

  // Customer Card
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 16,
    marginBottom: 12,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  customerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  customerIcon: {
    ...THEME.typography.displaySm,
  },
  customerInfo: {},
  customerLabel: {
    ...THEME.typography.overline,
    textTransform: undefined,
    color: THEME.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  customerName: {
    ...THEME.typography.h3,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },

  // Instructions
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.infoLight,
    borderRadius: THEME.radius.lg,
    padding: 14,
    marginBottom: 16,
  },
  instructionIcon: {
    marginRight: 12,
  },
  instructionIconText: {
    ...THEME.typography.h3,
  },
  instructionText: {
    flex: 1,
    ...THEME.typography.bodySm,
    color: THEME.colors.info,
    lineHeight: 19,
  },

  // Canvas Container
  canvasContainer: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
    marginBottom: 16,
    ...THEME.shadows.md,
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    backgroundColor: THEME.colors.neutral50,
  },
  canvasLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  canvasLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
    marginRight: 8,
  },
  canvasLabelText: {
    ...THEME.typography.labelSm,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  clearLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearLinkIcon: {
    ...THEME.typography.caption,
    marginRight: 4,
  },
  clearLinkText: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  canvas: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    position: 'relative',
  },
  guideline: {
    position: 'absolute',
    bottom: '30%',
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: THEME.colors.neutral200,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.textPrimary,
  },
  hintContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    opacity: 0.6,
  },
  hintIcon: {
    ...THEME.typography.displayMd,
  },
  hintText: {
    ...THEME.typography.h4,
    color: THEME.colors.textTertiary,
    marginBottom: 4,
  },
  hintSubtext: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textDisabled,
  },
  canvasFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: THEME.colors.neutral50,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  canvasFooterText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginRight: 8,
  },
  canvasFooterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.neutral300,
  },
  canvasFooterDotActive: {
    backgroundColor: THEME.colors.success,
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingVertical: 14,
  },
  clearButtonIcon: {
    ...THEME.typography.h4,
    marginRight: 8,
  },
  clearButtonText: {
    ...THEME.typography.h4,
    color: THEME.colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.success,
    borderRadius: THEME.radius.lg,
    paddingVertical: 14,
    ...THEME.shadows.md,
  },
  confirmButtonDisabled: {
    backgroundColor: THEME.colors.neutral300,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonIcon: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textInverse,
    marginRight: 8,
  },
  confirmButtonText: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textInverse,
  },

  // Help Link
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  helpIcon: {
    ...THEME.typography.bodyMd,
    marginRight: 6,
  },
  helpText: {
    ...THEME.typography.bodyMd,
    fontWeight: '500',
    color: THEME.colors.primary,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    ...THEME.typography.displayLg,
  },
  emptyTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...THEME.typography.bodyMd,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: THEME.radius.lg,
    ...THEME.shadows.sm,
  },
  emptyButtonText: {
    ...THEME.typography.labelLg,
    color: THEME.colors.textInverse,
  },
});

export default SignatureCaptureScreen;