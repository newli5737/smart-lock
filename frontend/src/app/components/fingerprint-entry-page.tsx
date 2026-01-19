import { useState, useEffect } from 'react';
import { Fingerprint as FingerprintIcon, Plus, Trash2, Check, X, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { fingerprintService } from '@/api';
import { websocketService } from '@/services/websocket';
import type { Fingerprint } from '@/types/index';

export function FingerprintEntryPage() {
    const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
    const [scanStatus, setScanStatus] = useState<'waiting' | 'success' | 'denied'>('waiting');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFingerprintId, setNewFingerprintId] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newFingerPosition, setNewFingerPosition] = useState('1');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [enrollmentStatus, setEnrollmentStatus] = useState<string>('');

    useEffect(() => {
        fetchFingerprints();

        // Subscribe to WebSocket messages
        const unsubscribe = websocketService.onMessage((message: any) => {
            if (message.type === 'enrollment_success') {
                toast.success(message.message);
                setEnrollmentStatus('');
                setScanStatus('success'); // Show success UI
                fetchFingerprints(); // Refresh list
            } else if (message.type === 'enrollment_failed') {
                toast.error(message.message);
                setEnrollmentStatus('');
                setScanStatus('denied'); // Show error UI
            } else if (message.type === 'enrollment_status') {
                // Update enrollment status display
                setEnrollmentStatus(message.message);
                setScanStatus('waiting');
            } else if (message.type === 'scan_success') {
                toast.success(message.message);
                setScanStatus('success');
            } else if (message.type === 'scan_failed') {
                toast.error(message.message);
                setScanStatus('denied');
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const fetchFingerprints = async () => {
        try {
            const prints = await fingerprintService.getPrints();
            setFingerprints(prints);
        } catch (error) {
            console.error('Failed to fetch fingerprints:', error);
            toast.error('Không thể tải danh sách vân tay');
        }
    };



    const handleAddFingerprint = async () => {
        if (!newFingerprintId || !newUserName) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        const fingerprintId = parseInt(newFingerprintId);
        const fingerPosition = parseInt(newFingerPosition);

        if (isNaN(fingerprintId) || fingerprintId < 1 || fingerprintId > 127) {
            toast.error('Fingerprint ID phải từ 1-127');
            return;
        }

        if (isNaN(fingerPosition) || fingerPosition < 1 || fingerPosition > 10) {
            toast.error('Vị trí ngón tay phải từ 1-10');
            return;
        }

        setIsLoading(true);
        try {
            await fingerprintService.enroll(fingerprintId, newUserName, fingerPosition);
            toast.success(`Đã thêm vân tay ID ${fingerprintId}`);
            setNewFingerprintId('');
            setNewUserName('');
            setNewFingerPosition('1');
            setShowAddModal(false);
            fetchFingerprints();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Không thể thêm vân tay');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteFingerprint = async (id: number, fingerprintId: number) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa vân tay ID ${fingerprintId}?`)) return;

        try {
            await fingerprintService.deletePrint(id);
            toast.success(`Đã xóa vân tay ID ${fingerprintId}`);
            fetchFingerprints();
        } catch (error: any) {
            toast.error('Không thể xóa vân tay');
        }
    };

    const handleGetSensorList = async () => {
        try {
            const result = await fingerprintService.getSensorPrints();

            if (result.success && result.fingerprints) {
                const fpList = result.fingerprints.map((id: number) => `ID: ${id}`).join(', ');
                alert(`Danh sách vân tay trong AS608 sensor:\n\nTổng số: ${result.count}\n\n${fpList || 'Không có vân tay nào'}`);
            } else {
                toast.info(result.message);
            }
        } catch (error) {
            toast.error('Lỗi lấy danh sách vân tay từ sensor');
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ vân tay khỏi cả database và AS608 sensor?')) {
            return;
        }

        try {
            const result = await fingerprintService.clearAll();
            toast.success(result.message);
            await fetchFingerprints();
        } catch (error) {
            toast.error('Lỗi xóa vân tay');
        }
    };

    const getFingerName = (position: number): string => {
        const fingers = ['Ngón cái', 'Ngón trỏ', 'Ngón giữa', 'Ngón áp út', 'Ngón út'];
        const hand = position <= 5 ? 'Tay phải' : 'Tay trái';
        const finger = fingers[(position - 1) % 5];
        return `${hand} - ${finger}`;
    };

    const filteredFingerprints = fingerprints.filter(fp =>
        fp.fingerprint_id.toString().includes(searchTerm) ||
        fp.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl mb-2">Ra/Vào bằng vân tay</h1>
                <p className="text-muted-foreground">Quản lý vân tay và trạng thái xác thực</p>
            </div>

            {/* Scan Status */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-xl mb-4">Trạng thái quét vân tay</h3>

                <div className="flex items-center justify-center min-h-[200px]">
                    {enrollmentStatus ? (
                        <div className="text-center">
                            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <FingerprintIcon className="w-12 h-12 text-primary" />
                            </div>
                            <p className="text-lg text-primary mb-2">{enrollmentStatus}</p>
                            <p className="text-sm text-muted-foreground">Vui lòng làm theo hướng dẫn</p>
                        </div>
                    ) : scanStatus === 'waiting' ? (
                        <div className="text-center">
                            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <FingerprintIcon className="w-12 h-12 text-muted-foreground" />
                            </div>
                            <p className="text-xl mb-2">Chạm vân tay để mở cửa</p>
                            <p className="text-sm text-muted-foreground">Cảm biến luôn hoạt động</p>
                        </div>
                    ) : scanStatus === 'success' ? (
                        <div className="text-center">
                            <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-12 h-12 text-success" />
                            </div>
                            <p className="text-xl text-success mb-2">Thành công!</p>
                            <p className="text-sm text-muted-foreground mb-4">Vân tay hợp lệ - Đã mở cửa</p>
                            <button
                                onClick={() => setScanStatus('waiting')}
                                className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    ) : scanStatus === 'denied' ? (
                        <div className="text-center">
                            <div className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <X className="w-12 h-12 text-destructive" />
                            </div>
                            <p className="text-xl text-destructive mb-2">Từ chối!</p>
                            <p className="text-sm text-muted-foreground mb-4">Vân tay không hợp lệ hoặc lỗi xác thực</p>
                            <button
                                onClick={() => setScanStatus('waiting')}
                                className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Fingerprints Management */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl">Danh sách vân tay đã đăng ký</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGetSensorList}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Lấy danh sách AS608
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Xóa tất cả
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm vân tay
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm theo ID hoặc tên..."
                            className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Fingerprints Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-3 px-4">ID Vân tay</th>
                                <th className="text-left py-3 px-4">Tên người dùng</th>
                                <th className="text-left py-3 px-4">Ngón tay</th>
                                <th className="text-left py-3 px-4">Ngày đăng ký</th>
                                <th className="text-left py-3 px-4">Trạng thái</th>
                                <th className="text-right py-3 px-4">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFingerprints.map((fp) => (
                                <tr key={fp.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <FingerprintIcon className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-mono">#{fp.fingerprint_id}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">{fp.user_name}</td>
                                    <td className="py-4 px-4 text-muted-foreground">{getFingerName(fp.finger_position)}</td>
                                    <td className="py-4 px-4 text-muted-foreground">
                                        {new Date(fp.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 rounded-full text-sm ${fp.is_active
                                            ? 'bg-success/10 text-success'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {fp.is_active ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleDeleteFingerprint(fp.id, fp.fingerprint_id)}
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

                    {filteredFingerprints.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            {isLoading ? 'Đang tải...' : 'Không tìm thấy vân tay nào'}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Fingerprint Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl mb-4">Thêm vân tay mới</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block mb-2">ID Vân tay (1-127)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="127"
                                    value={newFingerprintId}
                                    onChange={(e) => setNewFingerprintId(e.target.value)}
                                    placeholder="VD: 1"
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

                            <div>
                                <label className="block mb-2">Ngón tay</label>
                                <select
                                    value={newFingerPosition}
                                    onChange={(e) => setNewFingerPosition(e.target.value)}
                                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pos => (
                                        <option key={pos} value={pos}>{getFingerName(pos)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAddFingerprint}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Đang thêm...
                                        </>
                                    ) : 'Thêm vân tay'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
