import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { OrderStackParamList } from '../../../navigation/types';
import * as Location from 'expo-location';
import * as orderService from '../../../services/orderService';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Route = RouteProp<OrderStackParamList, 'TrackOrder'>;
type Phase = 'idle' | 'tracking' | 'nearby' | 'arrived';

// ── Haversine distance (metres) ──────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function etaMinutes(m: number): number {
  return Math.max(1, Math.ceil(m / 80)); // 80 m/min walking pace
}

// ── Status chip helper ───────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  customer_on_way: 'On the Way',
  ready_for_pickup: 'Ready for Pickup',
  arrived: 'Arrived',
  collected: 'Collected',
};

export default function TrackOrderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { orderId, orderNumber, items, pickupPointName, pickupPointAddress, status, channel } = route.params;

  const isDelivery = channel === 'home_delivery' || channel === 'cl_order';

  const [phase, setPhase] = useState<Phase>(
    status === 'customer_on_way' || status === 'arrived' ? 'tracking' : 'idle'
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [hubCoords, setHubCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hubAddress, setHubAddress] = useState(pickupPointAddress ?? pickupPointName);
  const [nearbyAlerted, setNearbyAlerted] = useState(false);
  const [busyStart, setBusyStart] = useState(false);
  const [orderStatus, setOrderStatus] = useState(status);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for "arrived" phase
  useEffect(() => {
    if (phase === 'arrived') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [phase]);

  const stopTracking = useCallback(() => {
    if (locationSub.current) {
      locationSub.current.remove();
      locationSub.current = null;
    }
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const startTracking = async () => {
    setBusyStart(true);
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to track your journey.');
        return;
      }

      // Call backend to get hub coordinates and mark order as on_the_way
      const trackData = await orderService.startTracking(orderId);
      const hub = { lat: trackData.hubLat, lng: trackData.hubLng };
      setHubCoords(hub);
      setHubAddress(trackData.hubAddress || hubAddress);
      setOrderStatus('customer_on_way');
      setPhase('tracking');

      // Start watching position
      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 20,
        },
        async (loc) => {
          const { latitude, longitude } = loc.coords;
          const dist = haversineMeters(latitude, longitude, hub.lat, hub.lng);
          setDistance(dist);

          // Post location update to backend (fire-and-forget)
          orderService.sendLocationUpdate(orderId, latitude, longitude, dist).catch(() => {});

          // 200 m threshold — notify hub
          if (dist <= 200 && !nearbyAlerted) {
            setNearbyAlerted(true);
            setPhase('nearby');
          }

          // 50 m threshold — customer arrived
          if (dist <= 50) {
            stopTracking();
            try {
              await orderService.markArrived(orderId);
            } catch { /* best-effort */ }
            setOrderStatus('arrived');
            setPhase('arrived');
          }
        }
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not start tracking. Try again.');
    } finally {
      setBusyStart(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderStatusBar() {
    // Delivery channels use a 5-step timeline; express pickup uses a 4-step one
    const steps = isDelivery
      ? ['Placed', 'Confirmed', 'Preparing', 'On the Way', 'Delivered']
      : ['Placed', 'Preparing', 'Ready', 'Collected'];
    const expressStepMap: Record<string, number> = {
      confirmed: 1,
      customer_on_way: 1,
      ready_for_pickup: 2,
      arrived: 2,
      collected: 3,
    };
    const deliveryStepMap: Record<string, number> = {
      placed: 0,
      confirmed: 1,
      preparing: 2,
      out_for_delivery: 3,
      delivered: 4,
    };
    const active = isDelivery
      ? (deliveryStepMap[orderStatus] ?? 0)
      : (expressStepMap[orderStatus] ?? 0);
    return (
      <View style={styles.statusBar}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <View style={styles.statusStep}>
              <View style={[styles.stepDot, i <= active && styles.stepDotActive]}>
                {i <= active && <View style={styles.stepDotInner} />}
              </View>
              <Text style={[styles.stepLabel, i <= active && styles.stepLabelActive]}>{s}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, i < active && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  }

  function renderDeliveryPhase() {
    const INFO: Record<string, { icon: string; title: string; sub: string }> = {
      placed:           { icon: '📋', title: 'Order Placed!',         sub: "We've received your order and it's being confirmed." },
      confirmed:        { icon: '✅', title: 'Order Confirmed',        sub: 'Your order is confirmed and is being prepared.' },
      preparing:        { icon: '🧑‍🍳', title: 'Preparing Your Order', sub: 'Our team is packing your fresh groceries carefully.' },
      out_for_delivery: { icon: '🚴', title: 'Out for Delivery',       sub: 'Your order is on its way to you!' },
      delivered:        { icon: '🎉', title: 'Order Delivered!',        sub: 'Enjoy your fresh groceries!' },
    };
    const info = INFO[orderStatus] ?? INFO.confirmed;
    return (
      <View style={styles.phaseCard}>
        <Text style={styles.phaseIcon}>{info.icon}</Text>
        <Text style={styles.phaseTitle}>{info.title}</Text>
        <Text style={styles.phaseSub}>{info.sub}</Text>
        <View style={styles.hubCard}>
          <Text style={styles.hubName}>
            {channel === 'cl_order' ? '👥 Order via Community Leader' : '🏠 Home Delivery'}
          </Text>
          <Text style={styles.hubAddr}>
            {channel === 'cl_order'
              ? 'Your CL will coordinate delivery to your address'
              : 'Delivery to your registered address'}
          </Text>
        </View>
      </View>
    );
  }

  function renderIdlePhase() {
    return (
      <View style={styles.phaseCard}>
        <Text style={styles.phaseIcon}>🏪</Text>
        <Text style={styles.phaseTitle}>Ready to pick up?</Text>
        <Text style={styles.phaseSub}>
          Tap below when you leave for the pickup hub. We'll notify the hub as you approach.
        </Text>

        <View style={styles.hubCard}>
          <Text style={styles.hubName}>{pickupPointName}</Text>
          {!!hubAddress && <Text style={styles.hubAddr}>{hubAddress}</Text>}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={startTracking}
          disabled={busyStart}
          activeOpacity={0.85}
        >
          {busyStart ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>I'm on My Way!</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  function renderTrackingPhase() {
    return (
      <View style={styles.phaseCard}>
        {phase === 'nearby' && (
          <View style={styles.nearbyBanner}>
            <Text style={styles.nearbyText}>Hub notified — they're getting your order ready!</Text>
          </View>
        )}

        <Text style={styles.phaseIcon}>🚶</Text>
        <Text style={styles.phaseTitle}>You're on the way!</Text>

        {distance !== null ? (
          <View style={styles.distanceBlock}>
            <Text style={styles.distanceValue}>{formatDistance(distance)}</Text>
            <Text style={styles.distanceSub}>from the hub</Text>
            <Text style={styles.etaText}>ETA ~{etaMinutes(distance)} min</Text>
          </View>
        ) : (
          <View style={styles.distanceBlock}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.distanceSub}>Locating you...</Text>
          </View>
        )}

        <View style={styles.hubCard}>
          <Text style={styles.hubName}>{pickupPointName}</Text>
          {!!hubAddress && <Text style={styles.hubAddr}>{hubAddress}</Text>}
        </View>

        <Text style={styles.trackingNote}>
          Hub will be automatically notified when you're 200m away.
        </Text>
      </View>
    );
  }

  function renderArrivedPhase() {
    return (
      <View style={[styles.phaseCard, styles.arrivedCard]}>
        <Text style={styles.arrivedEmoji}>✅</Text>
        <Text style={styles.arrivedTitle}>You've Arrived!</Text>
        <Text style={styles.arrivedSub}>Show this Order ID to the staff:</Text>

        <Animated.View style={[styles.orderIdBox, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.orderIdText}>{orderNumber}</Text>
        </Animated.View>

        <Text style={styles.staffNote}>Staff has been notified and will bring your order.</Text>

        <View style={styles.hubCard}>
          <Text style={styles.hubName}>{pickupPointName}</Text>
          {!!hubAddress && <Text style={styles.hubAddr}>{hubAddress}</Text>}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Order summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.orderNum}>{orderNumber}</Text>
            <View style={[styles.channelBadge, isDelivery && styles.channelBadgeDelivery]}>
              <Text style={[styles.channelText, isDelivery && styles.channelTextDelivery]}>
                {channel === 'home_delivery' ? '🏠 Home' : channel === 'cl_order' ? '👥 CL Order' : '⚡ Express'}
              </Text>
            </View>
          </View>
          <View style={styles.itemsList}>
            {items.slice(0, 3).map((item, idx) => (
              <Text key={idx} style={styles.itemText}>
                • {item.name} × {item.qty}
              </Text>
            ))}
            {items.length > 3 && (
              <Text style={styles.itemMore}>+{items.length - 3} more items</Text>
            )}
          </View>
        </View>

        {/* Progress bar — express uses pickup steps; delivery uses delivery steps */}
        {renderStatusBar()}

        {/* Phase-specific content */}
        {isDelivery ? (
          renderDeliveryPhase()
        ) : (
          <>
            {phase === 'idle' && renderIdlePhase()}
            {(phase === 'tracking' || phase === 'nearby') && renderTrackingPhase()}
            {phase === 'arrived' && renderArrivedPhase()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  scroll: { padding: spacing.md, paddingBottom: 48 },

  // Summary
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNum: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  channelBadge: { backgroundColor: '#E3F2FD', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  channelText: { fontSize: 11, fontWeight: '700', color: '#1565C0' },
  channelBadgeDelivery: { backgroundColor: '#E8F5E9' },
  channelTextDelivery: { color: '#14532D' },
  itemsList: { marginTop: 4 },
  itemText: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  itemMore: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2 },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  statusStep: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: { borderColor: colors.primary },
  stepDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  stepLabel: { fontSize: 9, color: colors.textLight, fontWeight: '600', textAlign: 'center' },
  stepLabelActive: { color: colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.borderMid, marginBottom: 14 },
  stepLineActive: { backgroundColor: colors.primary },

  // Phase card
  phaseCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  phaseIcon: { fontSize: 56, marginBottom: 12 },
  phaseTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  phaseSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  // Nearby banner
  nearbyBanner: {
    backgroundColor: colors.activeBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  nearbyText: { fontSize: 13, color: colors.primaryDark, fontWeight: '700', textAlign: 'center' },

  // Hub card
  hubCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hubName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  hubAddr: { fontSize: 12, color: colors.textSecondary },

  // Primary button
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Distance block
  distanceBlock: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 12,
  },
  distanceValue: { fontSize: 48, fontWeight: '900', color: colors.primary, lineHeight: 56 },
  distanceSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  etaText: { fontSize: 16, color: colors.textPrimary, fontWeight: '700', marginTop: 6 },
  trackingNote: { fontSize: 12, color: colors.textLight, textAlign: 'center', lineHeight: 18 },

  // Arrived
  arrivedCard: { borderWidth: 2, borderColor: colors.primary },
  arrivedEmoji: { fontSize: 64, marginBottom: 12 },
  arrivedTitle: { fontSize: 24, fontWeight: '900', color: colors.primary, marginBottom: 6 },
  arrivedSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  orderIdBox: {
    backgroundColor: colors.activeBg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: 16,
  },
  orderIdText: { fontSize: 28, fontWeight: '900', color: colors.primaryDarker, letterSpacing: 2 },
  staffNote: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
});
