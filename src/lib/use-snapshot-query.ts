import { useEffect, useRef } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { Unsubscribe } from "firebase/firestore";

export type Subscribe<T> = (
  onData: (data: T) => void,
  onError: (error: Error) => void,
) => Unsubscribe;

/**
 * TanStack Query backed by a Firestore realtime listener: the first snapshot
 * resolves the query, later snapshots (other devices, local writes) update the
 * cache in place.
 */
export function useSnapshotQuery<T>(
  queryKey: QueryKey,
  subscribe: Subscribe<T>,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const subscribeRef = useRef(subscribe);
  const keyHash = JSON.stringify(queryKey);

  useEffect(() => {
    subscribeRef.current = subscribe;
  });

  useEffect(() => {
    if (!enabled) return;
    const key = JSON.parse(keyHash) as QueryKey;
    return subscribeRef.current(
      (data) => queryClient.setQueryData(key, data),
      (error) => console.error("Firestore listener failed", key, error),
    );
  }, [keyHash, queryClient, enabled]);

  return useQuery<T>({
    queryKey,
    queryFn: () =>
      new Promise<T>((resolve, reject) => {
        const unsubscribe = subscribe(
          (data) => {
            unsubscribe();
            resolve(data);
          },
          (error) => {
            unsubscribe();
            reject(error);
          },
        );
      }),
    staleTime: Infinity,
    enabled,
  });
}
