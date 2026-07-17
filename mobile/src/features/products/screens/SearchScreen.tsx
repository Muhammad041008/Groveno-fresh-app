import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';
import * as productService from '../../../services/productService';
import type { Product, Category } from '../../../services/productService';
import { TRENDING_SEARCHES } from '../../../constants/data';
import { useCart } from '../../../context/CartContext';
import { colors, spacing, borderRadius } from '../../../theme';
import AddButton from '../../../components/AddButton';
import FloatingCartBar from '../../../components/FloatingCartBar';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const inputRef = useRef<TextInput>(null);
  const { addItem } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    productService.getCategories().then(setCategories).catch(() => {});
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await productService.getProducts({ search: query, limit: 20 });
        setResults(res.products ?? []);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textLight} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search fruits, vegetables, greens..."
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* Trending */}
            {query.length === 0 && (
              <>
                <Text style={styles.sectionTitle}>Trending Searches</Text>
                <View style={styles.chips}>
                  {TRENDING_SEARCHES.map((t) => (
                    <TouchableOpacity key={t} style={styles.chip} onPress={() => setQuery(t)}>
                      <Text style={styles.chipText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Popular Categories</Text>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={styles.catRow}
                    onPress={() => {
                      navigation.navigate('ProductListing', { categoryId: cat._id, categoryName: cat.name });
                    }}
                  >
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                  </TouchableOpacity>
                ))}
              </>
            )}
            {searching && (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            )}
            {!searching && query.length > 0 && results.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No results for "{query}"</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const cartItem = {
            id: item._id,
            name: item.name,
            price: item.price,
            mrp: item.mrp,
            emoji: item.emoji,
            imageUrl: item.imageUrl,
            weight: item.weight,
          };
          return (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
              activeOpacity={0.7}
            >
              <View style={styles.resultImg}>
                <Text style={styles.resultEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultWeight}>{item.weight}</Text>
                <Text style={styles.resultPrice}>₹{item.price}</Text>
              </View>
              <AddButton product={cartItem} compact />
            </TouchableOpacity>
          );
        }}
      />
      <FloatingCartBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12, marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  catEmoji: { fontSize: 22 },
  catName: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  resultImg: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultEmoji: { fontSize: 28 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  resultWeight: { fontSize: 12, color: colors.textSecondary },
  resultPrice: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: colors.textSecondary },
});
