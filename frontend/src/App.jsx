import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import AppRoutes from "./routes/AppRoutes";
import { AuthContext } from "./contexts/AuthContext";
import GlobalSnackbar from "./components/GlobalSnackbar";


export default function App() {
  const { tier, loading, accountInfo } = useContext(AuthContext);
  const location = useLocation();

  const isAuthPage = ["/login", "/register", "/forgot-password"].some((path) =>
    location.pathname.startsWith(path)
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        🔄 Loading user data...
      </div>
    );
  }

  return (
    <>
      {isAuthPage ? (
        <AppRoutes />
      ) : (
        <Layout tier={tier} accountInfo={accountInfo}>
          <AppRoutes />
        </Layout>
      )}
      <GlobalSnackbar />
    </>
  );
}
