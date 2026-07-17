import api from './api';

export interface WalletData {
  balance: number;
  coins: number;
  coinsExpiresAt?: string;
}

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  createdAt: string;
}

export interface CoinTransaction {
  _id: string;
  type: 'earned' | 'used' | 'expired';
  coins: number;
  reason: string;
  createdAt: string;
  expiresAt?: string;
}

export async function getWallet(): Promise<WalletData> {
  const res = await api.get('/api/wallet');
  return res.data.wallet ?? res.data;
}

export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  const res = await api.get('/api/wallet');
  return res.data.transactions ?? [];
}

export async function getCoinHistory(): Promise<CoinTransaction[]> {
  const res = await api.get('/api/coins/history');
  return res.data.transactions ?? [];
}

export async function getCoinBalance(): Promise<WalletData> {
  const res = await api.get('/api/coins/balance');
  return res.data;
}

export async function validateClForCoins(clCode: string): Promise<{
  valid: boolean;
  clName?: string;
  society?: string;
  coinsToEarn: number;
}> {
  const res = await api.post('/api/coins/validate-cl', { clCode });
  return res.data;
}

export async function getReferralInfo(): Promise<{
  referralCode: string;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  referrals: Array<{
    _id: string;
    name: string;
    phone: string;
    joinedAt: string;
    status: string;
    coinsEarned: number;
  }>;
}> {
  const res = await api.get('/api/referral/me');
  return res.data;
}
