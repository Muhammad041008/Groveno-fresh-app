import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { CartProvider } from './src/context/CartContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthNavigator, MainNavigator } from './src/navigation';
import { colors } from './src/theme';

function RootApp() {
  const { isReady, isLoggedIn } = useAuth();
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: colors.splashBg }} />;
  }
  return (
    <NavigationContainer>
      <StatusBar style={isLoggedIn ? 'dark' : 'light'} />
      {isLoggedIn ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CartProvider>
            <RootApp />
          </CartProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
