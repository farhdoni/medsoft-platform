import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../../lib/constants';

type Props = {
  score: number;
  size?: number;
  strokeWidth?: number;
};

function getScoreColor(score: number): string {
  if (score >= 70) return COLORS.accentMintDeep;
  if (score >= 40) return COLORS.accentRose;
  return COLORS.textMuted;
}

export default function HealthRing({ score, size = 80, strokeWidth = 8 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const progress = clampedScore / 100;
  const strokeDashoffset = circumference * (1 - progress);
  const color = getScoreColor(clampedScore);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.borderSoft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          fontSize: size * 0.28,
          fontWeight: '800',
          color: color,
          letterSpacing: -0.5,
        }}
      >
        {clampedScore > 0 ? Math.round(clampedScore) : '--'}
      </Text>
    </View>
  );
}
