/**
 * Browser replacement for React Native's `Alert.alert`.
 *
 * react-native-web ships `Alert.alert` as a no-op, so on the web every error,
 * confirmation and "choose an option" prompt in the app would silently vanish.
 * `installWebAlert()` points `Alert.alert` at a queue, and `<AlertHost />`
 * (mounted once by `web-hosts.web.tsx`) draws the front of that queue as a
 * themed dialog with the same button semantics as the native alert:
 *
 * - no buttons → a single "OK";
 * - `style: 'cancel'` buttons sit last and Escape / backdrop click trigger them;
 * - `style: 'destructive'` buttons are red;
 * - more than two buttons stack vertically, like iOS action alerts;
 * - `options.cancelable` lets the backdrop dismiss (calls `options.onDismiss`).
 *
 * Only the web build imports this file.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type AlertButton, type AlertOptions } from 'react-native';

import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

interface QueuedAlert {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

let nextId = 1;
// Read with useSyncExternalStore (see AlertHost): the React Compiler memoizes
// plain reads of module variables during render.
let queue: QueuedAlert[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const getQueue = () => queue;
const EMPTY: QueuedAlert[] = [];
const getServerQueue = () => EMPTY;

function enqueue(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
  const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  // Native alerts always show the cancel button last; keep that order here.
  const ordered = [...list.filter((b) => b.style !== 'cancel'), ...list.filter((b) => b.style === 'cancel')];
  queue = [...queue, { id: nextId++, title, message, buttons: ordered, options }];
  emit();
}

function shift() {
  queue = queue.slice(1);
  emit();
}

let installed = false;

/** Route `Alert.alert` to the in-page dialog. Safe to call more than once. */
export function installWebAlert() {
  if (installed) return;
  installed = true;
  (Alert as unknown as { alert: typeof Alert.alert }).alert = (title, message, buttons, options) =>
    enqueue(String(title ?? ''), message ?? undefined, buttons, options);
}

export function AlertHost() {
  const theme = useAppTheme();
  const firstButton = useRef<View>(null);
  const current = useSyncExternalStore(subscribe, getQueue, getServerQueue)[0];

  const press = (button?: AlertButton) => {
    shift();
    // Run after the dialog closes so a handler that opens another alert queues
    // behind nothing and shows immediately.
    setTimeout(() => button?.onPress?.(), 0);
  };

  const dismiss = () => {
    if (!current) return;
    const cancel = current.buttons.find((b) => b.style === 'cancel');
    if (cancel) return press(cancel);
    if (current.options?.cancelable) {
      shift();
      setTimeout(() => current.options?.onDismiss?.(), 0);
      return;
    }
    // A single plain "OK" alert can always be dismissed with Escape.
    if (current.buttons.length === 1) press(current.buttons[0]);
  };

  useEffect(() => {
    if (!current || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      } else if (e.key === 'Enter' && current.buttons.length === 1) {
        e.preventDefault();
        press(current.buttons[0]);
      }
    };
    document.addEventListener('keydown', onKey);
    (firstButton.current as unknown as HTMLElement | null)?.focus?.();
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const stacked = current.buttons.length > 2;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityLabel="Dismiss" />
      <View
        role="alertdialog"
        aria-label={current.title}
        style={[styles.card, { backgroundColor: theme.cardBackground, borderRadius: theme.cornerRadius + 4 }]}>
        <View style={styles.body}>
          {current.title ? (
            <Text style={[styles.title, { color: theme.primaryText }]}>{current.title}</Text>
          ) : null}
          {current.message ? (
            <Text style={[styles.message, { color: theme.secondaryText }]}>{current.message}</Text>
          ) : null}
        </View>
        <View style={[stacked ? styles.stack : styles.row, { borderTopColor: theme.divider }]}>
          {current.buttons.map((b, i) => {
            const color =
              b.style === 'destructive' ? iOSColors.red : b.style === 'cancel' ? theme.secondaryText : theme.accent;
            return (
              <Pressable
                key={`${current.id}-${i}`}
                ref={i === 0 ? firstButton : undefined}
                onPress={() => press(b)}
                style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
                  styles.button,
                  stacked ? styles.stackButton : styles.rowButton,
                  !stacked && i > 0 ? [styles.rowDivider, { borderLeftColor: theme.divider }] : null,
                  stacked && i > 0 ? [styles.stackDivider, { borderTopColor: theme.divider }] : null,
                  (hovered || pressed) && { backgroundColor: theme.inputBackground },
                ]}>
                <Text
                  style={[styles.buttonText, { color }, b.style !== 'cancel' && styles.buttonStrong]}
                  numberOfLines={1}>
                  {b.text ?? 'OK'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { width: '100%', maxWidth: 340, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' },
  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 6 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  row: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  stack: { borderTopWidth: StyleSheet.hairlineWidth },
  button: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 12 },
  rowButton: { flex: 1 },
  stackButton: { width: '100%' },
  rowDivider: { borderLeftWidth: StyleSheet.hairlineWidth },
  stackDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  buttonText: { fontSize: 16 },
  buttonStrong: { fontWeight: '600' },
});
