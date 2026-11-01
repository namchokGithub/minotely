import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "@/features/auth/login-page";
import { RequireAuth } from "@/features/auth/require-auth";
import { AppLayout } from "./app-layout";

// BASE_URL is "/" locally and "/<repo>/" on GitHub Pages (see D3).
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      // Children render nothing: AppLayout reads the URL and picks the panels.
      children: [
        { index: true, element: null },
        { path: "books/:bookId", element: null },
        { path: "books/:bookId/notes/:noteId", element: null },
      ],
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  { basename },
);
