import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

import SplashScreen from '../features/auth/screens/SplashScreen';
import OnboardingScreen from '../features/auth/screens/OnboardingScreen';
import LoginScreen from '../features/auth/screens/LoginScreen';
import OTPScreen from '../features/auth/screens/OTPScreen';

import HomeScreen from '../features/home/screens/HomeScreen';
import CategoriesScreen from '../features/categories/screens/CategoriesScreen';
import ProductListingScreen from '../features/products/screens/ProductListingScreen';
import ProductDetailScreen from '../features/products/screens/ProductDetailScreen';
import SearchScreen from '../features/products/screens/SearchScreen';

import CartScreen from '../features/cart/screens/CartScreen';
import ChannelSelectionScreen from '../features/cart/screens/ChannelSelectionScreen';
import HomeDeliveryCheckoutScreen from '../features/cart/screens/HomeDeliveryCheckoutScreen';
import ExpressPickupScreen from '../features/cart/screens/ExpressPickupScreen';
import ExpressPickupTrackingScreen from '../features/cart/screens/ExpressPickupTrackingScreen';
import PaymentScreen from '../features/cart/screens/PaymentScreen';
import WalletScreen from '../features/cart/screens/WalletScreen';

import OrderSuccessScreen from '../features/orders/screens/OrderSuccessScreen';
import MyOrdersScreen from '../features/orders/screens/MyOrdersScreen';
import RatingPopupScreen from '../features/orders/screens/RatingPopupScreen';

import ReferEarnScreen from '../features/refer/screens/ReferEarnScreen';
import MyReferralsScreen from '../features/refer/screens/MyReferralsScreen';

import AccountScreen from '../features/profile/screens/AccountScreen';

import type {
  AuthStackParamList,
  HomeStackParamList,
  OrderStackParamList,
  CategoriesStackParamList,
  CartStackParamList,
  ProfileStackParamList,
  RootTabParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const OrderStack = createNativeStackNavigator<OrderStackParamList>();
const CategoriesStack = createNativeStackNavigator<CategoriesStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// 4-dot grid icon for Categories tab
function GridIcon({ color, size }: { color: string; size: number }) {
  const dot = size / 2.6;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap: 2.5, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: dot, height: dot, backgroundColor: color, borderRadius: 2 }} />
      ))}
    </View>
  );
}

export function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="OTP" component={OTPScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="ProductListing" component={ProductListingScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="Search" component={SearchScreen} />
    </HomeStack.Navigator>
  );
}

function OrderNavigator() {
  return (
    <OrderStack.Navigator screenOptions={{ headerShown: false }}>
      <OrderStack.Screen name="MyOrders" component={MyOrdersScreen} />
      <OrderStack.Screen name="RatingPopup" component={RatingPopupScreen} />
    </OrderStack.Navigator>
  );
}

function CategoriesNavigator() {
  return (
    <CategoriesStack.Navigator screenOptions={{ headerShown: false }}>
      <CategoriesStack.Screen name="Categories" component={CategoriesScreen} />
      <CategoriesStack.Screen name="ProductListing" component={ProductListingScreen} />
      <CategoriesStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </CategoriesStack.Navigator>
  );
}

function CartNavigator() {
  return (
    <CartStack.Navigator screenOptions={{ headerShown: false }}>
      <CartStack.Screen name="Cart" component={CartScreen} />
      <CartStack.Screen name="ChannelSelection" component={ChannelSelectionScreen} />
      <CartStack.Screen name="HomeDeliveryCheckout" component={HomeDeliveryCheckoutScreen} />
      <CartStack.Screen name="ExpressPickup" component={ExpressPickupScreen} />
      <CartStack.Screen name="ExpressPickupTracking" component={ExpressPickupTrackingScreen} />
      <CartStack.Screen name="Payment" component={PaymentScreen} />
      <CartStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    </CartStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Account" component={AccountScreen} />
      <ProfileStack.Screen name="Wallet" component={WalletScreen} />
      <ProfileStack.Screen name="ReferEarn" component={ReferEarnScreen} />
      <ProfileStack.Screen name="MyReferrals" component={MyReferralsScreen} />
    </ProfileStack.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrderAgainTab"
        component={OrderNavigator}
        options={{
          tabBarLabel: 'Order Again',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'refresh-circle' : 'refresh-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoriesNavigator}
        options={{
          tabBarLabel: 'Categories',
          tabBarIcon: ({ color, size }) => <GridIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartNavigator}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}
