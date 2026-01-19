
import { Trash2, Plus, Smile, Pencil } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { userService, User } from '@/api/userService';
import { faceService } from '@/api/faceService';

export function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newUserName, setNewUserName] = useState('');

    // Face Capture logic
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<File | null>(null);
    const [isFaceSubmitting, setIsFaceSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (error) {
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async () => {
        if (!newUserName.trim()) return;
        try {
            const newUser = await userService.createUser(newUserName);
            setUsers([...users, newUser]);
            setIsCreateModalOpen(false);
            setNewUserName('');
            toast.success('Đã tạo người dùng mới');
        } catch (error) {
            toast.error('Lỗi khi tạo người dùng');
        }
    };

    const handleUpdateUser = async () => {
        if (!selectedUser || !newUserName.trim()) return;
        try {
            const updated = await userService.updateUser(selectedUser.id, newUserName);
            setUsers(users.map(u => u.id === updated.id ? updated : u));
            setIsEditModalOpen(false);
            setSelectedUser(null);
            setNewUserName('');
            toast.success('Đã cập nhật người dùng');
        } catch (error) {
            toast.error('Lỗi khi cập nhật');
        }
    };

    const handleDeleteUser = async (id: number, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa "${name}"? Dữ liệu vân tay và khuôn mặt sẽ bị xóa.`)) {
            return;
        }

        try {
            await userService.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            toast.success(`Đã xóa người dùng ${name}`);
        } catch (error) {
            toast.error('Không thể xóa người dùng');
        }
    };

    // --- Face Registration ---
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraActive(true);
        } catch (err) {
            toast.error("Không thể truy cập camera");
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCameraActive(false);
    };

    const captureImage = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

            canvas.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                    setCapturedImage(file);
                    stopCamera();
                }
            }, 'image/jpeg');
        }
    };

    const handleRegisterFace = async () => {
        if (!selectedUser || !capturedImage) return;
        try {
            setIsFaceSubmitting(true);
            await faceService.register(selectedUser.id, capturedImage);
            toast.success("Đăng ký khuôn mặt thành công");
            setIsFaceModalOpen(false);
            setCapturedImage(null);
            fetchUsers(); // Refresh counts
        } catch (error) {
            toast.error("Đăng ký thất bại");
        } finally {
            setIsFaceSubmitting(false);
        }
    };



    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Quản lý người dùng</h1>
                    <p className="text-muted-foreground">Tạo user trước, sau đó thêm vân tay/khuôn mặt.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" />
                    Thêm người dùng
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground w-16">ID</th>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Tên</th>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Dữ liệu</th>
                                <th className="text-right py-4 px-6 font-medium text-muted-foreground">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8">{isLoading ? 'Đang tải...' : 'Chưa có người dùng'}</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="border-t border-border hover:bg-muted/50">
                                        <td className="py-4 px-6 text-sm">#{user.id}</td>
                                        <td className="py-4 px-6 font-medium">{user.name}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-1 rounded text-xs ${user.fingerprints_count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                                                    {user.fingerprints_count} Vân tay
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs ${user.faces_count > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
                                                    {user.faces_count > 0 ? 'Đã có Face' : 'Chưa có Face'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right space-x-2">

                                            <button
                                                onClick={() => { setSelectedUser(user); setIsFaceModalOpen(true); }}
                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded" title="Thêm khuôn mặt"
                                            >
                                                <Smile className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(user); setNewUserName(user.name); setIsEditModalOpen(true); }}
                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded" title="Sửa tên"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded" title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Thêm người dùng mới</h2>
                        <input
                            className="w-full border p-2 rounded mb-4"
                            placeholder="Nhập tên..."
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded">Hủy</button>
                            <button onClick={handleCreateUser} className="px-4 py-2 bg-primary text-primary-foreground rounded">Tạo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Sửa tên người dùng</h2>
                        <input
                            className="w-full border p-2 rounded mb-4"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded">Hủy</button>
                            <button onClick={handleUpdateUser} className="px-4 py-2 bg-primary text-primary-foreground rounded">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Face Modal */}
            {isFaceModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background p-6 rounded-lg w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Thêm khuôn mặt cho: {selectedUser.name}</h2>

                        {/* File Upload Option */}
                        <div className="mb-4">
                            <label className="block mb-2 font-medium">Tải lên ảnh:</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setCapturedImage(e.target.files[0]);
                                        stopCamera();
                                    }
                                }}
                                className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-violet-50 file:text-violet-700
                                hover:file:bg-violet-100"
                            />
                        </div>

                        <div className="text-center my-2 text-muted-foreground">- Hoặc dùng Camera -</div>


                        {!capturedImage ? (
                            <div className="bg-black aspect-video rounded-lg overflow-hidden mb-4 relative">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                {!isCameraActive && (
                                    <button
                                        onClick={startCamera}
                                        className="absolute inset-0 m-auto w-fit h-fit bg-white/20 px-4 py-2 rounded text-white"
                                    >
                                        Bật Camera
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-black relative">
                                <img src={URL.createObjectURL(capturedImage)} className="w-full h-full object-contain" />
                                <button
                                    onClick={() => setCapturedImage(null)}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                                    title="Xóa ảnh"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => { stopCamera(); setIsFaceModalOpen(false); setCapturedImage(null); }} className="px-4 py-2 border rounded">Hủy</button>

                            {!capturedImage ? (
                                <button onClick={captureImage} disabled={!isCameraActive} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Chụp</button>
                            ) : (
                                <>
                                    <button onClick={handleRegisterFace} disabled={isFaceSubmitting} className="px-4 py-2 bg-primary text-primary-foreground rounded">
                                        {isFaceSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
