import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { colors, shadows } from '../theme';

export default function FloatingCartBar() {
  const { totalItems, totalPrice } = useCart();
  const navigation = useNavigation<any>();

  if (totalItems === 0) return null;

  const goToCart = () => {
    navigation.getParent()?.navigate('CartTab');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={goToCart}
      activeOpacity={0.92}
    >
      <View style={styles.left}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalItems}</Text>
        </View>
        <Text style={styles.label}>View Cart</Text>
      </View>
      <Text style={styles.price}>
        ₹{totalPrice.toFixed(0)} ›
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 999,
    ...shadows.green,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 7,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  price: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
