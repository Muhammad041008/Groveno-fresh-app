import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OrderStackParamList } from '../../../navigation/types';
import * as orderService from '../../../services/orderService';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<OrderStackParamList, 'RatingPopup'>;
type Route = NativeStackScreenProps<OrderStackParamList, 'RatingPopup'>['route'];

export default function RatingPopupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId, orderNumber, items } = route.params;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const setRating = (productId: string, stars: number) => {
    setRatings((prev) => ({ ...prev, [productId]: stars }));
  };

  const handleSubmit = async () => {
    const ratingList = items.map((item) => ({
      productId: item.productId,
      stars: ratings[item.productId] ?? 0,
    })).filter((r) => r.stars > 0);

    if (ratingList.length === 0) {
      Alert.alert('Rate at least one product', 'Please give a star rating to submit.');
      return;
    }

    setSubmitting(true);
    try {
      await orderService.submitRating(orderId, ratingList);
      Alert.alert('Thanks!', `🪙 5 Groveno Coins have been credited to your wallet!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLater = async () => {
    await orderService.skipRating(orderId).catch(() => {});
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>⭐ Rate Your Recent Order</Text>
        <Text style={styles.orderNum}>Order #{orderNumber}</Text>

        {items.map((item) => (
          <View key={item.productId} style={styles.productCard}>
            <Text style={styles.productEmoji}>{item.emoji ?? '🥦'}</Text>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(item.productId, star)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.star, ratings[item.productId] >= star && styles.starActive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.coinsBanner}>
          <Text style={styles.coinsBannerText}>🪙 Earn 5 coins for rating your order!</Text>
        </View>

        <View style={styles.btns}>
          <TouchableOpacity style={styles.laterBtn} onPress={handleLater}>
            <Text style={styles.laterBtnText}>Rate Later</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: spacing.lg, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  orderNum: { fontSize: 13, color: colors.textSecondary, marginBottom: 24 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 12,
    gap: 14,
  },
  productEmoji: { fontSize: 36 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 4 },
  star: { fontSize: 28, color: '#D1D5DB' },
  starActive: { color: '#F5C518' },
  coinsBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  coinsBannerText: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  btns: { flexDirection: 'row', gap: 12 },
  laterBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  laterBtnText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
