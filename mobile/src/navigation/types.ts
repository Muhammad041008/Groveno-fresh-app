import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  /** isMockMode = true → demo phone 1234567890, OTP 1234, no Firebase */
  OTP: { phone: string; isMockMode: boolean };
};

export type HomeStackParamList = {
  Home: undefined;
  ProductListing: { categoryId?: string; categoryName?: string; searchQuery?: string };
  ProductDetail: { productId: string };
  Search: undefined;
};

export type OrderStackParamList = {
  MyOrders: undefined;
  RatingPopup: {
    orderId: string;
    orderNumber: string;
    items: Array<{ name: string; productId: string; emoji?: string }>;
  };
  TrackOrder: {
    orderId: string;
    orderNumber: string;
    items: Array<{ name: string; qty: number }>;
    pickupPointName: string;
    pickupPointAddress?: string;
    status: string;
  };
};

export type CategoriesStackParamList = {
  Categories: undefined;
  ProductListing: { categoryId?: string; categoryName?: string };
  ProductDetail: { productId: string };
};

export type CartStackParamList = {
  Cart: undefined;
  ChannelSelection: undefined;
  HomeDeliveryCheckout: { mode: 'home_delivery' | 'cl_order' };
  ExpressPickup: undefined;
  ExpressPickupTracking: {
    orderId: string;
    orderNumber: string;
    hubLat: number;
    hubLng: number;
    hubAddress: string;
    hubName: string;
  };
  Payment: {
    channel: 'home_delivery' | 'cl_order' | 'express_pickup';
    total: number;
    orderId?: string;
    orderData?: Record<string, unknown>;
  };
  OrderSuccess: {
    orderId: string;
    orderNumber: string;
    channel: string;
    coinsEarned: number;
    total: number;
    deliverySlot?: string;
    paymentMethod?: string;
  };
};

export type ProfileStackParamList = {
  Account: undefined;
  Wallet: undefined;
  ReferEarn: undefined;
  MyReferrals: undefined;
};

export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  OrderAgainTab: NavigatorScreenParams<OrderStackParamList>;
  CategoriesTab: NavigatorScreenParams<CategoriesStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
  CartTab: NavigatorScreenParams<CartStackParamList>;
};
