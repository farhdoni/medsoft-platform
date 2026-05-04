import { getToken, setToken, deleteToken, mobileSignIn, type MobileUser } from './api';

export type AuthUser = MobileUser;

export async function signIn(identifier: string, password: string): Promise<AuthUser> {
  const { token, user } = await mobileSignIn(identifier, password);
  await setToken(token);
  return user;
}

export async function signOut(): Promise<void> {
  await deleteToken();
}

export async function getStoredToken(): Promise<string | null> {
  return getToken();
}
