import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../../lib/constants';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: COLORS.accentRose, text: COLORS.white },
  secondary: { bg: COLORS.bgSoftPurple, text: COLORS.accentPurpleDeep },
  ghost: { bg: 'transparent', text: COLORS.textPrimary, border: COLORS.borderSoft },
  danger: { bg: '#fde8ec', text: '#9c3050', border: '#f5b8c4' },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const vs = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDisabled && variant === 'primary' ? COLORS.textMuted : vs.bg,
          borderWidth: vs.border ? 1.5 : 0,
          borderColor: vs.border ?? 'transparent',
          shadowColor: variant === 'primary' ? COLORS.accentRose : 'transparent',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: variant === 'primary' ? 0.25 : 0,
          shadowRadius: 6,
          elevation: variant === 'primary' ? 4 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: isDisabled && variant === 'primary' ? COLORS.white : vs.text,
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
