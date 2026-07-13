import { useAuth, WorkOSAuthProvider } from '@/providers/WorkOSAuthProvider';
import { PortalHost } from '@rn-primitives/portal';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

import { NAV_THEME } from '@/lib/theme';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <WorkOSAuthProvider clientId={process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID!}>
      <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
        <GestureHandlerRootView>
          <SafeAreaProvider>
            <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <AuthGatedStack />
              <PortalHost />
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ConvexProviderWithAuth>
    </WorkOSAuthProvider>
  );
}

function AuthGatedStack() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
