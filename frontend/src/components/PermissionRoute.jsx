// src/components/PermissionRoute.jsx
import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function PermissionRoute({ required }) {
  const { permissions, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        🔄 Checking permissions...
      </div>
    );
  }

  if (!permissions?.includes(required)) {
    return (
      <div className="h-screen flex items-center justify-center text-xl text-red-600">
        🚫 Access Denied: You don’t have permission to view this page.
      </div>
    );
  }

  return <Outlet />; // <-- important: this renders the child route if allowed
}
