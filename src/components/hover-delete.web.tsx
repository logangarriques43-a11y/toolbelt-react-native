/**
 * Delete button for list rows in the browser. Swiping a row (`SwipeToDelete`)
 * is how phones delete, and it still works with touch, but nobody discovers a
 * swipe with a mouse, so on hover a trash button appears at the row's right
 * edge. A click is easier to misfire than a swipe, so it asks first. Visibility
 * is pure CSS (`data-hover-delete*` rules in public/index.html): hidden until
 * the row is hovered or the button has keyboard focus, and never shown on
 * touch-only screens.
 */

import { Alert, Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';

export function HoverDeleteButton({ onDelete }: { onDelete: () => void }) {
  const confirm = () =>
    Alert.alert('Delete this?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Pressable
      onPress={confirm}
      accessibilityRole="button"
      accessibilityLabel="Delete"
      dataSet={{ hoverDeleteBtn: '' }}
      style={styles.button}>
      <Icon name="trash.fill" size={16} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iOSColors.red,
    zIndex: 2,
  },
});
