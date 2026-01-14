import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Check, X, Camera, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { faceService } from '@/api';

export function FaceEntryPage() {
  const [entryStatus, setEntryStatus] = useState<'waiting' | 'success' | 'denied' | 'error'>('waiting');
  const [isScanning, setIsScanning] = useState(false);
  const [lastUser, setLastUser] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleScan = useCallback(async () => {
    if (!webcamRef.current) return;

    setIsScanning(true);
    setEntryStatus('waiting');

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        toast.error('Không thể chụp ảnh từ camera');
        setIsScanning(false);
        return;
      }

      const file = dataURLtoFile(imageSrc, 'face-scan.jpg');
      const result = await faceService.verify(file);

      if (result.success) {
        setLastUser(result.user_name || null);
        setEntryStatus('success');
        toast.success(result.message);
      } else {
        setLastUser(null);
        setEntryStatus('denied');
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      setEntryStatus('error');
      toast.error(error.response?.data?.detail || 'Lỗi kết nối đến server');
    } finally {
      setIsScanning(false);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Ra/Vào bằng khuôn mặt</h1>
        <p className="text-muted-foreground">Hệ thống nhận diện khuôn mặt</p>
      </div>

      {/* Face Recognition Status */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-xl mb-6">Trạng thái nhận diện</h3>

        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {entryStatus === 'waiting' || entryStatus === 'error' ? (
            <div className="w-full max-w-md space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: 'user' }}
                />
                <div className="absolute inset-0 border-2 border-primary/50 rounded-lg animate-pulse pointer-events-none" />
              </div>

              <div className="text-center">
                <p className="text-lg mb-4">Vui lòng nhìn vào camera</p>
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Đang xác thực...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      Xác thực khuôn mặt
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {entryStatus === 'success' && (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-16 h-16 text-success" />
              </div>
              <p className="text-2xl text-success mb-2">Nhận diện thành công!</p>
              <p className="text-lg font-bold mb-2">{lastUser}</p>
              <p className="text-sm text-muted-foreground mb-6">Đã mở cửa</p>
              <button
                onClick={() => setEntryStatus('waiting')}
                className="px-8 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Quét lại
              </button>
            </div>
          )}

          {entryStatus === 'denied' && (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-16 h-16 text-destructive" />
              </div>
              <p className="text-2xl text-destructive mb-2">Từ chối truy cập!</p>
              <p className="text-sm text-muted-foreground mb-6">Khuôn mặt không khớp hoặc chưa đăng ký</p>
              <button
                onClick={() => setEntryStatus('waiting')}
                className="px-8 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
