/**
 * SwipeToDelete — swipe a row left to reveal a red delete background; past the
 * threshold it slides off and fires onDelete. Mirrors the DragGesture logic in
 * ServiceCard/ClientCard (offset < -100 → delete, else spring back).
 */

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';

export function SwipeToDelete({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) translateX.value = e.translationX;
    })
    .onEnd(() => {
      if (translateX.value < -100) {
        translateX.value = withTiming(-500, { duration: 300 }, (finished) => {
          if (finished) runOnJS(onDelete)();
        });
      } else {
        translateX.value = withSpring(0, { mass: 1, damping: 18, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -10 ? 1 : 0,
  }));

  return (
    <View>
      <Animated.View style={[styles.deleteBg, deleteBgStyle]}>
        <Icon name="trash.fill" size={24} color="#FFFFFF" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: iOSColors.red,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 30,
  },
});
