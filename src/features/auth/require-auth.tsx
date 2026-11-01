import type { ReactNode } from "react";
import { Spinner } from "@/components/spinner";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center text-muted-foreground">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (status === "signed-out") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
