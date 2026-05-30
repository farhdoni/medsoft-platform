import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_URL, TOKEN_KEY } from './constants';

export type User = {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
  locale?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
};

type AuthContextType = AuthState & {
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        setState({ user: null, token: null, isLoading: false });
        return;
      }
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'X-Aivita-Session': token },
      });
      if (res.ok) {
        const json = await res.json();
        setState({ user: json.data ?? json, token, isLoading: false });
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setState({ user: null, token: null, isLoading: false });
      }
    } catch {
      setState({ user: null, token: null, isLoading: false });
    }
  }

  async function signIn(identifier: string, password: string) {
    const res = await fetch(`${API_URL}/auth/mobile-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error((json as any).error ?? 'Login error');
    }
    const token: string = (json as any).data?.token ?? (json as any).token;
    const user: User = (json as any).data?.user ?? (json as any).data;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setState({ user, token, isLoading: false });
  }

  async function signOut() {
    const token = state.token;
    try {
      if (token) {
        await fetch(`${API_URL}/auth/sign-out`, {
          method: 'POST',
          headers: { 'X-Aivita-Session': token },
        });
      }
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setState({ user: null, token: null, isLoading: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
