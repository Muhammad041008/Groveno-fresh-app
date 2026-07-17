import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../../navigation/types';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<CartStackParamList, 'OrderSuccess'>;
type Route = NativeStackScreenProps<CartStackParamList, 'OrderSuccess'>['route'];

export default function OrderSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId, orderNumber, channel, coinsEarned, total, deliverySlot, paymentMethod } = route.params;

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [opacity, scale]);

  const channelLabel = channel === 'home_delivery' ? '🏠 Home Delivery' : '⚡ Express Pickup';
  const deliveryInfo = channel === 'home_delivery'
    ? (deliverySlot === 'morning' ? 'Today 8AM – 12PM' : deliverySlot === 'evening' ? 'Today 5PM – 9PM' : 'Arriving in ~30 min')
    : 'Ready in ~20 minutes';

  const goHome = () => {
    navigation.getParent()?.navigate('HomeTab');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Animated checkmark */}
        <Animated.View style={[styles.checkCircle, { transform: [{ scale }], opacity }]}>
          <Text style={styles.checkIcon}>✓</Text>
        </Animated.View>

        <Animated.View style={{ opacity, alignItems: 'center' }}>
          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.orderNum}>{orderNumber}</Text>
        </Animated.View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <InfoRow icon="🚚" label="Delivery" value={deliveryInfo} />
          <InfoRow icon="💳" label="Payment" value={paymentMethod?.toUpperCase() ?? 'COD'} />
          <InfoRow icon="💰" label="Amount Paid" value={`₹${total.toFixed(0)}`} />
          <InfoRow icon="📦" label="Channel" value={channelLabel} />
        </View>

        {/* Coins */}
        {coinsEarned > 0 && (
          <View style={styles.coinsCard}>
            <Text style={styles.coinsTitle}>🪙 Coins you'll earn after delivery</Text>
            <Text style={styles.coinsAmount}>{coinsEarned} Groveno Coins</Text>
            <Text style={styles.coinsNote}>Credited after your order is delivered</Text>
          </View>
        )}

        {/* Savings */}
        <View style={styles.savingsCard}>
          <Text style={styles.savingsText}>
            You saved today by shopping on Groveno Fresh!
          </Text>
        </View>

        {/* Buttons */}
        {channel === 'express_pickup' && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              // Navigate to tracking - this would need the hub info
              // For now, go home
              goHome();
            }}
          >
            <Text style={styles.primaryBtnText}>TRACK ORDER</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, channel !== 'express_pickup' && styles.fullWidth]}
          onPress={goHome}
        >
          <Text style={styles.primaryBtnText}>
            {channel === 'express_pickup' ? 'Back to Home' : 'CONTINUE SHOPPING'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { alignItems: 'center', padding: spacing.lg, paddingTop: 48, gap: 20 },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.green,
  },
  checkIcon: { fontSize: 50, color: '#fff', fontWeight: '800', lineHeight: 58 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginTop: 8, textAlign: 'center' },
  orderNum: { fontSize: 15, color: colors.textSecondary, fontWeight: '600', marginTop: 4 },
  infoCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  infoIcon: { fontSize: 20, width: 28 },
  infoLabel: { flex: 1, fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: 'right' },
  coinsCard: {
    width: '100%',
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  coinsTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  coinsAmount: { fontSize: 22, fontWeight: '800', color: '#78350F' },
  coinsNote: { fontSize: 12, color: '#92400E', marginTop: 4 },
  savingsCard: { width: '100%', backgroundColor: colors.activeBg, borderRadius: borderRadius.md, padding: 14, alignItems: 'center' },
  savingsText: { fontSize: 14, color: colors.primaryDark, fontWeight: '600', textAlign: 'center' },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  fullWidth: { width: '100%' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
