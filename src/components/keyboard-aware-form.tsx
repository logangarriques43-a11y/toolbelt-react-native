/**
 * KeyboardAwareForm — THE standard scroll container for any screen or sheet
 * whose body contains text inputs. Auto-scrolls the FOCUSED input above the
 * keyboard on focus (so you never scroll by hand) and keeps enough bottom inset
 * that the last field clears the keyboard, on iOS and Android. Pure JS
 * (react-native-keyboard-aware-scroll-view), so it works in Expo Go.
 *
 * Drop-in replacement for a form's <ScrollView>: place it under the screen's
 * fixed header inside SafeAreaView. Use it EVERYWHERE inputs live in a
 * scrollable body — do NOT hand-roll ScrollView + KeyboardAvoidingView per
 * screen. (Top-anchored search bars and bottom-pinned chat bars are the
 * exceptions and don't use this.)
 */

import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export function KeyboardAwareForm({
  children,
  contentContainerStyle,
  style,
  keyboardDismissMode,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Outer style (e.g. flex:1) — matches a ScrollView's `style` prop. */
  style?: StyleProp<ViewStyle>;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
}) {
  return (
    <KeyboardAwareScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboardDismissMode}
      enableOnAndroid
      enableResetScrollToCoords={false}
      // Extra gap kept above the keyboard so the focused field isn't flush
      // against it (Android needs more to clear the header).
      extraScrollHeight={Platform.OS === 'ios' ? 24 : 96}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
