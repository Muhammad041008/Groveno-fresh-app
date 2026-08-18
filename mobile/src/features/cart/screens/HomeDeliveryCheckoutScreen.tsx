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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
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
type Route = NativeStackScreenProps<CartStackParamList, 'HomeDeliveryCheckout'>['route'];

// Slots for CL orders: Morning and Evening only (no express surge)
const CL_SLOTS = DELIVERY_SLOTS.filter((s) => s.id !== 'express_30min');

export default function HomeDeliveryCheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { mode } = route.params;
  const isCL = mode === 'cl_order';

  const { items, totalPrice } = useCart();

  const [slot, setSlot] = useState('morning');
  const [address, setAddress] = useState({ society: '', tower: '', flat: '', pincode: '' });
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

  const deliveryFee = totalPrice >= DELIVERY_FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const packagingFee = 5;
  const grandTotal = totalPrice + deliveryFee + packagingFee - coinsDiscount;

  const validateCL = async () => {
    if (!clCode.trim()) return;
    setValidatingCL(true);
    try {
      const res = await orderService.validateClCode(clCode.toUpperCase());
      setClInfo(res);
      if (!res.valid) Alert.alert('Invalid Code', 'No CL found with this code.');
    } catch {
      Alert.alert('Error', 'Could not validate CL code. Check your code and try again.');
    } finally {
      setValidatingCL(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (isCL) {
      if (!clInfo?.valid) {
        Alert.alert('CL Code Required', 'Please enter and validate your Community Leader code to continue.');
        return;
      }
    } else {
      if (!address.society.trim() || !address.flat.trim() || !address.pincode.trim()) {
        Alert.alert('Address Required', 'Please fill in your society name, flat number and pincode.');
        return;
      }
    }

    setPlacing(true);
    try {
      // Backend expandItems expects { productId, quantity }
      const orderItems = items.map((i) => ({
        productId: i.id,
        quantity: i.qty,
      }));
      navigation.navigate('Payment', {
        channel: mode,
        total: grandTotal,
        orderData: {
          items: orderItems,
          // Backend homeDelivery validates address.line1 and address.pincode
          address: isCL ? undefined : {
            line1: [address.flat, address.tower, address.society].filter(Boolean).join(', '),
            pincode: address.pincode,
            society: address.society,
            tower: address.tower,
            flat: address.flat,
          },
          deliverySlot: isCL ? slot : 'standard',
          clCode: isCL && clInfo?.valid ? clCode : undefined,
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
        <Text style={styles.headerTitle}>
          {isCL ? 'Order via Community Leader' : 'Home Delivery'}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── CL MODE: CL Code block (primary, shown first) ──────────── */}
        {isCL && (
          <>
            <SectionTitle>Community Leader Code *</SectionTitle>
            <View style={[styles.card, styles.clCard]}>
              <Text style={styles.clLabel}>
                Enter your CL code to place this order. Your Community Leader will handle delivery.
              </Text>
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
                  style={[styles.validateBtn, (!clCode.trim() || validatingCL) && styles.validateBtnDisabled]}
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
                  <View style={styles.clSuccessRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    <Text style={styles.clSuccessText}>{clInfo.clName}</Text>
                  </View>
                  <Text style={styles.clCoins}>
                    🪙 You will earn {clInfo.coinsToEarn} coins after delivery
                  </Text>
                </View>
              )}
            </View>

            {/* CL MODE: Delivery Slot (Morning / Evening only) */}
            <SectionTitle>Choose Delivery Slot</SectionTitle>
            {CL_SLOTS.map((s) => (
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
          </>
        )}

        {/* ── HOME DELIVERY MODE: Address block ────────────────────── */}
        {!isCL && (
          <>
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
              <InputField
                label="Pincode *"
                value={address.pincode}
                onChangeText={(t) => setAddress((a) => ({ ...a, pincode: t }))}
                placeholder="e.g. 201301"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <View style={styles.deliveryNote}>
              <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.deliveryNoteText}>Delivery as per availability</Text>
            </View>
          </>
        )}

        {/* ── BOTH: Special Instructions ───────────────────────────── */}
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

        {/* ── BOTH: Groveno Coins ──────────────────────────────────── */}
        {canUseCoins && (
          <>
            <SectionTitle>Groveno Coins</SectionTitle>
            <View style={styles.card}>
              <View style={styles.coinsRow}>
                <View>
                  <Text style={styles.coinsTitle}>🪙 Use Groveno Coins</Text>
                  <Text style={styles.coinsSub}>Available: {coinsBalance} coins = ₹{coinsBalance}</Text>
                  {useCoins && <Text style={styles.coinsSave}>Saving ₹{coinsDiscount} on this order</Text>}
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

        {/* ── BOTH: Bill Summary ───────────────────────────────────── */}
        <SectionTitle>Bill Summary</SectionTitle>
        <View style={styles.card}>
          <BillRow label="Items Total" value={`₹${totalPrice.toFixed(0)}`} />
          <BillRow label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`} green={deliveryFee === 0} />
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

// ── Helper components ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children as string}</Text>;
}

function InputField({ label, value, onChangeText, placeholder, keyboardType, maxLength }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string;
  keyboardType?: any; maxLength?: number;
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
        keyboardType={keyboardType}
        maxLength={maxLength}
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

// ── Styles ────────────────────────────────────────────────────────

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

  /* Delivery slots */
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

  /* Address section */
  deliveryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  deliveryNoteText: { fontSize: 12, color: colors.textSecondary },

  /* CL section */
  clCard: { borderWidth: 1, borderColor: colors.primary, backgroundColor: '#F0FDF4' },
  clLabel: { fontSize: 13, color: colors.primaryDark, marginBottom: 10, fontWeight: '500', lineHeight: 18 },
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
  validateBtnDisabled: { opacity: 0.5 },
  validateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  clSuccess: { marginTop: 10 },
  clSuccessRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clSuccessText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  clCoins: { fontSize: 13, color: colors.primary, marginTop: 5 },

  /* Special instructions */
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

  /* Coins */
  coinsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coinsTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  coinsSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  coinsSave: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 3 },

  /* Bill */
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  /* Input fields */
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

  /* Radio */
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderMid, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: colors.primary },

  /* Footer */
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
