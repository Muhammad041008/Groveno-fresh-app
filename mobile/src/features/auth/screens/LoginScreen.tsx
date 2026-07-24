import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';
import * as authService from '../../../services/authService';
import { colors, spacing, borderRadius } from '../../../theme';
import {
  firebaseAuth,
  isFirebaseAvailable,
  isDemoPhone,
  setConfirmationResult,
  DEMO_PHONE_E164,
} from '../../../utils/firebaseStore';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = phone.length === 10;

  const handleGetOtp = async () => {
    if (!isValid || loading) return;
    setLoading(true);

    try {
      if (isDemoPhone(phone)) {
        // ── Demo / mock mode ─────────────────────────────────────
        // Skip Firebase — call backend sendOtp for form's sake then navigate
        try { await authService.sendOtp(DEMO_PHONE_E164); } catch { /* ok */ }
        navigation.navigate('OTP', { phone: DEMO_PHONE_E164, isMockMode: true });
      } else if (isFirebaseAvailable) {
        // ── Firebase mode (dev build) ─────────────────────────────
        const confirmation = await firebaseAuth().signInWithPhoneNumber(`+91${phone}`);
        setConfirmationResult(confirmation);
        navigation.navigate('OTP', { phone: `+91${phone}`, isMockMode: false });
      } else {
        // ── Expo Go without Firebase ──────────────────────────────
        Alert.alert(
          'Dev Build Required',
          'Firebase Phone Auth needs a dev build.\n\nFor testing, enter: 1234567890\nDemo OTP: 1234',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to send OTP. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <Image
            source={require('../../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brand}>Groveno Fresh</Text>
          <Text style={styles.tagline}>Freshness You Can Trust</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Enter your phone number</Text>
          <Text style={styles.sub}>We'll send you a verification code</Text>

          <View style={styles.inputRow}>
            <View style={styles.prefix}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.code}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleGetOtp}
            />
          </View>

          {!isFirebaseAvailable && (
            <Text style={styles.devNote}>
              Demo mode active — use 1234567890 / OTP: 1234
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btn, !isValid && styles.btnDisabled]}
            onPress={handleGetOtp}
            activeOpacity={0.85}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Get OTP</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoArea: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { width: 90, height: 90, borderRadius: 18, marginBottom: 12 },
  brand: { fontSize: 24, fontWeight: '800', color: colors.primaryDarker, letterSpacing: -0.3 },
  tagline: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderMid,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  flag: { fontSize: 18 },
  code: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  devNote: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  btn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#D1FAE5', opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  terms: {
    marginTop: spacing.xl,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: { color: colors.primary, fontWeight: '600' },
});
