import { lazy, Suspense } from "react";
import { Spinner } from "@/components/spinner";
import { RequireAuth } from "@/features/auth/require-auth";

// The signed-in app (Firestore, editor) loads after sign-in, not on the login screen.
const AppLayout = lazy(() =>
  import("./app-layout").then((m) => ({ default: m.AppLayout })),
);

export function ProtectedApp() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="flex h-dvh items-center justify-center text-muted-foreground">
            <Spinner className="size-5" />
          </div>
        }
      >
        <AppLayout />
      </Suspense>
    </RequireAuth>
  );
}
