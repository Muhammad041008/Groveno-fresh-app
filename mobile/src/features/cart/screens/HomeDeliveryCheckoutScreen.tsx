import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../../navigation/types';
import { useCart } from '../../../context/CartContext';
import * as orderService from '../../../services/orderService';
import * as walletService from '../../../services/walletService';
import {
  DELIVERY_SLOTS,
  DELIVERY_FEE,
  DELIVERY_FREE_THRESHOLD,
  COINS_MAX_REDEMPTION_PCT,
  COINS_MIN_ORDER,
  QUICK_INSTRUCTIONS,
} from '../../../constants/data';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<CartStackParamList, 'HomeDeliveryCheckout'>;

export default function HomeDeliveryCheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const { items, totalPrice } = useCart();

  const [slot, setSlot] = useState('morning');
  const [address, setAddress] = useState({ society: '', tower: '', flat: '', instructions: '' });
  const [clCode, setClCode] = useState('');
  const [clInfo, setClInfo] = useState<{ valid: boolean; clName?: string; coinsToEarn?: number } | null>(null);
  const [validatingCL, setValidatingCL] = useState(false);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [useCoins, setUseCoins] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    walletService.getCoinBalance().then((w) => setCoinsBalance(w.coins ?? 0)).catch(() => {});
  }, []);

  const maxCoinsUsable = Math.min(
    coinsBalance,
    Math.floor((totalPrice * COINS_MAX_REDEMPTION_PCT) / 100)
  );
  const canUseCoins = totalPrice >= COINS_MIN_ORDER && coinsBalance > 0;
  const coinsDiscount = canUseCoins && useCoins ? maxCoinsUsable : 0;

  const expressFee = slot === 'express_30min' ? 15 : 0;
  const deliveryFee = totalPrice >= DELIVERY_FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const packagingFee = 5;
  const grandTotal = totalPrice + deliveryFee + packagingFee + expressFee - coinsDiscount;

  const validateCL = async () => {
    if (!clCode.trim()) return;
    setValidatingCL(true);
    try {
      const res = await orderService.validateClCode(clCode.toUpperCase());
      setClInfo(res);
      if (!res.valid) Alert.alert('Invalid Code', 'No CL found with this code.');
    } catch {
      Alert.alert('Error', 'Could not validate CL code.');
    } finally {
      setValidatingCL(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address.society || !address.flat) {
      Alert.alert('Address Required', 'Please fill in society name and flat number.');
      return;
    }
    setPlacing(true);
    try {
      const orderItems = items.map((i) => ({
        product: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        total: i.price * i.qty,
      }));
      navigation.navigate('Payment', {
        channel: 'home_delivery',
        total: grandTotal,
        orderData: {
          items: orderItems,
          address,
          deliverySlot: slot,
          clCode: clInfo?.valid ? clCode : undefined,
          coinsToUse: coinsDiscount,
          specialInstructions: instructions,
        },
      });
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
        <Text style={styles.headerTitle}>Home Delivery</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Delivery Slots */}
        <SectionTitle>Choose Delivery Slot</SectionTitle>
        {DELIVERY_SLOTS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.slotCard, slot === s.id && styles.slotActive]}
            onPress={() => setSlot(s.id)}
          >
            <Text style={styles.slotEmoji}>{s.emoji}</Text>
            <View style={styles.slotInfo}>
              <Text style={[styles.slotLabel, slot === s.id && styles.slotLabelActive]}>{s.label}</Text>
              <Text style={styles.slotTime}>{s.time}</Text>
              <Text style={styles.slotMeta}>{s.info}</Text>
            </View>
            <View style={[styles.radio, slot === s.id && styles.radioActive]}>
              {slot === s.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Delivery Address */}
        <SectionTitle>Delivery Address</SectionTitle>
        <View style={styles.card}>
          <InputField
            label="Society / Apartment Name *"
            value={address.society}
            onChangeText={(t) => setAddress((a) => ({ ...a, society: t }))}
            placeholder="e.g. Nirala Estate"
          />
          <InputField
            label="Tower / Building"
            value={address.tower}
            onChangeText={(t) => setAddress((a) => ({ ...a, tower: t }))}
            placeholder="e.g. Tower B"
          />
          <InputField
            label="Flat / House Number *"
            value={address.flat}
            onChangeText={(t) => setAddress((a) => ({ ...a, flat: t }))}
            placeholder="e.g. Flat 403"
          />
        </View>

        {/* Special Instructions */}
        <SectionTitle>Special Instructions (Optional)</SectionTitle>
        <View style={styles.card}>
          <TextInput
            style={styles.instructionInput}
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Write any delivery or product instructions..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={250}
          />
          <View style={styles.quickTips}>
            {QUICK_INSTRUCTIONS.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={styles.quickChip}
                onPress={() => setInstructions((prev) => prev ? `${prev}, ${q.text}` : q.text)}
              >
                <Text style={styles.quickChipText}>{q.emoji} {q.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CL Code */}
        <SectionTitle>Community Leader Code</SectionTitle>
        <View style={[styles.card, styles.clCard]}>
          <Text style={styles.clLabel}>Have a CL code? Enter it to earn Groveno Coins</Text>
          <View style={styles.clInputRow}>
            <TextInput
              style={styles.clInput}
              value={clCode}
              onChangeText={(t) => { setClCode(t.toUpperCase()); setClInfo(null); }}
              placeholder="e.g. CL12345"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.validateBtn}
              onPress={validateCL}
              disabled={!clCode.trim() || validatingCL}
            >
              {validatingCL ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.validateBtnText}>Validate</Text>
              )}
            </TouchableOpacity>
          </View>
          {clInfo?.valid && (
            <View style={styles.clSuccess}>
              <Text style={styles.clSuccessText}>✅ {clInfo.clName}</Text>
              <Text style={styles.clCoins}>
                🪙 You will earn {clInfo.coinsToEarn} coins after delivery
              </Text>
            </View>
          )}
        </View>

        {/* Coins */}
        {canUseCoins && (
          <>
            <SectionTitle>Groveno Coins</SectionTitle>
            <View style={styles.card}>
              <View style={styles.coinsRow}>
                <View>
                  <Text style={styles.coinsTitle}>🪙 Use Groveno Coins</Text>
                  <Text style={styles.coinsSub}>
                    Available: {coinsBalance} coins = ₹{coinsBalance}
                  </Text>
                  {useCoins && (
                    <Text style={styles.coinsSave}>Saving ₹{coinsDiscount} on this order</Text>
                  )}
                </View>
                <Switch
                  value={useCoins}
                  onValueChange={setUseCoins}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </>
        )}

        {/* Bill Summary */}
        <SectionTitle>Bill Summary</SectionTitle>
        <View style={styles.card}>
          <BillRow label="Items Total" value={`₹${totalPrice.toFixed(0)}`} />
          <BillRow label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`} green={deliveryFee === 0} />
          {expressFee > 0 && <BillRow label="Express Surge" value={`₹${expressFee}`} />}
          <BillRow label="Packaging Fee" value={`₹${packagingFee}`} />
          {coinsDiscount > 0 && <BillRow label="Coins Discount" value={`-₹${coinsDiscount}`} green />}
          <View style={styles.divider} />
          <BillRow label="Grand Total" value={`₹${grandTotal.toFixed(0)}`} bold />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.proceedBtn}
          onPress={handlePlaceOrder}
          disabled={placing}
          activeOpacity={0.88}
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.proceedBtnText}>CONTINUE TO PAYMENT  ₹{grandTotal.toFixed(0)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children as string}</Text>;
}

function InputField({ label, value, onChangeText, placeholder }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
      />
    </View>
  );
}

function BillRow({ label, value, bold = false, green = false }: {
  label: string; value: string; bold?: boolean; green?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: bold ? '800' : '600', color: green ? colors.primary : colors.textPrimary }}>
        {value}
      </Text>
    </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
    marginBottom: 4,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  slotActive: { borderColor: colors.primary, backgroundColor: colors.activeBg },
  slotEmoji: { fontSize: 26 },
  slotInfo: { flex: 1 },
  slotLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  slotLabelActive: { color: colors.primaryDark },
  slotTime: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  slotMeta: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderMid, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: colors.primary },
  instructionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  quickTips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickChip: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: { fontSize: 12, color: colors.textSecondary },
  clCard: { borderWidth: 1, borderColor: colors.primary, backgroundColor: '#F0FDF4' },
  clLabel: { fontSize: 13, color: colors.primaryDark, marginBottom: 10, fontWeight: '500' },
  clInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  clInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: '#fff',
    letterSpacing: 1,
  },
  validateBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  validateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  clSuccess: { marginTop: 10 },
  clSuccessText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  clCoins: { fontSize: 13, color: colors.primary, marginTop: 4 },
  coinsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coinsTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  coinsSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  coinsSave: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  inputLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginBottom: 5 },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  proceedBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  proceedBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
