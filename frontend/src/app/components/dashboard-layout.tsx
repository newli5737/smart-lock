import { ReactNode } from 'react';
import {
  LayoutDashboard,
  Smile,
  CreditCard,
  KeyRound,
  History,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/app/components/auth-context';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'face-entry', label: 'Ra/Vào khuôn mặt', icon: Smile },
    { id: 'rfid-entry', label: 'Ra/Vào RFID', icon: CreditCard },
    { id: 'face-register', label: 'Đăng ký khuôn mặt', icon: Smile },
    { id: 'keypad', label: 'Mật khẩu Keypad', icon: KeyRound },
    { id: 'history', label: 'Lịch sử ra vào', icon: History },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">Smart Lock</h2>
            <p className="text-xs text-muted-foreground">IoT System</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

interface HeaderProps {
  deviceOnline: boolean;
}

export function Header({ deviceOnline }: HeaderProps) {
  const { logout, username } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 hover:bg-muted rounded-lg"
        >
          {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Title */}
        <div className="flex-1">
          <h1 className="text-xl text-foreground">Hệ thống khóa cửa thông minh</h1>
        </div>

        {/* Device Status & User Actions */}
        <div className="flex items-center gap-4">
          {/* Device Status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            {deviceOnline ? (
              <>
                <Wifi className="w-5 h-5 text-success" />
                <span className="text-sm text-success">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-destructive" />
                <span className="text-sm text-destructive">Offline</span>
              </>
            )}
          </div>

          {/* User Info */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>{username}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  deviceOnline: boolean;
}

export function DashboardLayout({ children, currentPage, onNavigate, deviceOnline }: DashboardLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:block">
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header deviceOnline={deviceOnline} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
