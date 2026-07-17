import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../context/AuthContext';
import { colors } from '../../../theme';
// eslint-disable-next-line @typescript-eslint/no-unused-vars

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const { login } = useAuth();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      const token = await AsyncStorage.getItem('groveno_token');
      const onboardingDone = await AsyncStorage.getItem('groveno_onboarding');

      if (token) {
        login(); // App.tsx switches to MainNavigator
      } else if (onboardingDone) {
        navigation.replace('Login');
      } else {
        navigation.replace('Onboarding');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [login, navigation, opacity, scale]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.splashBg} barStyle="light-content" />
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Image
          source={require('../../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>Groveno Fresh</Text>
        <Text style={styles.tagline}>Freshness You Can Trust</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.splashBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 130,
    height: 130,
    marginBottom: 24,
  },
  brand: {
    color: '#F5C518',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
