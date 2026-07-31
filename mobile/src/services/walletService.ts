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

const DEMO_WALLET: WalletData = { balance: 0, coins: 25 };
const DEMO_COIN_TXN: CoinTransaction[] = [
  { _id: 'ct1', type: 'earned', coins: 25, reason: 'Welcome bonus', createdAt: new Date().toISOString() },
];

export async function getWallet(): Promise<WalletData> {
  try {
    const res = await api.get('/api/wallet');
    return res.data.wallet ?? res.data ?? DEMO_WALLET;
  } catch {
    return DEMO_WALLET;
  }
}

export async function getWalletTransactions(): Promise<WalletTransaction[]> {
  try {
    const res = await api.get('/api/wallet');
    return res.data.transactions ?? [];
  } catch {
    return [];
  }
}

export async function getCoinHistory(): Promise<CoinTransaction[]> {
  try {
    const res = await api.get('/api/coins/history');
    return res.data.transactions ?? [];
  } catch {
    return DEMO_COIN_TXN;
  }
}

export async function getCoinBalance(): Promise<WalletData> {
  try {
    const res = await api.get('/api/coins/balance');
    return res.data ?? DEMO_WALLET;
  } catch {
    return DEMO_WALLET;
  }
}

export async function validateClForCoins(clCode: string): Promise<{
  valid: boolean;
  clName?: string;
  society?: string;
  coinsToEarn: number;
}> {
  try {
    const res = await api.post('/api/coins/validate-cl', { clCode });
    return res.data;
  } catch {
    return { valid: false, coinsToEarn: 0 };
  }
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
  try {
    const res = await api.get('/api/referral/me');
    return res.data;
  } catch {
    return { referralCode: 'GROVEN', totalReferrals: 0, completedReferrals: 0, pendingReferrals: 0, totalEarnings: 0, referrals: [] };
  }
}
