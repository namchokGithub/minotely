import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthStatus = "loading" | "signed-in" | "signed-out";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
