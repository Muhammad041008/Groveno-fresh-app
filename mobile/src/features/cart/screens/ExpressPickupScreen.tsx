import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../../navigation/types';
import { useCart } from '../../../context/CartContext';
import * as orderService from '../../../services/orderService';
import type { PickupPoint } from '../../../services/orderService';
import { EXPRESS_PICKUP_DISCOUNT_PCT, EXPRESS_PICKUP_CONFIRMATION } from '../../../constants/data';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

// Conditional import for react-native-maps
let MapView: any = null;
let Marker: any = null;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch {}

type Nav = NativeStackNavigationProp<CartStackParamList, 'ExpressPickup'>;

const TIME_SLOTS = ['6:00 – 6:15 PM', '6:15 – 6:30 PM', '6:30 – 6:45 PM', '6:45 – 7:00 PM', '7:00 – 7:15 PM', '7:15 – 7:30 PM'];

export default function ExpressPickupScreen() {
  const navigation = useNavigation<Nav>();
  const { items, totalPrice } = useCart();

  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<PickupPoint | null>(null);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const discount = Math.round(totalPrice * EXPRESS_PICKUP_DISCOUNT_PCT / 100);
  const grandTotal = totalPrice - discount + EXPRESS_PICKUP_CONFIRMATION;

  useEffect(() => {
    orderService.getPickupPoints()
      .then((pts) => {
        setPickupPoints(pts);
        if (pts.length > 0) setSelectedPoint(pts[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePlaceOrder = () => {
    if (!selectedPoint) { Alert.alert('Select Pickup Point', 'Please choose a pickup point.'); return; }
    navigation.navigate('Payment', {
      channel: 'express_pickup',
      total: grandTotal,
      orderData: {
        items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
        pickupPointId: selectedPoint._id,
        pickupPoint: selectedPoint,
        timeSlot: selectedTime,
      },
    });
  };

  const mapRegion = selectedPoint ? {
    latitude: selectedPoint.latitude,
    longitude: selectedPoint.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : { latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Express Pickup</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View style={styles.mapContainer}>
          {MapView ? (
            <MapView style={styles.map} region={mapRegion} showsUserLocation>
              {pickupPoints.map((pt) => (
                <Marker
                  key={pt._id}
                  coordinate={{ latitude: pt.latitude, longitude: pt.longitude }}
                  title={pt.name}
                  description={pt.address}
                  pinColor={selectedPoint?._id === pt._id ? colors.primary : '#888'}
                />
              ))}
            </MapView>
          ) : (
            <View style={[styles.map, styles.mapFallback]}>
              <Text style={styles.mapFallbackIcon}>🗺️</Text>
              <Text style={styles.mapFallbackText}>Map view requires dev build</Text>
            </View>
          )}
        </View>

        <View style={{ padding: spacing.md }}>
          {/* Pickup Points */}
          <Text style={styles.sectionTitle}>Select Pickup Point</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            pickupPoints.map((pt) => (
              <TouchableOpacity
                key={pt._id}
                style={[styles.pointCard, selectedPoint?._id === pt._id && styles.pointActive]}
                onPress={() => setSelectedPoint(pt)}
              >
                <View style={styles.pointIcon}>
                  <Text style={{ fontSize: 20 }}>📍</Text>
                </View>
                <View style={styles.pointInfo}>
                  <Text style={styles.pointName}>{pt.name}</Text>
                  <Text style={styles.pointAddr}>{pt.address}</Text>
                  <Text style={styles.pointHours}>
                    {pt.operatingHours?.open} – {pt.operatingHours?.close}
                  </Text>
                </View>
                <View style={[styles.radio, selectedPoint?._id === pt._id && styles.radioActive]}>
                  {selectedPoint?._id === pt._id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Time Slot */}
          <Text style={styles.sectionTitle}>Select Pickup Time</Text>
          <View style={styles.timeSlots}>
            {TIME_SLOTS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, selectedTime === t && styles.timeChipActive]}
                onPress={() => setSelectedTime(t)}
              >
                <Text style={[styles.timeText, selectedTime === t && styles.timeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Order Summary */}
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.card}>
            <BillRow label="Items Total" value={`₹${totalPrice.toFixed(0)}`} />
            <BillRow label={`Express Pickup Discount (${EXPRESS_PICKUP_DISCOUNT_PCT}%)`} value={`-₹${discount}`} green />
            <BillRow label="Delivery Fee" value="FREE" green />
            <BillRow label="Confirmation Charge" value={`₹${EXPRESS_PICKUP_CONFIRMATION}`} />
            <View style={styles.divider} />
            <BillRow label="Total to Pay" value={`₹${grandTotal}`} bold />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ⚡ Your order will be ready in ~20 minutes. Show Order ID at the hub.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.placeBtn} onPress={handlePlaceOrder} disabled={placing} activeOpacity={0.88}>
          {placing ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeBtnText}>PLACE ORDER  ₹{grandTotal}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function BillRow({ label, value, bold = false, green = false }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: bold ? '700' : '400', flex: 1, marginRight: 8 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: bold ? '800' : '600', color: green ? colors.primary : colors.textPrimary }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  mapContainer: { height: 200, backgroundColor: '#E8F5E9' },
  map: { flex: 1 },
  mapFallback: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapFallbackIcon: { fontSize: 40 },
  mapFallbackText: { fontSize: 14, color: colors.textSecondary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 16, marginBottom: 10 },
  pointCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border, padding: 14, marginBottom: 10, gap: 12, ...shadows.card },
  pointActive: { borderColor: colors.primary, backgroundColor: colors.activeBg },
  pointIcon: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  pointInfo: { flex: 1 },
  pointName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  pointAddr: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pointHours: { fontSize: 11, color: colors.primary, marginTop: 3, fontWeight: '600' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderMid, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: colors.primary },
  timeSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff' },
  timeChipActive: { borderColor: colors.primary, backgroundColor: colors.activeBg },
  timeText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  timeTextActive: { color: colors.primary, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.card, marginBottom: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  infoBox: { backgroundColor: '#E3F2FD', borderRadius: borderRadius.md, padding: 12, marginTop: 8 },
  infoText: { fontSize: 13, color: '#1565C0', lineHeight: 18 },
  footer: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  placeBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 15, alignItems: 'center' },
  placeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
