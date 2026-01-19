import { Save, RefreshCw, Shield, Server } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useLockStore } from '@/store/lockStore';

export function SettingsPage() {
  const { config, fetchConfig, updateConfig, isLoading } = useLockStore();

  const [formData, setFormData] = useState({
    face_similarity_threshold: 0.7,
    uart_port: 'COM6',
    uart_baudrate: 115200,
  });

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setFormData({
        face_similarity_threshold: config.face_similarity_threshold,
        uart_port: config.uart_port,
        uart_baudrate: config.uart_baudrate,
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig(formData);
      toast.success('Cài đặt đã được lưu thành công');
    } catch (error) {
      console.error('updateConfig failed:', error);
    }
  };

  const handleForceUpdate = async () => {
    await fetchConfig();
    toast.success('Đã tải lại cấu hình từ server');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Cài đặt hệ thống</h1>
        <p className="text-muted-foreground">Cấu hình thiết bị và hệ thống backend</p>
      </div>

      {/* Backend Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl">Kết nối & Phần cứng</h3>
        </div>

        <div className="space-y-5">
          {/* UART Port */}
          <div>
            <label className="block mb-2">Cổng Serial (UART)</label>
            <div className="relative">
              <input
                type="text"
                value={formData.uart_port}
                onChange={(e) => setFormData({ ...formData, uart_port: e.target.value })}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="VD: COM6 hoặc /dev/ttyUSB0"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cổng kết nối với ESP32
            </p>
          </div>

          {/* UART Baudrate */}
          <div>
            <label className="block mb-2">Baudrate</label>
            <select
              value={formData.uart_baudrate}
              onChange={(e) => setFormData({ ...formData, uart_baudrate: parseInt(e.target.value) })}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="9600">9600</option>
              <option value="115200">115200</option>
              <option value="57600">57600</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl">Bảo mật nhận diện</h3>
        </div>

        <div className="space-y-5">
          {/* Face Threshold */}
          <div>
            <label className="block mb-2">Độ chính xác khuôn mặt (0.0 - 1.0)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.4"
                max="0.9"
                step="0.05"
                value={formData.face_similarity_threshold}
                onChange={(e) => setFormData({ ...formData, face_similarity_threshold: parseFloat(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-mono font-bold w-12 text-center">
                {formData.face_similarity_threshold}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Giá trị cao hơn yêu cầu độ chính xác cao hơn nhưng có thể từ chối người dùng hợp lệ. Khuyên dùng: 0.6 - 0.75.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {isLoading ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>

        <button
          onClick={handleForceUpdate}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-4 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          Tải lại
        </button>
      </div>
    </div>
  );
}
