import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as orderService from '../../../services/orderService';
import type { Order } from '../../../services/orderService';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

const STATUS_COLORS: Record<string, string> = {
  placed: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  out_for_delivery: '#F59E0B',
  delivered: '#22C55E',
  collected: '#22C55E',
  cancelled: '#EF4444',
  ready_for_pickup: '#3B82F6',
  customer_on_way: '#F59E0B',
  arrived: '#22C55E',
};

const CHANNEL_BADGES: Record<string, { label: string; color: string }> = {
  home_delivery: { label: '🏠 Home', color: '#14532D' },
  express_pickup: { label: '⚡ Express', color: '#1565C0' },
  cl_order: { label: '👥 CL', color: '#6D28D9' },
};

/** Statuses for which an express pickup order can still be tracked. */
const TRACKABLE_EXPRESS_STATUSES = new Set(['confirmed', 'customer_on_way', 'ready_for_pickup', 'arrived']);
/** Statuses for which a home/CL delivery order can be tracked. */
const TRACKABLE_DELIVERY_STATUSES = new Set(['placed', 'confirmed', 'preparing', 'out_for_delivery']);

export default function MyOrdersScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySub}>Your past orders will appear here</Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = CHANNEL_BADGES[item.channel];
            const statusColor = STATUS_COLORS[item.status] ?? colors.textSecondary;
            const canTrack =
              (item.channel === 'express_pickup' && TRACKABLE_EXPRESS_STATUSES.has(item.status)) ||
              ((item.channel === 'home_delivery' || item.channel === 'cl_order') && TRACKABLE_DELIVERY_STATUSES.has(item.status));

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNum}>{item.orderNumber}</Text>
                    <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={styles.badges}>
                    <View style={[styles.channelBadge, { backgroundColor: badge?.color + '22' }]}>
                      <Text style={[styles.channelText, { color: badge?.color }]}>{badge?.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {item.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {item.items.slice(0, 2).map((i, idx) => (
                    <Text key={idx} style={styles.itemText}>
                      • {i.name} × {(i as any).quantity ?? i.qty ?? 1}
                    </Text>
                  ))}
                  {item.items.length > 2 && (
                    <Text style={styles.itemMore}>+{item.items.length - 2} more items</Text>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.total}>₹{item.total?.toFixed(0)}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.reorderBtn}>
                      <Text style={styles.reorderText}>Reorder</Text>
                    </TouchableOpacity>

                    {canTrack && (
                      <TouchableOpacity
                        style={styles.trackBtn}
                        testID={`track-order-btn-${item._id}`}
                        onPress={() =>
                          navigation.navigate('TrackOrder', {
                            orderId: item._id,
                            orderNumber: item.orderNumber,
                            items: item.items.map((i) => ({
                              name: i.name,
                              qty: (i as any).quantity ?? i.qty ?? 1,
                            })),
                            pickupPointName:
                              item.channel === 'express_pickup'
                                ? ((item as any).pickupPointName ?? 'Pickup Hub')
                                : 'Groveno Delivery',
                            pickupPointAddress: (item as any).pickupPointAddress ?? '',
                            status: item.status,
                            channel: item.channel,
                          })
                        }
                      >
                        <Text style={styles.trackBtnText}>Track</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === 'delivered' && !item.isRated && (
                      <TouchableOpacity
                        style={styles.rateBtn}
                        onPress={() =>
                          navigation.navigate('RatingPopup', {
                            orderId: item._id,
                            orderNumber: item.orderNumber,
                            items: item.items.map((i) => ({
                              name: i.name,
                              // Backend expandItems stores the field as 'productId';
                              // the legacy OrderItem interface used 'product' — check both.
                              productId: (i as any).productId ?? (i as any).product ?? '',
                              emoji: (i as any).emoji,
                            })),
                          })
                        }
                      >
                        <Text style={styles.rateBtnText}>Rate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: 12, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNum: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badges: { gap: 5, alignItems: 'flex-end' },
  channelBadge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  channelText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  itemsList: { marginBottom: 12 },
  itemText: { fontSize: 13, color: colors.textSecondary, marginBottom: 3 },
  itemMore: { fontSize: 12, color: colors.textLight, fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  total: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: 8 },
  reorderBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  reorderText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  trackBtn: {
    backgroundColor: '#E3F2FD',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  trackBtnText: { color: '#1565C0', fontSize: 13, fontWeight: '700' },
  rateBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  rateBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
