import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, User, Check, AlertCircle, RefreshCw, X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { faceService } from '@/api';

export function FaceRegisterPage() {
  const [fullName, setFullName] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'file'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartCamera = () => {
    setIsCameraActive(true);
    setCapturedImage(null);
  };

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setIsCameraActive(false);
      toast.success('Đã chụp ảnh khuôn mặt');
    } else {
      toast.error('Không thể chụp ảnh');
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      toast.success('Đã tải ảnh lên');
    };
    reader.readAsDataURL(file);
  };

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

  const handleRegister = async () => {
    if (!fullName) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }
    if (!capturedImage) {
      toast.error('Vui lòng chụp ảnh khuôn mặt');
      return;
    }

    setIsRegistering(true);
    try {
      const file = dataURLtoFile(capturedImage, 'face-register.jpg');
      await faceService.register(fullName, file);

      toast.success(`Đăng ký thành công cho ${fullName}`);

      // Reset form
      setFullName('');
      setCapturedImage(null);
      setIsCameraActive(false);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Đăng ký thất bại');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Đăng ký khuôn mặt</h1>
        <p className="text-muted-foreground">Thêm người dùng mới vào hệ thống nhận diện</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Information Form */}
        <div className="bg-card border border-border rounded-xl p-6 h-fit">
          <h3 className="text-xl mb-6">Thông tin người dùng</h3>

          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block mb-2 font-medium">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nhập họ và tên người dùng"
                />
              </div>
            </div>

            {/* Status indicators */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${fullName ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {fullName ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <span className={fullName ? 'text-foreground' : 'text-muted-foreground'}>Đã nhập thông tin</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${capturedImage ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {capturedImage ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <span className={capturedImage ? 'text-foreground' : 'text-muted-foreground'}>Đã có ảnh khuôn mặt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Image Capture Method */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-xl mb-6">Ảnh khuôn mặt</h3>

          {/* Method Selection */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => {
                setUploadMethod('camera');
                setCapturedImage(null);
                setIsCameraActive(false);
              }}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${uploadMethod === 'camera'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
                }`}
            >
              <Camera className="w-5 h-5" />
              Chụp từ Camera
            </button>
            <button
              onClick={() => {
                setUploadMethod('file');
                setCapturedImage(null);
                setIsCameraActive(false);
              }}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${uploadMethod === 'file'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
                }`}
            >
              <Upload className="w-5 h-5" />
              Tải ảnh lên
            </button>
          </div>

          {/* Image Preview/Capture Area */}
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden mb-4 border border-border">
            {uploadMethod === 'camera' ? (
              // Camera Mode
              !isCameraActive && !capturedImage ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Camera chưa được kích hoạt</p>
                    <button
                      onClick={handleStartCamera}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Kích hoạt Camera
                    </button>
                  </div>
                </div>
              ) : isCameraActive ? (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: 'user' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-64 border-2 border-primary/70 rounded-full" />
                  </div>
                  <button
                    onClick={() => setIsCameraActive(false)}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : capturedImage ? (
                <div className="relative w-full h-full">
                  <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-success text-success-foreground px-4 py-2 rounded-full flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Đã chụp
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      setIsCameraActive(true);
                    }}
                    className="absolute bottom-4 right-4 px-4 py-2 bg-background/80 hover:bg-background text-foreground rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Chụp lại
                  </button>
                </div>
              ) : null
            ) : (
              // File Upload Mode
              !capturedImage ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6">
                    <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">Chọn ảnh từ máy tính</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Upload className="w-5 h-5" />
                      Chọn ảnh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <img src={capturedImage} alt="Uploaded" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="bg-success text-success-foreground px-4 py-2 rounded-full flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Đã tải lên
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="absolute bottom-4 right-4 px-4 py-2 bg-background/80 hover:bg-background text-foreground rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Chọn lại
                  </button>
                </div>
              )
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {uploadMethod === 'camera' && isCameraActive && (
              <button
                onClick={handleCapture}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Chụp ảnh
              </button>
            )}
            {uploadMethod === 'file' && !capturedImage && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Chọn ảnh từ máy tính
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-accent">Lưu ý khi chụp:</p>
                <ul className="text-accent/80 space-y-1 list-disc list-inside">
                  <li>Đảm bảo đủ ánh sáng</li>
                  <li>Nhìn thẳng vào camera</li>
                  <li>Khuôn mặt nằm trong khung tròn</li>
                  <li>Tháo khẩu trang và kính râm</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Register Button */}
      <div className="bg-card border border-border rounded-xl p-6">
        <button
          onClick={handleRegister}
          disabled={isRegistering || !fullName || !capturedImage}
          className="w-full py-4 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-medium"
        >
          {isRegistering ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Đang đăng ký...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Lưu và Đăng Ký
            </>
          )}
        </button>
      </div>
    </div>
  );
}
