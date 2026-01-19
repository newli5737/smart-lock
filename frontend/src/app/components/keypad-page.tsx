import { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { keypadService } from '@/api';

export function KeypadPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    try {
      const status = await keypadService.hasPassword();
      setHasExistingPassword(status.has_password);
    } catch (error) {
      console.error('Failed to check password status:', error);
    }
  };

  // Password validation
  const passwordRequirements = [
    { label: 'Ít nhất 4 ký tự', met: newPassword.length >= 4 },
    { label: 'Chỉ chứa chữ số', met: /^\d+$/.test(newPassword) },
    { label: 'Mật khẩu khớp', met: newPassword === confirmPassword && newPassword.length > 0 },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasExistingPassword && !currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Mật khẩu mới không đáp ứng yêu cầu');
      return;
    }

    setIsUpdating(true);
    try {
      // First verify current password if it exists
      if (hasExistingPassword) {
        try {
          const verifyResult = await keypadService.verify(currentPassword);
          if (!verifyResult.success) {
            toast.error('Mật khẩu hiện tại không đúng');
            setIsUpdating(false);
            return;
          }
        } catch (error) {
          toast.error('Mật khẩu hiện tại không đúng');
          setIsUpdating(false);
          return;
        }
      }

      // Set new password
      await keypadService.setPassword(newPassword, hasExistingPassword ? currentPassword : undefined);
      toast.success('Cập nhật mật khẩu keypad thành công');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasExistingPassword(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Lỗi cập nhật mật khẩu');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Quản lý mật khẩu Keypad</h1>
        <p className="text-muted-foreground">Cập nhật mật khẩu cho bàn phím số</p>
      </div>

      {/* Password Update Form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl">
              {hasExistingPassword ? 'Cập nhật mật khẩu' : 'Thiết lập mật khẩu mới'}
            </h3>
            <p className="text-sm text-muted-foreground">Thay đổi mật khẩu keypad của bạn</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          {/* Current Password - Only show if password exists */}
          {hasExistingPassword && (
            <div>
              <label htmlFor="currentPassword" className="block mb-2">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {hasExistingPassword && <div className="border-t border-border my-6" />}

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block mb-2">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nhập mật khẩu mới (chỉ số)"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block mb-2">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nhập lại mật khẩu mới"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium mb-3">Yêu cầu mật khẩu:</p>
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${req.met ? 'bg-success' : 'bg-muted-foreground/20'
                    }`}>
                    {req.met && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${req.met ? 'text-success' : 'text-muted-foreground'}`}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUpdating || (!currentPassword && hasExistingPassword) || !isPasswordValid}
            className="w-full py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              'Cập nhật mật khẩu'
            )}
          </button>
        </form>
      </div>

      {/* Additional Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg mb-4">Thông tin bổ sung</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Mật khẩu được mã hóa:</span>
            <span className="text-success">✓ SHA-256</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Trạng thái:</span>
            <span className={hasExistingPassword ? 'text-success' : 'text-warning'}>
              {hasExistingPassword ? 'Đã thiết lập' : 'Chưa thiết lập'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
