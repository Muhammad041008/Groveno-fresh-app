import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../../navigation/types';
import { useCart } from '../../../context/CartContext';
import { DELIVERY_FEE, DELIVERY_FREE_THRESHOLD } from '../../../constants/data';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<CartStackParamList, 'Cart'>;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { items, addItem, removeItem, updateQty, totalPrice, totalItems } = useCart();

  const deliveryFee = totalPrice >= DELIVERY_FREE_THRESHOLD ? 0 : DELIVERY_FEE;
  const packagingFee = 5;
  const grandTotal = totalPrice + deliveryFee + packagingFee;
  const progress = Math.min(totalPrice / DELIVERY_FREE_THRESHOLD, 1);
  const remaining = Math.max(DELIVERY_FREE_THRESHOLD - totalPrice, 0);

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('HomeTab')}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>My Cart</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add fresh groceries to get started</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.getParent()?.navigate('HomeTab')}
          >
            <Text style={styles.shopBtnText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate('HomeTab')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>My Cart ({totalItems})</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          remaining > 0 ? (
            <View style={styles.progressCard}>
              <Text style={styles.progressText}>
                Add <Text style={styles.progressGreen}>₹{remaining}</Text> more for FREE delivery!
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
          ) : (
            <View style={[styles.progressCard, { backgroundColor: colors.activeBg }]}>
              <Text style={[styles.progressText, { color: colors.primaryDark }]}>
                🎉 Yay! You get FREE delivery
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <View style={styles.billCard}>
            <Text style={styles.billTitle}>Bill Details</Text>
            <BillRow label="Item Total" value={`₹${totalPrice.toFixed(2)}`} />
            <BillRow label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`} green={deliveryFee === 0} />
            <BillRow label="Packaging Fee" value={`₹${packagingFee}`} />
            <View style={styles.divider} />
            <BillRow label="Total Amount" value={`₹${grandTotal.toFixed(2)}`} bold />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemImgBox}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemWeight}>{item.weight}</Text>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            </View>
            <View style={styles.qtyControl}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(item.id)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{item.qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(item)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Proceed */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerLabel}>Grand Total</Text>
          <Text style={styles.footerAmount}>₹{grandTotal.toFixed(0)}</Text>
        </View>
        <TouchableOpacity
          style={styles.proceedBtn}
          onPress={() => navigation.navigate('ChannelSelection')}
          activeOpacity={0.88}
        >
          <Text style={styles.proceedBtnText}>PROCEED TO CHECKOUT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 70, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  shopBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: 32, paddingVertical: 14 },
  shopBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  progressCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 12,
  },
  progressText: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  progressGreen: { color: colors.primary, fontWeight: '700' },
  progressBar: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...shadows.card,
  },
  itemImgBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  itemWeight: { fontSize: 12, color: colors.textSecondary },
  itemPrice: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  qtyNum: { color: '#fff', fontSize: 15, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: 8,
    ...shadows.card,
  },
  billTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerTotal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  footerLabel: { fontSize: 14, color: colors.textSecondary },
  footerAmount: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  proceedBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  proceedBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
