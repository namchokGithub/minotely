import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "./auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (status === "signed-out") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
