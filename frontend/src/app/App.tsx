import { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/app/components/auth-context';
import { LoginPage } from '@/app/components/login-page';
import { DashboardLayout } from '@/app/components/dashboard-layout';
import { DashboardPage } from '@/app/components/dashboard-page';
import { FaceEntryPage } from '@/app/components/face-entry-page';
import { FaceRegisterPage } from '@/app/components/face-register-page';
import { FingerprintEntryPage } from '@/app/components/fingerprint-entry-page';
import { KeypadPage } from '@/app/components/keypad-page';
import { HistoryPage } from '@/app/components/history-page';
import { SettingsPage } from '@/app/components/settings-page';
import { UsersPage } from '@/app/components/users-page';

import { SocketProvider } from '@/context/socket-context';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [deviceOnline] = useState(true);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'face-entry':
        return <FaceEntryPage />;
      case 'face-register':
        return <FaceRegisterPage />;
      case 'fingerprint-entry':
        return <FingerprintEntryPage />;
      case 'keypad':
        return <KeypadPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'users':
        return <UsersPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      deviceOnline={deviceOnline}
    >
      {renderPage()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
        <Toaster position="top-right" richColors />
      </SocketProvider>
    </AuthProvider>
  );
}