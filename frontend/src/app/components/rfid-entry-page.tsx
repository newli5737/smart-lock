import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Check, X, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { rfidService } from '@/api';
import type { RFIDCard } from '@/types';

export function RFIDEntryPage() {
  const [rfidCards, setRfidCards] = useState<RFIDCard[]>([]);
  const [scanStatus, setScanStatus] = useState<'waiting' | 'success' | 'denied'>('waiting');
  const [isScanning, setIsScanning] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCardId, setNewCardId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const cards = await rfidService.getCards();
      setRfidCards(cards);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      toast.error('Không thể tải danh sách thẻ RFID');
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanStatus('waiting');

    // Simulation of manual card entry for testing
    // In production, this would be triggered by WebSocket/Event from backend
    const mockCardUid = "TEST-CARD-" + Math.floor(Math.random() * 1000);

    try {
      const result = await rfidService.verify(mockCardUid);
      if (result.success) {
        setScanStatus('success');
        toast.success(result.message);
      } else {
        setScanStatus('denied');
        toast.error(result.message);
      }
    } catch (error: any) {
      setScanStatus('denied');
      toast.error(error.response?.data?.detail || 'Lỗi xác thực thẻ');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddCard = async () => {
    if (!newCardId || !newUserName) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setIsLoading(true);
    try {
      await rfidService.register(newCardId, newUserName);
      toast.success(`Đã thêm thẻ ${newCardId}`);
      setNewCardId('');
      setNewUserName('');
      setShowAddModal(false);
      fetchCards();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Không thể thêm thẻ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (id: number, cardId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thẻ ${cardId}?`)) return;

    try {
      await rfidService.deleteCard(id);
      toast.success(`Đã xóa thẻ ${cardId}`);
      fetchCards();
    } catch (error: any) {
      toast.error('Không thể xóa thẻ');
    }
  };

  const filteredCards = rfidCards.filter(card =>
    card.card_uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Ra/Vào bằng RFID</h1>
        <p className="text-muted-foreground">Quản lý thẻ RFID và trạng thái quẹt thẻ</p>
      </div>

      {/* Scan Status */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-xl mb-4">Trạng thái quẹt thẻ</h3>

        <div className="flex items-center justify-center min-h-[200px]">
          {scanStatus === 'waiting' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <CreditCard className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-xl mb-2">Đang chờ quẹt thẻ...</p>
              <p className="text-sm text-muted-foreground">Đưa thẻ RFID vào đầu đọc</p>
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang quét...
                  </>
                ) : 'Mô phỏng quẹt thẻ'}
              </button>
            </div>
          )}

          {scanStatus === 'success' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-12 h-12 text-success" />
              </div>
              <p className="text-xl text-success mb-2">Thành công!</p>
              <p className="text-sm text-muted-foreground mb-4">Thẻ hợp lệ - Đã mở cửa</p>
              <button
                onClick={() => setScanStatus('waiting')}
                className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Quét lại
              </button>
            </div>
          )}

          {scanStatus === 'denied' && (
            <div className="text-center">
              <div className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-12 h-12 text-destructive" />
              </div>
              <p className="text-xl text-destructive mb-2">Từ chối!</p>
              <p className="text-sm text-muted-foreground mb-4">Thẻ không hợp lệ hoặc lỗi xác thực</p>
              <button
                onClick={() => setScanStatus('waiting')}
                className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RFID Cards Management */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl">Danh sách thẻ đã đăng ký</h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm thẻ RFID
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo mã thẻ hoặc tên..."
              className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Cards Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">Mã thẻ</th>
                <th className="text-left py-3 px-4">Tên người dùng</th>
                <th className="text-left py-3 px-4">Ngày đăng ký</th>
                <th className="text-left py-3 px-4">Trạng thái</th>
                <th className="text-right py-3 px-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono">{card.card_uid}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">{card.user_name}</td>
                  <td className="py-4 px-4 text-muted-foreground">
                    {new Date(card.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${card.is_active
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                      {card.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDeleteCard(card.id, card.card_uid)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCards.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {isLoading ? 'Đang tải...' : 'Không tìm thấy thẻ nào'}
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl mb-4">Thêm thẻ RFID mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block mb-2">Mã thẻ RFID</label>
                <input
                  type="text"
                  value={newCardId}
                  onChange={(e) => setNewCardId(e.target.value)}
                  placeholder="VD: RFID-123456"
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2">Tên người dùng</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nhập tên người dùng"
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddCard}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang thêm...
                    </>
                  ) : 'Thêm thẻ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
