import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AppRoutes from './routes/AppRoutes';
import { AuthContext } from './contexts/AuthContext';
import type { AuthContextType } from './interfaces/auth';
import GlobalSnackbar from './components/GlobalSnackbar';
import AssistantFloater from './components/assistant/AssistantFloater';

export default function App(): JSX.Element {
  const { tier, loading } = useContext(AuthContext) as AuthContextType;
  const location = useLocation();

  const isAuthPage = ['/login', '/register', '/forgot-password'].some(path =>
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
        <>
          <Layout tier={tier as any}>
            <AppRoutes />
          </Layout>
          <AssistantFloater />
        </>
      )}
      <GlobalSnackbar />
    </>
  );
}
