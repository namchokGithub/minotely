import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseApp } from "./firebase";

/**
 * Kept apart from ./firebase so the sign-in screen does not load Firestore.
 * IndexedDB cache shared by all tabs, so a reload re-reads only changed documents (D33).
 */
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
