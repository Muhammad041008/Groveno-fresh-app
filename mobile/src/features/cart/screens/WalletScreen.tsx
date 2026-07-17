import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import type { WalletTransaction, CoinTransaction, WalletData } from '../../../services/walletService';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Wallet'>;

export default function WalletScreen() {
  const navigation = useNavigation<Nav>();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [coinHistory, setCoinHistory] = useState<CoinTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'wallet' | 'coins'>('wallet');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      walletService.getWallet(),
      walletService.getWalletTransactions(),
      walletService.getCoinHistory(),
    ]).then(([w, tx, coins]) => {
      setWallet(w);
      setTransactions(tx);
      setCoinHistory(coins);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.splashBg} />

      {/* Dark green header */}
      <View style={styles.darkHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.darkHeaderTitle}>My Wallet</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Balance Cards */}
      <View style={styles.balanceSection}>
        <View style={styles.walletCard}>
          <Text style={styles.walletCardLabel}>👛 Available Balance</Text>
          <Text style={styles.walletCardAmount}>₹{wallet?.balance?.toFixed(2) ?? '0.00'}</Text>
          <TouchableOpacity style={styles.addMoneyBtn}>
            <Text style={styles.addMoneyText}>+ Add Money</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.coinsCard}>
          <View style={styles.coinsCardTop}>
            <View>
              <Text style={styles.coinsLabel}>🪙 Groveno Coins</Text>
              <Text style={styles.coinsAmount}>{wallet?.coins ?? 0} Coins = ₹{wallet?.coins ?? 0}</Text>
            </View>
          </View>
          {wallet?.coinsExpiresAt && (
            <Text style={styles.coinsExpiry}>
              Expires: {new Date(wallet.coinsExpiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && styles.tabActive]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
            Wallet Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coins' && styles.tabActive]}
          onPress={() => setActiveTab('coins')}
        >
          <Text style={[styles.tabText, activeTab === 'coins' && styles.tabTextActive]}>
            Coins History
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
          {activeTab === 'wallet' ? (
            transactions.length === 0 ? (
              <EmptyState icon="💳" text="No wallet transactions yet" />
            ) : (
              transactions.map((tx) => (
                <View key={tx._id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Text style={{ fontSize: 18 }}>{tx.type === 'credit' ? '💚' : '🔴'}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === 'credit' ? colors.primary : colors.error }]}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </Text>
                </View>
              ))
            )
          ) : (
            coinHistory.length === 0 ? (
              <EmptyState icon="🪙" text="No coin transactions yet" />
            ) : (
              coinHistory.map((tx) => (
                <View key={tx._id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: tx.type === 'earned' ? '#DCFCE7' : '#FEF9C3' }]}>
                    <Text style={{ fontSize: 18 }}>{tx.type === 'earned' ? '🪙' : tx.type === 'used' ? '⬇️' : '⏰'}</Text>
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{tx.reason?.replace(/_/g, ' ')}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.type === 'earned' ? colors.primary : colors.textSecondary }]}>
                    {tx.type === 'earned' ? '+' : '-'}{tx.coins} coins
                  </Text>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 15, color: colors.textSecondary }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  darkHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.splashBg, paddingHorizontal: spacing.md, paddingVertical: 14 },
  darkHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  balanceSection: { backgroundColor: colors.splashBg, paddingHorizontal: spacing.md, paddingBottom: 24, gap: 12 },
  walletCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: borderRadius.xl, padding: spacing.md, alignItems: 'flex-start' },
  walletCardLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 6 },
  walletCardAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 14 },
  addMoneyBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: borderRadius.full, paddingHorizontal: 18, paddingVertical: 8 },
  addMoneyText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  coinsCard: { backgroundColor: 'rgba(245,197,24,0.18)', borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(245,197,24,0.4)' },
  coinsCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  coinsLabel: { color: '#F5C518', fontSize: 14, fontWeight: '600' },
  coinsAmount: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  coinsExpiry: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: 14, marginBottom: 8, gap: 12, ...shadows.card },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  txDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});
