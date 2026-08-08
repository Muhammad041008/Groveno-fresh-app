import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CategoriesStackParamList } from '../../../navigation/types';
import * as productService from '../../../services/productService';
import type { Category, Product } from '../../../services/productService';
import { colors, spacing, borderRadius } from '../../../theme';
import ProductCard from '../../../components/ProductCard';

type Nav = NativeStackNavigationProp<CategoriesStackParamList, 'Categories'>;

const ALL_CAT: Category = { _id: '__all__', name: 'All', slug: 'all', emoji: '🛒', color: colors.primary };
const PAGE_SIZE = 12;

export default function CategoriesScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category>(ALL_CAT);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [catsLoading, setCatsLoading] = useState(true);
  const [prodsLoading, setProdsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const fetchProducts = useCallback(
    async (cat: Category, pageNum: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (!append) setProdsLoading(true);
      else setLoadingMore(true);
      try {
        const params = cat._id === '__all__'
          ? { page: pageNum, limit: PAGE_SIZE }
          : { category: cat._id, page: pageNum, limit: PAGE_SIZE };
        const res = await productService.getProducts(params);
        const list = res.products ?? [];
        setProducts((prev) => (append ? [...prev, ...list] : list));
        setTotal(res.total ?? list.length);
        setPage(pageNum);
      } finally {
        setProdsLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    productService.getCategories().then((cats) => {
      setCategories([ALL_CAT, ...cats]);
      setCatsLoading(false);
    }).catch(() => setCatsLoading(false));
    // Load all products by default
    fetchProducts(ALL_CAT, 1, false);
  }, [fetchProducts]);

  const handleSelectCategory = useCallback(
    (cat: Category) => {
      if (cat._id === selectedCat._id) return;
      setSelectedCat(cat);
      setProducts([]);
      setPage(1);
      fetchProducts(cat, 1, false);
    },
    [selectedCat._id, fetchProducts]
  );

  const handleLoadMore = useCallback(() => {
    if (loadingRef.current || loadingMore || products.length >= total) return;
    fetchProducts(selectedCat, page + 1, true);
  }, [loadingMore, products.length, total, selectedCat, page, fetchProducts]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.title}>Shop by Category</Text>
        <Text style={styles.subtitle}>
          {selectedCat.name === 'All' ? 'All products' : selectedCat.name}
          {total > 0 ? ` · ${total} items` : ''}
        </Text>
      </View>

      {catsLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <View style={styles.body}>
          {/* ── Left: Category sidebar ───────────────────── */}
          <FlatList
            style={styles.sidebar}
            data={categories}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const isActive = selectedCat._id === item._id;
              return (
                <TouchableOpacity
                  style={[styles.catItem, isActive && styles.catItemActive]}
                  onPress={() => handleSelectCategory(item)}
                  activeOpacity={0.7}
                >
                  {isActive && <View style={styles.activeBar} />}
                  <Text style={styles.catEmoji}>{item.emoji}</Text>
                  <Text
                    style={[styles.catName, isActive && styles.catNameActive]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* ── Divider ─────────────────────────────────── */}
          <View style={styles.divider} />

          {/* ── Right: Products grid ─────────────────────── */}
          {prodsLoading ? (
            <View style={styles.prodsArea}>
              <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 60 }} />
            </View>
          ) : (
            <FlatList
              key={selectedCat._id}
              style={styles.prodsArea}
              data={products}
              numColumns={2}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.prodsGrid}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>{selectedCat.emoji}</Text>
                  <Text style={styles.emptyText}>No products yet</Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                ) : null
              }
              renderItem={({ item }) => (
                <View style={styles.cardWrap}>
                  <ProductCard
                    product={item}
                    onPress={() =>
                      navigation.navigate('ProductDetail', { productId: item._id })
                    }
                  />
                </View>
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  body: { flex: 1, flexDirection: 'row' },

  /* Category sidebar */
  sidebar: {
    width: 88,
    backgroundColor: '#fff',
    flexGrow: 0,
    borderRightWidth: 0,
  },
  catItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
    minHeight: 72,
    justifyContent: 'center',
  },
  catItemActive: {
    backgroundColor: colors.activeBg,
  },
  activeBar: {
    position: 'absolute',
    right: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  catEmoji: { fontSize: 22, marginBottom: 5 },
  catName: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },
  catNameActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },

  /* Divider */
  divider: { width: 1, backgroundColor: colors.border },

  /* Products panel */
  prodsArea: { flex: 1 },
  prodsGrid: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 90,
  },
  cardWrap: {
    flex: 1,
    maxWidth: '50%',
  },

  /* Empty state */
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 42, marginBottom: 10 },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
});
