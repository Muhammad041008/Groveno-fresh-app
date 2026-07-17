import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../../navigation/types';
import * as locationService from '../../../services/locationService';
import * as orderService from '../../../services/orderService';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

let MapView: any = null;
let Marker: any = null;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch {}

type Nav = NativeStackNavigationProp<CartStackParamList, 'ExpressPickupTracking'>;
type Route = NativeStackScreenProps<CartStackParamList, 'ExpressPickupTracking'>['route'];

const STEPS = ['Placed', 'Preparing', 'Ready', 'Collected'];

export default function ExpressPickupTrackingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId, orderNumber, hubLat, hubLng, hubAddress, hubName } = route.params;

  const [tracking, setTracking] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [hubNotified, setHubNotified] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const subscriptionRef = useRef<any>(null);
  const nearbyAlertSent = useRef(false);
  const arrivedAlertSent = useRef(false);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  const startTracking = async () => {
    setTracking(true);
    try {
      const sub = await locationService.watchLocation((coords) => {
        setCurrentLocation(coords);
        const dist = locationService.getDistanceMeters(
          coords.latitude, coords.longitude, hubLat, hubLng
        );
        setDistance(dist);

        if (dist <= 200 && !nearbyAlertSent.current) {
          nearbyAlertSent.current = true;
          setHubNotified(true);
          orderService.sendLocationUpdate(orderId, coords.latitude, coords.longitude, dist).catch(() => {});
        }

        if (dist <= 50 && !arrivedAlertSent.current) {
          arrivedAlertSent.current = true;
          setArrived(true);
          setActiveStep(2);
          subscriptionRef.current?.remove();
          orderService.markArrived(orderId).catch(() => {});
        }
      });
      if (sub) subscriptionRef.current = sub;
    } catch {
      Alert.alert('Location Error', 'Could not start location tracking.');
      setTracking(false);
    }
  };

  const formatDistance = (d: number) => {
    if (d >= 1000) return `${(d / 1000).toFixed(1)} km`;
    return `${Math.round(d)} m`;
  };
  const estimateETA = (d: number) => Math.max(Math.round(d / 80), 1);

  const mapRegion = {
    latitude: hubLat,
    longitude: hubLng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Arrived Screen
  if (arrived) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.arrivedContainer}>
          <Text style={styles.arrivedEmoji}>✅</Text>
          <Text style={styles.arrivedTitle}>You've Arrived!</Text>
          <Text style={styles.arrivedSub}>Show this Order ID to staff:</Text>
          <View style={styles.orderIdBox}>
            <Text style={styles.orderIdText}>{orderNumber}</Text>
          </View>
          <Text style={styles.arrivedNote}>Staff has been notified 🔔{'\n'}They will bring your order</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => Alert.alert('Copied!', orderNumber)}
          >
            <Ionicons name="copy-outline" size={16} color={colors.primary} />
            <Text style={styles.copyText}>Copy Order ID</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Express Pickup</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Status Steps */}
      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <View style={[styles.step, i <= activeStep && styles.stepActive]}>
              <Text style={[styles.stepText, i <= activeStep && styles.stepTextActive]}>{step}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < activeStep && styles.stepLineActive]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {MapView ? (
          <MapView style={styles.map} region={mapRegion} showsUserLocation={tracking}>
            <Marker
              coordinate={{ latitude: hubLat, longitude: hubLng }}
              title={hubName}
              description={hubAddress}
            >
              <View style={styles.hubPin}>
                <Text style={{ fontSize: 20 }}>🏪</Text>
              </View>
            </Marker>
          </MapView>
        ) : (
          <View style={[styles.map, styles.mapFallback]}>
            <Text style={{ fontSize: 40 }}>🗺️</Text>
            <Text style={styles.mapFallbackText}>Live map in dev build</Text>
          </View>
        )}
      </View>

      <ScrollableBody>
        {/* Hub Info */}
        <View style={styles.hubCard}>
          <Text style={styles.hubName}>{hubName}</Text>
          <Text style={styles.hubAddr}>{hubAddress}</Text>
        </View>

        {/* Stats */}
        {tracking && distance !== null && (
          <View style={styles.statsRow}>
            <StatBox label="Distance" value={formatDistance(distance)} icon="📍" />
            <StatBox label="ETA" value={`~${estimateETA(distance)} min`} icon="⏱️" />
          </View>
        )}

        {/* Nearby notification */}
        {hubNotified && (
          <View style={styles.notifyBanner}>
            <Text style={styles.notifyText}>⚡ Hub notified! Your order will be ready.</Text>
          </View>
        )}

        {/* Order ID */}
        <View style={styles.orderBox}>
          <Text style={styles.orderBoxLabel}>Your Order ID</Text>
          <Text style={styles.orderBoxId}>{orderNumber}</Text>
        </View>

        {/* CTA Button */}
        {!tracking ? (
          <TouchableOpacity style={styles.trackBtn} onPress={startTracking} activeOpacity={0.85}>
            <Text style={styles.trackBtnText}>🚶 I'm on My Way!</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.trackingActive}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.trackingText}>Live tracking active...</Text>
          </View>
        )}
      </ScrollableBody>
    </SafeAreaView>
  );
}

function ScrollableBody({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, padding: spacing.md, gap: 12 }}>
      {children}
    </View>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  steps: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  step: { alignItems: 'center', paddingHorizontal: 4 },
  stepActive: {},
  stepText: { fontSize: 11, color: colors.textLight, fontWeight: '500' },
  stepTextActive: { color: colors.primary, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: colors.primary },
  mapContainer: { height: 220 },
  map: { flex: 1 },
  mapFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', gap: 8 },
  mapFallbackText: { fontSize: 14, color: colors.textSecondary },
  hubPin: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.card },
  hubCard: { backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 14, ...shadows.card },
  hubName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  hubAddr: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', ...shadows.card },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  notifyBanner: { backgroundColor: '#FFF8E1', borderRadius: borderRadius.md, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.expressColor },
  notifyText: { fontSize: 13, color: '#B45309', fontWeight: '600' },
  orderBox: { backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  orderBoxLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  orderBoxId: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: 2 },
  trackBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 16, alignItems: 'center', ...shadows.green },
  trackBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  trackingActive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.activeBg, borderRadius: borderRadius.md, paddingVertical: 14 },
  trackingText: { fontSize: 14, color: colors.primaryDark, fontWeight: '600' },
  arrivedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  arrivedEmoji: { fontSize: 72, marginBottom: 16 },
  arrivedTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  arrivedSub: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  orderIdBox: { backgroundColor: colors.activeBg, borderRadius: borderRadius.lg, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 1.5, borderColor: colors.primary, marginBottom: 16 },
  orderIdText: { fontSize: 26, fontWeight: '800', color: colors.primaryDarker, letterSpacing: 3 },
  arrivedNote: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  copyText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
