import { useEffect } from 'react';
import { DoorOpen, DoorClosed, Smile, Fingerprint as FingerprintIcon, KeyRound, Camera, Lock, Unlock } from 'lucide-react';

import { toast } from 'sonner';
import { useLockStore } from '@/store/lockStore';

export function DashboardPage() {
  const { doorStatus, stats, isLoading, apiBaseURL, fetchState, fetchStats } = useLockStore();

  useEffect(() => {
    fetchState();
    fetchStats(7);
  }, [fetchState, fetchStats]);

  const getMethodIcon = (method: 'face' | 'fingerprint' | 'keypad') => {
    switch (method) {
      case 'face':
        return <Smile className="w-5 h-5" />;
      case 'fingerprint':
        return <FingerprintIcon className="w-5 h-5" />;
      case 'keypad':
        return <KeyRound className="w-5 h-5" />;
    }
  };

  const getMethodLabel = (method: 'face' | 'fingerprint' | 'keypad') => {
    switch (method) {
      case 'face':
        return 'Khuôn mặt';
      case 'fingerprint':
        return 'Vân tay';
      case 'keypad':
        return 'Keypad';
    }
  };

  const lastLog = stats?.recent_logs[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Tổng quan hệ thống khóa cửa thông minh</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Door Status Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg">Trạng thái cửa</h3>
            {doorStatus === 'unlocked' ? (
              <DoorOpen className="w-6 h-6 text-warning" />
            ) : (
              <DoorClosed className="w-6 h-6 text-success" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${doorStatus === 'unlocked' ? 'bg-warning' : 'bg-success'} animate-pulse`} />
            <span className="text-2xl capitalize">
              {doorStatus === 'unlocked' ? 'Đang mở' : 'Đang đóng'}
            </span>
          </div>
        </div>

        {/* Last Access Method Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg">Phương thức mở gần nhất</h3>
            {lastLog && (
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                {getMethodIcon(lastLog.access_method)}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-2xl">{lastLog ? getMethodLabel(lastLog.access_method) : 'Chưa có'}</p>
            <p className="text-sm text-muted-foreground">
              {lastLog ? new Date(lastLog.timestamp).toLocaleString('vi-VN') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg">Truy cập (7 ngày)</h3>
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl">{stats?.total_accesses || 0} lần</p>
            <p className="text-sm text-muted-foreground">
              {stats?.successful_accesses || 0} thành công
            </p>
          </div>
        </div>
      </div>

      {/* Control & Camera Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-xl mb-6">Điều khiển cửa</h3>

          <div className="space-y-4">
            <button
              disabled={isLoading || doorStatus === 'unlocked'}
              className="w-full flex items-center justify-center gap-3 bg-success hover:bg-success/90 text-success-foreground py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                useLockStore.getState().setDoorStatus('unlocked')
                  .then(() => toast.success('Đã gửi lệnh mở cửa'))
                  .catch(() => toast.error('Lỗi mở cửa'));
              }}
            >
              <Unlock className="w-5 h-5" />
              <span>{isLoading ? 'Đang xử lý...' : 'Mở cửa'}</span>
            </button>

            <button
              disabled={isLoading || doorStatus === 'locked'}
              className="w-full flex items-center justify-center gap-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                useLockStore.getState().setDoorStatus('locked')
                  .then(() => toast.success('Đã gửi lệnh đóng cửa'))
                  .catch(() => toast.error('Lỗi đóng cửa'));
              }}
            >
              <Lock className="w-5 h-5" />
              <span>{isLoading ? 'Đang xử lý...' : 'Đóng cửa'}</span>
            </button>
          </div>

          {/* Access Methods Info */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">Phương thức truy cập:</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg">
                <Smile className="w-6 h-6 text-primary" />
                <span className="text-xs">Khuôn mặt</span>
                <span className="text-xs font-bold">{stats?.by_method.face || 0}</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg">
                <FingerprintIcon className="w-6 h-6 text-secondary" />
                <span className="text-xs">Vân tay</span>
                <span className="text-xs font-bold">{stats?.by_method.fingerprint || 0}</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg">
                <KeyRound className="w-6 h-6 text-accent" />
                <span className="text-xs">Keypad</span>
                <span className="text-xs font-bold">{stats?.by_method.keypad || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Preview */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl">Camera trực tiếp</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-sm">Live</span>
            </div>
          </div>

          {/* Camera Feed Placeholder */}
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <img
              src={`${apiBaseURL}/api/video/stream`}
              alt="Live Stream"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.querySelector('.placeholder')?.classList.remove('hidden');
              }}
            />
            <div className="placeholder hidden absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <Camera className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Không có tín hiệu Camera (Chưa kết nối Backend)</p>
              </div>
            </div>

            {/* Camera overlay info */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg">
                <p className="text-white text-sm">Cửa chính</p>
              </div>
              <div className="bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg">
                <p className="text-white text-sm">{new Date().toLocaleTimeString('vi-VN')}</p>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
