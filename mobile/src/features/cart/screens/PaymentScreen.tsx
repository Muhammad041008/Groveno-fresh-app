import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../../navigation/types';
import { useCart } from '../../../context/CartContext';
import * as orderService from '../../../services/orderService';
import { PAYMENT_METHODS } from '../../../constants/data';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<CartStackParamList, 'Payment'>;
type Route = NativeStackScreenProps<CartStackParamList, 'Payment'>['route'];

export default function PaymentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { channel, total, orderData } = route.params;
  const { items, clearCart } = useCart();

  const [selectedMethod, setSelectedMethod] = useState('cod');
  const [placing, setPlacing] = useState(false);

  const handlePay = async () => {
    setPlacing(true);
    try {
      let order;
      const data = orderData as Record<string, any>;

      if (channel === 'home_delivery' || channel === 'cl_order') {
        order = await orderService.placeHomeDelivery({
          items: data.items,
          address: data.address,
          deliverySlot: data.deliverySlot,
          clCode: data.clCode,
          coinsToUse: data.coinsToUse,
          paymentMethod: selectedMethod,
          specialInstructions: data.specialInstructions,
        });
      } else {
        order = await orderService.placeExpressPickup({
          items: data.items,
          pickupPointId: data.pickupPointId,
          paymentMethod: selectedMethod,
        });
      }

      clearCart();

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'OrderSuccess',
            params: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              channel,
              coinsEarned: order.coinsEarned ?? 0,
              total: order.total ?? total,
              deliverySlot: order.deliverySlot,
              paymentMethod: selectedMethod,
            },
          },
        ],
      });

      // For Express Pickup, navigate to tracking if needed
      if (channel === 'express_pickup' && data.pickupPoint) {
        // Will navigate from OrderSuccess
      }
    } catch (err: any) {
      Alert.alert('Payment Failed', err?.response?.data?.message ?? 'Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, selectedMethod === method.id && styles.methodActive]}
            onPress={() => setSelectedMethod(method.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.methodEmoji}>{method.emoji}</Text>
            <View style={styles.methodInfo}>
              <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelActive]}>
                {method.label}
              </Text>
              <Text style={styles.methodSub}>{method.subtitle}</Text>
            </View>
            <View style={[styles.radio, selectedMethod === method.id && styles.radioActive]}>
              {selectedMethod === method.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Total</Text>
            <Text style={styles.summaryValue}>₹{total.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Mode</Text>
            <Text style={styles.summaryValue}>
              {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Channel</Text>
            <Text style={styles.summaryValue}>
              {channel === 'home_delivery'
                ? '🏠 Home Delivery'
                : channel === 'cl_order'
                ? '👥 Order via CL'
                : '⚡ Express Pickup'}
            </Text>
          </View>
        </View>

        {selectedMethod === 'upi' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              🔔 You'll be redirected to your UPI app to complete payment. (Mock in demo)
            </Text>
          </View>
        )}
        {selectedMethod === 'card' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              💳 Card payment via Razorpay. (Mock in demo)
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePay}
          disabled={placing}
          activeOpacity={0.88}
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>PAY ₹{total.toFixed(0)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14, marginTop: 4 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border, padding: 16, marginBottom: 10, gap: 14, ...shadows.card },
  methodActive: { borderColor: colors.primary, backgroundColor: colors.activeBg },
  methodEmoji: { fontSize: 26 },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  methodLabelActive: { color: colors.primaryDark },
  methodSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderMid, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: colors.primary },
  summaryCard: { backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  infoCard: { backgroundColor: '#E3F2FD', borderRadius: borderRadius.md, padding: 12, marginTop: 10 },
  infoText: { fontSize: 13, color: '#1565C0', lineHeight: 18 },
  footer: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  payBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 16, alignItems: 'center', ...shadows.green },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
});
