/**
 * KeyboardAvoidingForm — wraps a screen's header + ScrollView so a focused input
 * lifts above the on-screen keyboard.
 *
 * iOS needs `behavior="padding"`; Android resizes the window itself (Expo's
 * default softwareKeyboardLayoutMode is "resize"), so the inner ScrollView keeps
 * the focused field visible without a competing behavior. Place this directly
 * inside the screen's SafeAreaView, wrapping the header + ScrollView.
 */

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

export function KeyboardAvoidingForm({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
