import { Navigate, useLocation, type Location } from "react-router";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-context";

export function LoginPage() {
  const { status, error, signIn } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from;

  if (status === "signed-in") {
    return <Navigate to={from ?? "/"} replace />;
  }

  return (
    <main className="flex h-dvh items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Minotely</h1>
          <p className="text-sm text-muted-foreground">
            Your private notebook.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full"
          disabled={status === "loading"}
          onClick={() => void signIn()}
        >
          Sign in with Google
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
