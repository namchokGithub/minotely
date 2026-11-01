import { getFirestore } from "firebase/firestore";
import { firebaseApp } from "./firebase";

/** Kept apart from ./firebase so the sign-in screen does not load Firestore. */
export const db = getFirestore(firebaseApp);
