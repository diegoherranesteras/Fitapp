import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { glow, neon } from '../lib/theme';

interface Props {
  size: number;
  strokeWidth: number;
  progress: number; // 0..1
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export default function RingProgress({ size, strokeWidth, progress, color, trackColor = neon.faint, children }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, ...glow(Math.round(size / 8), 0.3) }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {/* Filo de luz exterior, como un tubo de neón */}
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.75} stroke={neon.soft} strokeWidth={1} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          fill="none"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}
