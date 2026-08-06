/**
 * Root layout — providers + the protected navigation shell.
 *
 * Mirrors ContentView.swift: a single Stack whose active route *group* is
 * chosen by the session gate (auth / onboarding / app), the way rootView
 * switched on auth + 2FA + payout state. Headers are hidden globally to match
 * SwiftUI's `.toolbar(.hidden, for: .navigationBar)` — screens draw their own.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/context/session';
import { ThemeProvider, useAppTheme } from '@/theme/theme-context';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <RootNavigator />
            </SessionProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const theme = useAppTheme();
  const { gate, initializing } = useSession();

  // Hold on a blank screen until Firebase reports the persisted session, so a
  // reload doesn't flash the login screen before jumping to the app.
  if (initializing) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Protected guard={gate === 'auth'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={gate === 'onboarding'}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>

        <Stack.Protected guard={gate === 'app'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
