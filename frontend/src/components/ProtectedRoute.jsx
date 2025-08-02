// src/components/ProtectedRoute.jsx
import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        🔄 Loading user session...
      </div>
    );
  }

  if (!user) {
    console.warn("🔐 No user, redirecting to login.");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
