import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "@/features/auth/login-page";
import { ProtectedApp } from "./protected-app";

// Clean URLs: Firebase Hosting rewrites every path to index.html (D19).
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <ProtectedApp />,
    // Children render nothing: AppLayout reads the URL and picks the panels.
    children: [
      { index: true, element: null },
      { path: "books/:bookId", element: null },
      { path: "books/:bookId/notes/:noteId", element: null },
      { path: "trash", element: null },
      { path: "notes", element: null },
      { path: "settings", element: null },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
