import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { AuthProvider } from "@/features/auth/auth-provider";
import { router } from "./router";
import { useApplyTheme } from "./use-apply-theme";

const queryClient = new QueryClient();

export function App() {
  useApplyTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
