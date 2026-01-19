import { Trash2, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { userService, User } from '@/api';

export function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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

    const handleDeleteUser = async (id: number, name: string) => {
        if (!confirm(`Bạn có chắc muốn xóa người dùng "${name}"? Tất cả vân tay và khuôn mặt của người này sẽ bị xóa.`)) {
            return;
        }

        try {
            await userService.deleteUser(id);
            toast.success(`Đã xóa người dùng ${name}`);
            fetchUsers();
        } catch (error) {
            toast.error('Không thể xóa người dùng');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl mb-2">Quản lý người dùng</h1>
                <p className="text-muted-foreground">Danh sách người dùng và các phương thức xác thực đã đăng ký</p>
            </div>

            {/* Users Table */}
            <div className="bg-card border border-border rounded-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground">ID</th>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Tên người dùng</th>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Vân tay</th>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Khuôn mặt</th>
                                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Ngày tạo</th>
                                <th className="text-right py-4 px-6 font-medium text-muted-foreground">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                                        {isLoading ? 'Đang tải...' : 'Chưa có người dùng nào'}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                                        <td className="py-4 px-6 text-sm">#{user.id}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <UserIcon className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="font-medium">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.fingerprints_count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.fingerprints_count} vân tay
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.faces_count > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.faces_count} khuôn mặt
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                title="Xóa người dùng"
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
        </div>
    );
}
