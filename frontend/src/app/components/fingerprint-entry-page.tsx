import { useState, useEffect } from 'react';
import { Fingerprint as FingerprintIcon, Check, X, Search, RefreshCw, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { fingerprintService } from '@/api';
import { useSocket } from '@/context/socket-context';
import type { Fingerprint } from '@/types/index';
import { userService, User } from '@/api/userService';

export function FingerprintEntryPage() {
    const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
    const [scanStatus, setScanStatus] = useState<'waiting' | 'success' | 'denied'>('waiting');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [enrollmentStatus, setEnrollmentStatus] = useState<string>('');

    const { subscribe } = useSocket();

    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [isEnrollSubmitting, setIsEnrollSubmitting] = useState(false);

    useEffect(() => {
        fetchFingerprints();
        fetchUsers();

        // Subscribe to WebSocket messages
        const unsubscribe = subscribe((message: any) => {
            if (message.type === 'enrollment_success') {
                toast.success(message.message);
                setEnrollmentStatus('');
                setScanStatus('success');
                setIsEnrollModalOpen(false);
                fetchFingerprints();
            } else if (message.type === 'enrollment_failed') {
                toast.error(message.message);
                setEnrollmentStatus('');
                setScanStatus('denied');
            } else if (message.type === 'enrollment_status') {
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

    const fetchUsers = async () => {
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    const fetchFingerprints = async () => {
        try {
            setIsLoading(true);
            const prints = await fingerprintService.getPrints();
            setFingerprints(prints);
        } catch (error) {
            console.error('Failed to fetch fingerprints:', error);
            toast.error('Không thể tải danh sách vân tay');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnrollFingerprint = async () => {
        if (!selectedUser) {
            toast.error('Vui lòng chọn người dùng');
            return;
        }
        try {
            setIsEnrollSubmitting(true);
            await fingerprintService.enroll(selectedUser.id);
            toast.success("Gửi lệnh đăng ký thành công. Vui lòng làm theo hướng dẫn trên LCD/Đèn.");
            // Don't close modal immediately, wait for websocket or manual close? 
            // User requested to have button here.
            // Let's close modal and show status in main view.
            setIsEnrollModalOpen(false);
        } catch (error) {
            toast.error("Gửi lệnh đăng ký thất bại (Bộ nhớ đầy hoặc lỗi kết nối)");
        } finally {
            setIsEnrollSubmitting(false);
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

    const handleRetryEnroll = async (fingerprintId: number) => {
        try {
            setEnrollmentStatus('Đang gửi lệnh đăng ký lại...');
            const result = await fingerprintService.retryEnroll(fingerprintId);
            toast.success(result.message);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Lỗi gửi lệnh đăng ký lại');
            setEnrollmentStatus('');
        }
    };

    const handleDeleteFingerprint = async (fingerprintId: number) => {
        if (!confirm(`Bạn có chắc muốn xóa vân tay ID #${fingerprintId}?`)) return;
        try {
            await fingerprintService.deletePrint(fingerprintId);
            toast.success(`Đã xóa vân tay #${fingerprintId}`);
            fetchFingerprints();
        } catch (error) {
            toast.error('Lỗi xóa vân tay');
        }
    };

    const filteredFingerprints = fingerprints.filter(fp =>
        fp.fingerprint_id.toString().includes(searchTerm) ||
        fp.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl mb-2">Quản lý Vân tay</h1>
                <p className="text-muted-foreground">Giám sát và quản lý vân tay hệ thống</p>
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
                            onClick={() => {
                                setSelectedUser(null);
                                setIsEnrollModalOpen(true);
                            }}
                            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            title="Thêm vân tay mới"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleGetSensorList}
                            className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                            title="Lấy danh sách từ AS608"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                            title="Xóa tất cả vân tay"
                        >
                            <Trash2 className="w-5 h-5" />
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

                                <th className="text-left py-3 px-4">Tên người dùng</th>
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
                                    <td className="py-4 px-4 text-muted-foreground">
                                        {new Date(fp.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 rounded-full text-sm ${fp.is_active
                                            ? 'bg-success/10 text-success'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {fp.is_active ? 'Active' : 'Chưa kích hoạt'}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4 flex gap-2 justify-end">
                                        {!fp.is_active && (
                                            <button
                                                onClick={() => handleRetryEnroll(fp.fingerprint_id)}
                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                                                title="Đăng ký lại (Kích hoạt)"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteFingerprint(fp.fingerprint_id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                            title="Xóa vân tay"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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

            {/* Enroll Fingerprint Modal */}
            {isEnrollModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Thêm vân tay mới</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Chọn người dùng:</label>
                            <select
                                className="w-full p-2 border rounded bg-input text-foreground"
                                onChange={(e) => {
                                    const userId = parseInt(e.target.value);
                                    const user = users.find(u => u.id === userId);
                                    setSelectedUser(user || null);
                                }}
                                value={selectedUser?.id || ''}
                            >
                                <option value="">-- Chọn user --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <p className="mb-4 text-sm text-muted-foreground">
                            Chế độ tự động gán ID vân tay tiếp theo.
                        </p>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEnrollModalOpen(false)} className="px-4 py-2 border rounded">Hủy</button>
                            <button
                                onClick={handleEnrollFingerprint}
                                disabled={isEnrollSubmitting || !selectedUser}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
                            >
                                {isEnrollSubmitting ? 'Đang gửi lệnh...' : 'Bắt đầu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
