import { RawWorkOSUser, WorkOSClient } from '@/lib/workos-client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface AuthContextType {
  user: RawWorkOSUser | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function WorkOSAuthProvider({
  children,
  clientId,
  redirectPath,
}: {
  children: React.ReactNode;
  clientId: string;
  redirectPath?: string;
}) {
  const [user, setUser] = useState<RawWorkOSUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const workos = useMemo(
    () => new WorkOSClient({ clientId, redirectPath }),
    [clientId, redirectPath],
  );

  // Load User on Mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Web: if we just got bounced back from WorkOS, finish the exchange
        // before falling through to the cached user.
        const callbackSession = await workos.completeAuthFromUrl();
        if (callbackSession) {
          setUser(callbackSession.user);
          return;
        }

        const storedUser = await workos.getUser();
        setUser(storedUser);
      } catch (e) {
        console.log('Failed to load session', e);
      } finally {
        setIsLoading(false);
      }
    };

    const tid = setTimeout(() => loadSession());
    return () => {
      clearTimeout(tid);
    };
  }, [workos]);

  const signIn = async () => {
    try {
      setIsLoading(true);
      const data = await workos.signIn();
      setUser(data?.user || null);
    } catch (error) {
      console.log('Sign in failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await workos.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccessToken = useMemo(
    () =>
      async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        if (forceRefreshToken) {
          try {
            const session = await workos.authenticateWithRefreshToken();
            setUser(session.user);
            return session.access_token;
          } catch (e) {
            console.log('Failed to refresh session', e);
            // Stay signed in through transient failures (offline, 5xx); only drop
            // the user once the refresh token was rejected and cleared.
            if (!(await workos.getRefreshToken())) setUser(null);
            return null;
          }
        }

        return workos.getAccessToken();
      },
    [workos],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        fetchAccessToken,
        isLoading,
        isAuthenticated: !!user,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a WorkOSAuthProvider');
  }
  return context;
}
