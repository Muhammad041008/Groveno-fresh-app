export const DELIVERY_FREE_THRESHOLD = 199;
export const DELIVERY_FEE = 30;
export const EXPRESS_FEE = 15;
export const EXPRESS_PICKUP_DISCOUNT_PCT = 5;
export const EXPRESS_PICKUP_CONFIRMATION = 30;
export const CL_COMMISSION_PCT = 5;
export const COINS_PER_FIRST_CL = 50;
export const COINS_PER_CL_ORDER = 15;
export const COINS_PER_RATING = 5;
export const COINS_MAX_REDEMPTION_PCT = 20;
export const COINS_MIN_ORDER = 200;
export const MOCK_OTP_BACKEND = '123456';

export const BANNERS = [
  {
    id: 'b1',
    title: 'Farm Fresh Everyday',
    subtitle: 'Order by 10PM for morning delivery',
    bg: '#E8F5E9',
    textColor: '#14532D',
    emoji: '🥦',
  },
  {
    id: 'b2',
    title: 'Express Pickup — Save 5%',
    subtitle: 'Pickup yourself, skip the queue!',
    bg: '#E3F2FD',
    textColor: '#1565C0',
    emoji: '⚡',
  },
  {
    id: 'b3',
    title: 'Refer & Earn 50 Coins',
    subtitle: 'Invite friends, earn Groveno Coins!',
    bg: '#FFF8E1',
    textColor: '#E65100',
    emoji: '🪙',
  },
];

export const TRENDING_SEARCHES = [
  'Tomato',
  'Potato',
  'Spinach',
  'Onion',
  'Apple',
  'Banana',
  'Carrot',
  'Ginger',
  'Cucumber',
  'Capsicum',
];

export const DELIVERY_SLOTS = [
  {
    id: 'morning',
    label: 'Morning Slot',
    time: '8AM – 12PM',
    info: 'Order by 10PM tonight',
    emoji: '🌅',
  },
  {
    id: 'evening',
    label: 'Evening Slot',
    time: '5PM – 9PM',
    info: 'Order by 2PM today',
    emoji: '🌆',
  },
  {
    id: 'express_30min',
    label: '30 Min Express',
    time: 'Available now',
    info: '+₹15 surge fee',
    emoji: '⚡',
  },
];

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', subtitle: 'Pay using any UPI App', emoji: '⚡' },
  { id: 'card', label: 'Credit/Debit Card', subtitle: 'Visa, Mastercard, Rupay', emoji: '💳' },
  { id: 'netbanking', label: 'Net Banking', subtitle: 'All major banks', emoji: '🏦' },
  { id: 'cod', label: 'Cash on Delivery', subtitle: 'Pay when you receive', emoji: '💵' },
];

export const QUICK_INSTRUCTIONS = [
  { id: 'qi1', text: "Don't ring the bell", emoji: '🔕' },
  { id: 'qi2', text: 'Call before delivery', emoji: '📞' },
  { id: 'qi3', text: 'Leave at door', emoji: '🚪' },
  { id: 'qi4', text: 'Ripe fruits only', emoji: '🍌' },
  { id: 'qi5', text: 'Fresh vegetables only', emoji: '🥬' },
];

export const ONBOARDING_SLIDES = [
  {
    id: 'ob1',
    title: 'Farm Fresh Everyday',
    subtitle: 'Get the freshest fruits & vegetables\ndirectly from local farms to your door.',
    emoji: '🌿',
    bg: '#F0FDF4',
  },
  {
    id: 'ob2',
    title: 'Community Delivery',
    subtitle: 'Order through your Community Leader\nand earn Groveno Coins on every order.',
    emoji: '🤝',
    bg: '#FFF8E1',
  },
  {
    id: 'ob3',
    title: 'Best Prices Guaranteed',
    subtitle: 'Save 5% with Express Pickup.\nEarn coins. Refer friends. Save more.',
    emoji: '🏆',
    bg: '#E3F2FD',
  },
];
