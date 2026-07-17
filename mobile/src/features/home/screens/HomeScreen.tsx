import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';
import * as productService from '../../../services/productService';
import type { Product, Category } from '../../../services/productService';
import * as walletService from '../../../services/walletService';
import * as authService from '../../../services/authService';
import { BANNERS } from '../../../constants/data';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import FloatingCartBar from '../../../components/FloatingCartBar';
import ProductCard from '../../../components/ProductCard';

const { width } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [vegetables, setVegetables] = useState<Product[]>([]);
  const [fruits, setFruits] = useState<Product[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const bannerScrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    try {
      const [cats, featuredRes, allProds] = await Promise.all([
        productService.getCategories(),
        productService.getProducts({ featured: true, limit: 8 }),
        productService.getProducts({ limit: 20 }),
      ]);
      setCategories(cats);
      setFeatured(featuredRes.products ?? []);

      const allProducts = allProds.products ?? [];
      const vegCat = cats.find((c) => c.slug === 'vegetables' || c.name.toLowerCase().includes('veg'));
      const fruitCat = cats.find((c) => c.slug === 'fruits' || c.name.toLowerCase().includes('fruit'));

      const vegs = vegCat
        ? allProducts.filter((p) => {
            const catId = typeof p.category === 'string' ? p.category : p.category?._id;
            return catId === vegCat._id;
          })
        : allProducts.slice(0, 6);

      const frus = fruitCat
        ? allProducts.filter((p) => {
            const catId = typeof p.category === 'string' ? p.category : p.category?._id;
            return catId === fruitCat._id;
          })
        : allProducts.slice(6, 12);

      setVegetables(vegs);
      setFruits(frus);

      const [user, wallet] = await Promise.all([
        authService.getMe(),
        walletService.getWallet(),
      ]);
      setUserName(user.name || '');
      setWalletBalance(wallet.balance ?? 0);
    } catch {
      // Use empty state on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (activeBanner + 1) % BANNERS.length;
      bannerScrollRef.current?.scrollTo({ x: next * (width - 32), animated: true });
      setActiveBanner(next);
    }, 3200);
    return () => clearInterval(interval);
  }, [activeBanner]);

  const initials = userName ? userName.charAt(0).toUpperCase() : 'U';

  const renderSection = (title: string, subtitle: string, products: Product[], catId?: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductListing', { categoryId: catId, categoryName: title })}
        >
          <Text style={styles.seeAll}>See all ›</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products.slice(0, 8)}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 10 }}
        renderItem={({ item }) => (
          <View style={{ width: 160 }}>
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
            />
          </View>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>Groveno Fresh</Text>
            <TouchableOpacity style={styles.locationRow}>
              <Text style={styles.locationText}>Nirala Estate ▾</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.walletChip}
              onPress={() => navigation.getParent()?.navigate('ProfileTab', { screen: 'Wallet' })}
            >
              <Text style={styles.walletIcon}>👛</Text>
              <Text style={styles.walletText}>₹{walletBalance.toFixed(0)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => navigation.getParent()?.navigate('ProfileTab', { screen: 'Account' })}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={18} color={colors.textLight} />
          <Text style={styles.searchPlaceholder}>
            Search fruits, vegetables, greens...
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
      >
        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <TouchableOpacity
            style={[styles.chip, !activeCatId && styles.chipActive]}
            onPress={() => setActiveCatId(null)}
          >
            <Text style={[styles.chipText, !activeCatId && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat._id}
              style={[styles.chip, activeCatId === cat._id && styles.chipActive]}
              onPress={() => {
                setActiveCatId(cat._id);
                navigation.navigate('ProductListing', { categoryId: cat._id, categoryName: cat.name });
              }}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipText, activeCatId === cat._id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Banners */}
        <View style={styles.bannerContainer}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
              setActiveBanner(idx);
            }}
          >
            {BANNERS.map((b) => (
              <View
                key={b.id}
                style={[styles.banner, { width: width - 32, backgroundColor: b.bg }]}
              >
                <View style={styles.bannerContent}>
                  <Text style={[styles.bannerTitle, { color: b.textColor }]}>{b.title}</Text>
                  <Text style={[styles.bannerSub, { color: b.textColor + 'CC' }]}>{b.subtitle}</Text>
                </View>
                <Text style={styles.bannerEmoji}>{b.emoji}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {BANNERS.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeBanner && styles.dotActive]} />
            ))}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {featured.length > 0 &&
              renderSection("Today's Best Deals", 'Fresh picks, best prices', featured)}
            {vegetables.length > 0 &&
              renderSection('🥦 Fresh Vegetables', 'Farm fresh, delivered daily', vegetables,
                categories.find((c) => c.slug === 'vegetables' || c.name.toLowerCase().includes('veg'))?._id)}
            {fruits.length > 0 &&
              renderSection('🍎 Fresh Fruits', 'Sweet, seasonal selection', fruits,
                categories.find((c) => c.slug === 'fruits' || c.name.toLowerCase().includes('fruit'))?._id)}

            {/* Feature badges */}
            <View style={styles.badges}>
              {[
                { icon: '🚚', label: 'Free Delivery', sub: 'above ₹199' },
                { icon: '⚡', label: '30 Min', sub: 'Express Pickup' },
                { icon: '✅', label: '100% Fresh', sub: 'Quality Assured' },
              ].map((b, i) => (
                <View key={i} style={styles.badge}>
                  <Text style={styles.badgeIcon}>{b.icon}</Text>
                  <Text style={styles.badgeLabel}>{b.label}</Text>
                  <Text style={styles.badgeSub}>{b.sub}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <FloatingCartBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {},
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDarker,
    letterSpacing: -0.3,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.activeBg,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.activeBorder,
  },
  walletIcon: { fontSize: 14 },
  walletText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  searchPlaceholder: { color: colors.textLight, fontSize: 14 },
  chips: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 5,
  },
  chipActive: {
    backgroundColor: colors.activeBg,
    borderColor: colors.primary,
  },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  bannerContainer: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  banner: {
    borderRadius: borderRadius.lg,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: 17, fontWeight: '800', marginBottom: 5 },
  bannerSub: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  bannerEmoji: { fontSize: 50 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 16 },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  sectionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  badges: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: 10,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  badge: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  badgeIcon: { fontSize: 24, marginBottom: 6 },
  badgeLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  badgeSub: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
});
