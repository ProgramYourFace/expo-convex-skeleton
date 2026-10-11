import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/providers/WorkOSAuthProvider';
import { useQuery } from 'convex/react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { isAuthenticated, user, signIn, signOut } = useAuth();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-6 px-6">
        <Text variant="h1">Expo Convex Skeleton</Text>
        {isAuthenticated ? (
          <>
            <Text variant="muted">
              Signed in as {user?.email}
              {me ? ` (${[me.firstName, me.lastName].filter(Boolean).join(' ')})` : ''}
            </Text>
            <Button variant="outline" onPress={signOut}>
              <Text>Sign out</Text>
            </Button>
          </>
        ) : (
          <>
            <Text variant="muted">Expo + Convex + WorkOS starter.</Text>
            <Button onPress={signIn}>
              <Text>Sign in</Text>
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
