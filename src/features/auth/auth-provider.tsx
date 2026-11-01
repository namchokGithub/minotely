import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FirebaseError } from "firebase/app";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { AuthContext, type AuthStatus } from "./auth-context";
import { isOwnerEmail } from "./owner";

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL;
const NOT_OWNER_MESSAGE = "This Google account cannot use Minotely.";
const IGNORED_POPUP_ERRORS = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      if (
        next &&
        !(next.emailVerified && isOwnerEmail(next.email, OWNER_EMAIL))
      ) {
        setError(NOT_OWNER_MESSAGE);
        void firebaseSignOut(auth);
        return;
      }
      setUser(next);
      setStatus(next ? "signed-in" : "signed-out");
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err instanceof FirebaseError && IGNORED_POPUP_ERRORS.has(err.code)) {
        return;
      }
      setError("Sign-in failed. Please try again.");
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ status, user, error, signIn, signOut }),
    [status, user, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
