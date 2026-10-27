/**
 * Barcode scanner — full-screen camera modal for the Inventory dashboard
 * ("Scan Package Label"), the RN counterpart to the AVFoundation scanner on iOS.
 *
 * Uses expo-camera's CameraView with retail + warehouse symbologies (EAN-13/8,
 * UPC-A/E, Code 128/39, QR). Asks for camera permission on open; if the user
 * has denied it (and the OS won't ask again) it shows a plain explanation with
 * an "Open Settings" button. Reports the first code it reads via `onScanned`
 * and ignores further reads until it's reopened.
 */

import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'];

export function BarcodeScanner({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called once with the decoded value (trimmed). */
  onScanned: (code: string) => void;
}) {
  const theme = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  // Guards against the burst of duplicate callbacks CameraView fires per frame.
  const handled = useRef(false);
  // Auto-prompt once per opening; after a denial the user taps "Allow Camera".
  const asked = useRef(false);

  useEffect(() => {
    if (!visible) {
      asked.current = false;
      return;
    }
    handled.current = false;
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const onBarcode = ({ data }: { data: string }) => {
    const code = data?.trim();
    if (!code || handled.current) return;
    handled.current = true;
    onScanned(code);
  };

  const body = () => {
    if (!permission) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      );
    }
    if (!permission.granted) {
      const blocked = !permission.canAskAgain;
      return (
        <View style={[styles.center, styles.denied]}>
          <ThemedIconTile name="camera.fill" size={64} />
          <Text style={[theme.display(24), styles.centerText]}>Camera access needed</Text>
          <Text style={[styles.deniedSub, { color: theme.secondaryText }]}>
            {blocked
              ? 'ToolBelt can’t use the camera because access was turned off. Turn on Camera for ToolBelt in Settings to scan barcodes.'
              : 'ToolBelt uses the camera to read barcodes and QR codes on your stock. Nothing is recorded or uploaded.'}
          </Text>
          {blocked ? (
            <ThemedButton title="Open Settings" icon="gearshape.fill" onPress={() => Linking.openSettings()} style={styles.deniedBtn} />
          ) : (
            <ThemedButton title="Allow Camera" icon="camera.fill" onPress={() => requestPermission()} style={styles.deniedBtn} />
          )}
        </View>
      );
    }
    return (
      <View style={styles.flex}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={visible ? onBarcode : undefined}
        />
        <View style={styles.overlay} pointerEvents="none">
          <View style={[styles.frame, { borderColor: '#FFFFFF' }]} />
          <Text style={styles.hint}>Point at a barcode or QR code</Text>
        </View>
      </View>
    );
  };

  const granted = !!permission?.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.flex, { backgroundColor: granted ? '#000000' : theme.background }]}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="Close scanner">
              <Icon name="xmark" size={20} color={granted ? '#FFFFFF' : theme.primaryText} />
            </Pressable>
            <Text style={[styles.title, { color: granted ? '#FFFFFF' : theme.primaryText }]}>Scan Package Label</Text>
            <View style={styles.close} />
          </View>
          {body()}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, zIndex: 2 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  denied: { paddingHorizontal: 32, gap: 16 },
  deniedSub: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  deniedBtn: { alignSelf: 'stretch', marginTop: 8 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 20 },
  frame: { width: 260, height: 180, borderWidth: 3, borderRadius: 16 },
  hint: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
});
