import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../context/AuthContext';
import * as authService from '../../../services/authService';
import { colors, spacing, borderRadius } from '../../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
type Route = RouteProp<AuthStackParamList, 'OTP'>;

export default function OTPScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { phone } = route.params;
  const { login } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    const t = setTimeout(() => inputRefs[0].current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 4 || loading) return;
    setLoading(true);
    try {
      await authService.verifyOtp(phone, code);
      login(); // Switch to MainNavigator via AuthContext
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Verification failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setResendTimer(30);
    authService.sendOtp(phone).catch(() => {});
  };

  const filled = otp.every((d) => d !== '');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Enter OTP</Text>
        <Text style={styles.sub}>
          Sent to <Text style={styles.phone}>{phone}</Text>
        </Text>
        <Text style={styles.demo}>Demo mode: any 4 digits work</Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={inputRefs[i]}
              style={[styles.box, digit ? styles.boxFilled : null]}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, !filled && styles.btnOff]}
          onPress={handleVerify}
          disabled={!filled || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resendTimer > 0}>
          <Text style={[styles.resendText, resendTimer > 0 && styles.resendOff]}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 60 },
  back: { marginBottom: spacing.xl },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  heading: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  sub: { fontSize: 15, color: colors.textSecondary, marginBottom: 4 },
  phone: { fontWeight: '700', color: colors.textPrimary },
  demo: { fontSize: 12, color: colors.primary, fontWeight: '500', marginBottom: spacing.xl },
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.xl },
  box: {
    flex: 1,
    height: 64,
    borderWidth: 1.5,
    borderColor: colors.borderMid,
    borderRadius: borderRadius.md,
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: '#F9FAFB',
  },
  boxFilled: { borderColor: colors.primary, backgroundColor: colors.activeBg },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  btnOff: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 10 },
  resendText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  resendOff: { color: colors.textLight },
});
