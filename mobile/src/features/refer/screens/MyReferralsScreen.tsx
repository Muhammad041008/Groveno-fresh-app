import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../../navigation/types';
import * as walletService from '../../../services/walletService';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'MyReferrals'>;

export default function MyReferralsScreen() {
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    walletService.getReferralInfo()
      .then(setData)
      .catch(() => setData({ totalReferrals: 0, completedReferrals: 0, pendingReferrals: 0, totalEarnings: 0, referrals: [] }))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Referrals</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={data?.referrals ?? []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              {/* Stats */}
              <View style={styles.statsRow}>
                <StatCard label="Total" value={data?.totalReferrals ?? 0} icon="👥" />
                <StatCard label="Completed" value={data?.completedReferrals ?? 0} icon="✅" />
                <StatCard label="Pending" value={data?.pendingReferrals ?? 0} icon="⏳" />
              </View>

              <View style={styles.earningsCard}>
                <Text style={styles.earningsLabel}>Total Coins Earned from Referrals</Text>
                <Text style={styles.earningsValue}>🪙 {data?.totalEarnings ?? 0} coins</Text>
              </View>

              <Text style={styles.listTitle}>Your Referrals</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No referrals yet</Text>
              <Text style={styles.emptySub}>Share your code and earn coins!</Text>
              <TouchableOpacity style={styles.shareBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.shareBtnText}>Refer Now</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.refCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.name ?? 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.refInfo}>
                <Text style={styles.refName}>{item.name}</Text>
                <Text style={styles.refDate}>Joined {formatDate(item.joinedAt)}</Text>
              </View>
              <View style={styles.refRight}>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#DCFCE7' : '#FEF9C3' }]}>
                  <Text style={[styles.statusText, { color: item.status === 'completed' ? colors.primary : '#92400E' }]}>
                    {item.status}
                  </Text>
                </View>
                <Text style={styles.coinsEarned}>+{item.coinsEarned ?? 0} coins</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', ...shadows.card },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3, textAlign: 'center' },
  earningsCard: { backgroundColor: colors.splashBg, borderRadius: borderRadius.xl, padding: 16, marginBottom: 20 },
  earningsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  earningsValue: { fontSize: 22, fontWeight: '800', color: '#F5C518' },
  listTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  refCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 14, marginBottom: 8, gap: 12, ...shadows.card },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  refInfo: { flex: 1 },
  refName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  refDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  refRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  coinsEarned: { fontSize: 13, fontWeight: '700', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  shareBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: 28, paddingVertical: 12 },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
