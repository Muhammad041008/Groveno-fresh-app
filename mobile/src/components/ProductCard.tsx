import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import type { Product } from '../services/productService';
import { colors, borderRadius, shadows } from '../theme';
import AddButton from './AddButton';
import type { CartItem } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const discountPct =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const cartProduct: Omit<CartItem, 'qty'> = {
    id: product._id,
    name: product.name,
    price: product.price,
    mrp: product.mrp,
    emoji: product.emoji,
    imageUrl: product.imageUrl,
    weight: product.weight,
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Image area */}
      <View style={styles.imgArea}>
        {discountPct > 0 && (
          <View style={styles.discBadge}>
            <Text style={styles.discLine1}>{discountPct}% OFF</Text>
            <Text style={styles.discLine2}>on MRP</Text>
          </View>
        )}
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.img}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.emoji}>{product.emoji}</Text>
        )}
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text style={styles.weight}>{product.weight}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.bottomRow}>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp > product.price && (
              <Text style={styles.mrp}>₹{product.mrp}</Text>
            )}
          </View>
          <AddButton product={cartProduct} compact />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    flex: 1,
    margin: 5,
    ...shadows.card,
  },
  imgArea: {
    backgroundColor: '#F5F5F5',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  discBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.discountBg,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  discLine1: {
    color: colors.discountText,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  discLine2: {
    color: colors.discountText,
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
  },
  img: {
    width: 80,
    height: 80,
  },
  emoji: {
    fontSize: 52,
  },
  details: {
    padding: 10,
  },
  weight: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceBlock: {
    flex: 1,
    gap: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mrp: {
    fontSize: 11,
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
});
