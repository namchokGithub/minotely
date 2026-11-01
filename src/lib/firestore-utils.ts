import { Timestamp } from "firebase/firestore";

/** Firestore Timestamp (estimated while a write is pending) to Date. */
export function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : new Date(0);
}
