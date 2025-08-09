// src/components/PermissionRoute.tsx
import { useContext } from "react";
import { Outlet } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthContextType } from "../interfaces/auth";

type Props = { required: string };

export default function PermissionRoute({ required }: Props): JSX.Element {
  const { permissions, loading } = useContext(AuthContext) as AuthContextType;

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

  return <Outlet />; // renders child route if allowed
}
