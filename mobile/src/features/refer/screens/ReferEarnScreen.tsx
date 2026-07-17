import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../../navigation/types';
import * as walletService from '../../../services/walletService';
import * as authService from '../../../services/authService';
import { colors, spacing, borderRadius, shadows } from '../../../theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ReferEarn'>;

const HOW_IT_WORKS = [
  { step: '1', title: 'Share Your Code', desc: 'Send your unique referral code to friends via WhatsApp, SMS or any app.' },
  { step: '2', title: 'Friend Signs Up', desc: 'Your friend downloads Groveno Fresh and signs up using your code.' },
  { step: '3', title: 'Both Earn Coins', desc: 'You get 50 Groveno Coins after your friend places their first order.' },
];

export default function ReferEarnScreen() {
  const navigation = useNavigation<Nav>();
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authService.getMe().then((user) => {
      setReferralCode(user.referralCode ?? user.phone?.slice(-6) ?? 'GROVEN');
    }).catch(() => setReferralCode('GROVEN')).finally(() => setLoading(false));
  }, []);

  const referralLink = `https://groveno.app/qr?ref=${referralCode}`;

  const copyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: `Order fresh veggies with me on Groveno Fresh! Use my code ${referralCode} and we both earn coins!\n\nDownload: ${referralLink}`,
        title: 'Join me on Groveno Fresh',
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🤝</Text>
          <Text style={styles.heroTitle}>You & your friend → 50 Coins each!</Text>
          <Text style={styles.heroSub}>
            Share your code and earn 50 Groveno Coins when your friend places their first order
          </Text>
        </View>

        <View style={{ padding: spacing.md }}>
          {/* Referral Code */}
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your Referral Code</Text>
              <View style={styles.codeRow}>
                <Text style={styles.code}>{referralCode}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.primary} />
                  <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Referral Link */}
          <View style={styles.linkCard}>
            <Text style={styles.linkLabel}>Referral Link</Text>
            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1}>{referralLink}</Text>
              <TouchableOpacity onPress={() => Clipboard.setStringAsync(referralLink)}>
                <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* How it works */}
          <Text style={styles.sectionTitle}>How It Works</Text>
          {HOW_IT_WORKS.map((step) => (
            <View key={step.step} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.step}</Text>
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}

          {/* Invite Button */}
          <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} activeOpacity={0.88}>
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.inviteBtnText}>INVITE FRIENDS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewReferralsBtn}
            onPress={() => navigation.navigate('MyReferrals')}
          >
            <Text style={styles.viewReferralsText}>View My Referrals ›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  hero: { backgroundColor: colors.splashBg, padding: spacing.xl, alignItems: 'center' },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },
  codeCard: { backgroundColor: '#fff', borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: 12, ...shadows.card, borderWidth: 1, borderColor: colors.primary },
  codeLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginBottom: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontSize: 28, fontWeight: '800', color: colors.primaryDarker, letterSpacing: 3 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.activeBg, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 8, gap: 5, borderWidth: 1, borderColor: colors.primary },
  copyText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  linkCard: { backgroundColor: '#fff', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: 20, ...shadows.card },
  linkLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'flex-start' },
  stepNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  stepDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  inviteBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 14, ...shadows.green },
  inviteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  viewReferralsBtn: { alignItems: 'center', paddingVertical: 8 },
  viewReferralsText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
