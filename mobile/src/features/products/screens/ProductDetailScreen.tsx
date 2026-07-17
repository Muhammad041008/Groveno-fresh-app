import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';
import * as productService from '../../../services/productService';
import type { Product } from '../../../services/productService';
import { useCart } from '../../../context/CartContext';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import FloatingCartBar from '../../../components/FloatingCartBar';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ProductDetail'>;
type Route = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>['route'];

export default function ProductDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { productId } = route.params;
  const { addItem, removeItem, getItemQty, totalItems } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .getProductById(productId)
      .then(setProduct)
      .catch(() => Alert.alert('Error', 'Could not load product'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!product) return null;

  const qty = getItemQty(product._id);
  const discountPct =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const cartItem = {
    id: product._id,
    name: product.name,
    price: product.price,
    mrp: product.mrp,
    emoji: product.emoji,
    imageUrl: product.imageUrl,
    weight: product.weight,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Nav header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Product Image */}
        <View style={styles.imgArea}>
          {discountPct > 0 && (
            <View style={styles.discBadge}>
              <Text style={styles.discText}>{discountPct}% OFF</Text>
            </View>
          )}
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.img} resizeMode="contain" />
          ) : (
            <Text style={styles.emoji}>{product.emoji}</Text>
          )}
        </View>

        <View style={styles.body}>
          {/* Name, weight, rating */}
          <Text style={styles.weight}>{product.weight}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>⭐ {product.avgRating?.toFixed(1) ?? '4.6'}</Text>
            <Text style={styles.ratingCount}>({product.totalRatings ?? 120} ratings)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp > product.price && (
              <Text style={styles.mrp}>₹{product.mrp}</Text>
            )}
            {discountPct > 0 && (
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Save ₹{product.mrp - product.price}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>About This Product</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          )}

          {/* Nutrition */}
          {product.nutrition && product.nutrition.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nutrition Info</Text>
              <View style={styles.nutGrid}>
                {product.nutrition.slice(0, 4).map((n, i) => (
                  <View key={i} style={styles.nutBox}>
                    <Text style={styles.nutValue}>{n.value}</Text>
                    <Text style={styles.nutLabel}>{n.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {qty === 0 ? (
          <>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => addItem(cartItem)}
              activeOpacity={0.85}
            >
              <Text style={styles.outlineBtnText}>ADD TO CART</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.solidBtn}
              onPress={() => { addItem(cartItem); navigation.getParent()?.navigate('CartTab'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.solidBtnText}>BUY NOW</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(product._id)}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyCount}>{qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(cartItem)}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.solidBtn, { flex: 1, marginLeft: 12 }]}
              onPress={() => navigation.getParent()?.navigate('CartTab')}
            >
              <Text style={styles.solidBtnText}>VIEW CART ({totalItems})</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  imgArea: {
    backgroundColor: '#F5F5F5',
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  discBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.discountBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discText: { color: colors.discountText, fontSize: 13, fontWeight: '700' },
  img: { width: 180, height: 180 },
  emoji: { fontSize: 110 },
  body: { padding: spacing.md },
  weight: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, lineHeight: 28 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  stars: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  ratingCount: { fontSize: 13, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md },
  price: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  mrp: { fontSize: 17, color: colors.textLight, textDecorationLine: 'line-through' },
  saveBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  saveText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  nutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nutValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  nutLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3, textAlign: 'center' },
  bottomBar: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 12,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  solidBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  solidBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  qtyRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.activeBg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  qtyBtnText: { fontSize: 22, fontWeight: '700', color: colors.primary },
  qtyCount: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, minWidth: 32, textAlign: 'center' },
});
