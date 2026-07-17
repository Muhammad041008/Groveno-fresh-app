import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CartStackParamList } from '../../../navigation/types';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<CartStackParamList, 'ChannelSelection'>;

const CHANNELS = [
  {
    id: 'home_delivery',
    emoji: '🏠',
    title: 'Home Delivery',
    subtitle: 'Delivered to your door',
    badge: 'Morning / Evening / Express',
    color: colors.primaryDarker,
    bg: colors.activeBg,
    border: colors.primary,
  },
  {
    id: 'express_pickup',
    emoji: '⚡',
    title: 'Express Pickup',
    subtitle: 'Pickup yourself, save 5%',
    badge: '5% OFF',
    color: '#1565C0',
    bg: '#E3F2FD',
    border: '#3B82F6',
  },
  {
    id: 'cl_order',
    emoji: '👥',
    title: 'Order via CL',
    subtitle: 'Contact your Community Leader',
    badge: 'Earn 15–50 coins',
    color: '#6D28D9',
    bg: '#EDE9FE',
    border: '#8B5CF6',
  },
];

export default function ChannelSelectionScreen() {
  const navigation = useNavigation<Nav>();

  const handleSelect = (channelId: string) => {
    if (channelId === 'home_delivery') {
      navigation.navigate('HomeDeliveryCheckout');
    } else if (channelId === 'express_pickup') {
      navigation.navigate('ExpressPickup');
    } else {
      // CL order: same checkout flow with CL code mandatory
      navigation.navigate('HomeDeliveryCheckout');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>How do you want to receive your order?</Text>
      </View>

      <View style={styles.body}>
        {CHANNELS.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            style={[styles.card, { backgroundColor: ch.bg, borderColor: ch.border }]}
            onPress={() => handleSelect(ch.id)}
            activeOpacity={0.85}
          >
            <Text style={styles.emoji}>{ch.emoji}</Text>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, { color: ch.color }]}>{ch.title}</Text>
              <Text style={styles.cardSub}>{ch.subtitle}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: ch.color + '22', borderColor: ch.color + '44' }]}>
              <Text style={[styles.badgeText, { color: ch.color }]}>{ch.badge}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  back: { marginTop: 2 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, lineHeight: 26 },
  body: { padding: spacing.md, gap: 14 },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...shadows.card,
  },
  emoji: { fontSize: 36 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 3 },
  cardSub: { fontSize: 13, color: colors.textSecondary },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
