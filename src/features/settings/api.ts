import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSnapshotQuery } from "@/lib/use-snapshot-query";
import { useUid } from "@/features/auth/auth-context";

export type FontFamily = "sans" | "serif" | "mono";
export type FontSize = "sm" | "md" | "lg";

/** `users/{uid}/preferences/settings`, synced across devices. */
export type Settings = {
  fontFamily: FontFamily;
  fontSize: FontSize;
};

export const DEFAULT_SETTINGS: Settings = {
  fontFamily: "sans",
  fontSize: "md",
};

const settingsDoc = (uid: string) =>
  doc(db, "users", uid, "preferences", "settings");

export function useSettings(): Settings {
  const uid = useUid();
  const { data } = useSnapshotQuery<Settings>(
    ["settings", uid],
    (onData, onError) =>
      onSnapshot(
        settingsDoc(uid),
        (snap) => onData({ ...DEFAULT_SETTINGS, ...snap.data() }),
        onError,
      ),
  );
  return data ?? DEFAULT_SETTINGS;
}

export function updateSettings(uid: string, settings: Partial<Settings>) {
  return setDoc(settingsDoc(uid), settings, { merge: true });
}
