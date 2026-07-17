import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useCart } from '../context/CartContext';
import type { CartItem } from '../context/CartContext';
import { colors } from '../theme';

interface AddButtonProps {
  product: Omit<CartItem, 'qty'>;
  compact?: boolean;
}

export default function AddButton({ product, compact = false }: AddButtonProps) {
  const { getItemQty, addItem, removeItem } = useCart();
  const qty = getItemQty(product.id);

  if (qty === 0) {
    return (
      <TouchableOpacity
        style={[styles.addBtn, compact && styles.compact]}
        onPress={() => addItem(product)}
        activeOpacity={0.8}
      >
        <Text style={[styles.addText, compact && styles.compactText]}>
          ADD +
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.qtyContainer, compact && styles.compact]}>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() => removeItem(product.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.qtyBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={[styles.qtyText, compact && styles.compactText]}>{qty}</Text>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() => addItem(product)}
        activeOpacity={0.7}
      >
        <Text style={styles.qtyBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: '#fff',
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 12,
  },
  qtyContainer: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  qtyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'center',
  },
});
