import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../../navigation/types';
import * as authService from '../../../services/authService';
import * as walletService from '../../../services/walletService';
import type { User } from '../../../services/authService';
import { useAuth } from '../../../context/AuthContext';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Account'>;

const MENU_ITEMS = [
  { icon: 'person-outline', label: 'My Information', key: 'info' },
  { icon: 'location-outline', label: 'Saved Addresses', key: 'address' },
  { icon: 'gift-outline', label: 'Refer & Earn', key: 'refer' },
  { icon: 'bag-outline', label: 'My Orders', key: 'orders' },
  { icon: 'notifications-outline', label: 'Notifications', key: 'notifications' },
  { icon: 'help-circle-outline', label: 'Help & Support', key: 'help' },
];

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([authService.getMe(), walletService.getWallet()])
      .then(([u, w]) => {
        setUser(u);
        setWalletBalance(w.balance ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMenuPress = (key: string) => {
    switch (key) {
      case 'refer':
        navigation.navigate('ReferEarn');
        break;
      case 'orders':
        navigation.getParent()?.navigate('OrderAgainTab');
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          logout();
        },
      },
    ]);
  };

  const initials = user?.name ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name || 'Groveno User'}</Text>
                <Text style={styles.userPhone}>{user?.phone}</Text>
              </View>
              <TouchableOpacity style={styles.editBtn}>
                <Ionicons name="pencil" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Wallet Quick Card */}
            <TouchableOpacity
              style={styles.walletCard}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.85}
            >
              <View style={styles.walletLeft}>
                <Text style={styles.walletIcon}>👛</Text>
                <View>
                  <Text style={styles.walletLabel}>Wallet Balance</Text>
                  <Text style={styles.walletAmount}>₹{walletBalance.toFixed(0)}</Text>
                </View>
              </View>
              <View style={styles.walletRight}>
                <Text style={styles.coinsLabel}>🪙 {user?.coins ?? 0} coins</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </View>
            </TouchableOpacity>

            {/* Menu */}
            <View style={styles.menuCard}>
              {MENU_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuRow, index === MENU_ITEMS.length - 1 && styles.menuRowLast]}
                  onPress={() => handleMenuPress(item.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconBox}>
                    <Ionicons name={item.icon as any} size={20} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Groveno Fresh v1.0.0</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: spacing.md, borderRadius: borderRadius.xl, padding: spacing.md, gap: 14, ...shadows.card },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  userPhone: { fontSize: 14, color: colors.textSecondary, marginTop: 3 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.activeBg, alignItems: 'center', justifyContent: 'center' },
  walletCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.splashBg, marginHorizontal: spacing.md, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIcon: { fontSize: 28 },
  walletLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 3 },
  walletAmount: { fontSize: 22, fontWeight: '800', color: '#fff' },
  walletRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coinsLabel: { fontSize: 14, fontWeight: '600', color: '#F5C518' },
  menuCard: { backgroundColor: '#fff', marginHorizontal: spacing.md, borderRadius: borderRadius.xl, ...shadows.card, marginBottom: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 14 },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: spacing.md, borderWidth: 1.5, borderColor: colors.error, borderRadius: borderRadius.md, paddingVertical: 14, marginBottom: 16 },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.error },
  version: { textAlign: 'center', fontSize: 12, color: colors.textLight, paddingBottom: 8 },
});
