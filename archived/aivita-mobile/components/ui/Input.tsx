import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { COLORS } from '../../lib/constants';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export default function Input({ label, error, containerStyle, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: COLORS.textSecondary,
            marginBottom: 8,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[
          {
            backgroundColor: COLORS.white,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 13,
            fontSize: 15,
            color: COLORS.textPrimary,
            borderWidth: 1.5,
            borderColor: error
              ? '#f5b8c4'
              : focused
              ? COLORS.accentRose
              : COLORS.borderSoft,
          },
          props.style,
        ]}
        placeholderTextColor={COLORS.textMuted}
      />
      {error && (
        <Text
          style={{
            fontSize: 12,
            color: '#9c3050',
            marginTop: 6,
            marginLeft: 4,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
