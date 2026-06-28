import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';

function Main() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading VaultM...</div>;
  return user ? <Dashboard /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Main />
      </ToastProvider>
    </AuthProvider>
  );
}
