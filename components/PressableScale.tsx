import { useState, type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  // Estilo del área pulsable exterior: para flex o márgenes que tienen que afectar al layout del padre.
  wrapperStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

// Feedback de pulsado: 3 % más pequeño en 120 ms con ease-out fuerte. Se pulsa decenas de veces al día,
// así que tiene que ser casi imperceptible.
export default function PressableScale({ style, wrapperStyle, children, hitSlop = 8, ...rest }: Props) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      style={wrapperStyle}
      hitSlop={hitSlop}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPressed(true);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View style={[pressScale.base, style, pressed && pressScale.pressed]}>{children}</Animated.View>
    </Pressable>
  );
}

const pressScale = {
  base: {
    transform: [{ scale: 1 }],
    // El color también transiciona: así un chip o una opción que se selecciona no cambia de golpe.
    transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
    transitionDuration: '120ms',
    transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
  },
  pressed: { transform: [{ scale: 0.97 }] },
} as const;
