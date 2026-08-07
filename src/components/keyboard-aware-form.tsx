/**
 * KeyboardAwareForm — the scrollable body of a form screen that auto-scrolls the
 * FOCUSED input above the keyboard (so you never scroll by hand), on iOS and
 * Android. Pure JS (Expo Go compatible). Drop-in replacement for a form's
 * <ScrollView>; place it under the screen's fixed header inside SafeAreaView.
 */

import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export function KeyboardAwareForm({
  children,
  contentContainerStyle,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAwareScrollView
      contentContainerStyle={contentContainerStyle}
      keyboardShouldPersistTaps="handled"
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
