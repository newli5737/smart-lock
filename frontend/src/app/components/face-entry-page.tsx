import { useState } from 'react';
import { Camera, User, Shield, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useLockStore } from '@/store/lockStore';

export function FaceEntryPage() {
  const [isStreamActive, setIsStreamActive] = useState(true);
  const [streamError, setStreamError] = useState(false);

  const { mode, doorStatus } = useLockStore();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const streamUrl = `${apiBaseUrl}/api/video/face-recognition`;

  const handleStreamError = () => {
    setStreamError(true);
  };

  const handleStreamLoad = () => {
    setStreamError(false);
  };

  const handleRefresh = () => {
    setStreamError(false);
    setIsStreamActive(false);
    setTimeout(() => setIsStreamActive(true), 500);
  };



  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Ra/Vào bằng khuôn mặt</h1>
        <p className="text-muted-foreground">Đưa mặt vào khung vuông để mở cửa tự động</p>
      </div>

      {/* Status Bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${mode === 'entry_exit'
              ? 'bg-success/20 text-success'
              : 'bg-warning/20 text-warning'
              }`}>
              <Shield className="w-4 h-4" />
              {mode === 'entry_exit' ? 'Chế độ Ra/Vào' : 'Chế độ Đăng ký'}
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${doorStatus === 'locked'
              ? 'bg-primary/20 text-primary'
              : 'bg-success/20 text-success'
              }`}>
              {doorStatus === 'locked' ? (
                <>
                  <XCircle className="w-4 h-4" />
                  Cửa đóng
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Cửa mở
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Làm mới stream"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Stream with Face Recognition */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="relative aspect-video bg-black">
          {isStreamActive && !streamError ? (
            <img
              src={streamUrl}
              alt="Face Recognition Stream"
              className="w-full h-full object-contain"
              onError={handleStreamError}
              onLoad={handleStreamLoad}
            />
          ) : streamError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <Camera className="w-16 h-16 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4">Không thể kết nối camera</p>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <RefreshCw className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Đang kết nối camera...</p>
              </div>
            </div>
          )}
        </div>


      </div>

      {/* Instructions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-xl mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Hướng dẫn sử dụng
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <p className="font-medium mb-1">Đứng trước camera</p>
            <p className="text-sm text-muted-foreground">Đảm bảo đủ ánh sáng</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <p className="font-medium mb-1">Đưa mặt vào khung</p>
            <p className="text-sm text-muted-foreground">Khung sẽ chuyển xanh khi nhận diện</p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <p className="font-medium mb-1">Chờ mở cửa</p>
            <p className="text-sm text-muted-foreground">Cửa tự động mở khi nhận diện thành công</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-accent mb-1">Thông tin cooldown</p>
            <p className="text-accent/80">
              Sau khi mở cửa thành công, hệ thống sẽ tạm dừng nhận diện 5 giây để tránh mở lặp lại nhiều lần.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
