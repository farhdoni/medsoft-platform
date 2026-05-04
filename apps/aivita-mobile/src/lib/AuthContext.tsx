import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn as authSignIn, signOut as authSignOut, getStoredToken, type AuthUser } from './auth';
import { api, isOk } from './api';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser };

type AuthContextValue = {
  state: AuthState;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    async function bootstrap() {
      const token = await getStoredToken();
      if (!token) {
        setState({ status: 'unauthenticated' });
        return;
      }
      // Validate token by hitting /me
      const res = await api.users.me();
      if (isOk(res)) {
        const u = res.data as AuthUser;
        setState({ status: 'authenticated', user: u });
      } else {
        setState({ status: 'unauthenticated' });
      }
    }
    bootstrap();
  }, []);

  async function signIn(identifier: string, password: string) {
    const user = await authSignIn(identifier, password);
    setState({ status: 'authenticated', user });
  }

  async function signOut() {
    await authSignOut();
    setState({ status: 'unauthenticated' });
  }

  return (
    <AuthContext.Provider value={{ state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useUser(): AuthUser {
  const { state } = useAuth();
  if (state.status !== 'authenticated') throw new Error('Not authenticated');
  return state.user;
}
