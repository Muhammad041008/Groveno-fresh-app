import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

interface GrovenoLogoProps {
  size?: number;
}

export default function GrovenoLogo({ size = 100 }: GrovenoLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: size, height: size, borderRadius: size * 0.18 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
