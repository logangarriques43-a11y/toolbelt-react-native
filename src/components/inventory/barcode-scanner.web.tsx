/**
 * Barcode entry in the browser. Camera scanning needs the phone app, but a
 * USB / Bluetooth barcode scanner "types" the code like a keyboard and ends
 * with Enter — so this sheet is a focused text field that submits on Enter,
 * which also works for typing a code by hand. Same props as the native
 * `barcode-scanner.tsx`.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FormSheet } from '@/components/auth/form-sheet';
import { ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

export function BarcodeScanner({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}) {
  const theme = useAppTheme();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (visible) setCode('');
  }, [visible]);

  const submit = () => {
    const value = code.trim();
    if (value) onScanned(value);
  };

  return (
    <FormSheet
      visible={visible}
      title="Enter Barcode"
      onClose={onClose}
      actionLabel="Done"
      onAction={submit}
      actionDisabled={!code.trim()}>
      <View style={styles.body}>
        <ThemedIconTile name="barcode.viewfinder" size={64} filled />
        <Text style={[styles.hint, { color: theme.secondaryText }]}>
          Scan with a USB or Bluetooth barcode scanner, or type the code. Camera scanning is available in the ToolBelt
          phone app.
        </Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          onSubmitEditing={submit}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Barcode"
          placeholderTextColor={theme.tertiaryText}
          returnKeyType="done"
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, color: theme.primaryText, borderRadius: theme.cornerRadius },
          ]}
        />
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 16, paddingTop: 24 },
  hint: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  input: { alignSelf: 'stretch', fontSize: 18, paddingHorizontal: 14, paddingVertical: 12 },
});
