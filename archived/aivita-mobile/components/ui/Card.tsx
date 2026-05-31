import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../lib/constants';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'soft-pink' | 'soft-purple' | 'soft-mint';
  padding?: number;
};

const VARIANT_BG: Record<string, string> = {
  default: COLORS.white,
  'soft-pink': COLORS.bgSoftPink,
  'soft-purple': COLORS.bgSoftPurple,
  'soft-mint': COLORS.bgSoftMint,
};

export default function Card({ children, style, variant = 'default', padding = 18 }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: VARIANT_BG[variant] ?? COLORS.white,
          borderRadius: 20,
          padding,
          borderWidth: variant === 'default' ? 1 : 0,
          borderColor: COLORS.borderSoft,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
