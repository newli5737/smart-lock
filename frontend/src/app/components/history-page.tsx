import { useState, useEffect } from 'react';
import { History, Smile, Fingerprint, KeyRound, Check, X, Filter, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { logsService } from '@/api';
import type { AccessLog } from '@/types';
import { toast } from 'sonner';

export function HistoryPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [accessType, setAccessType] = useState<string>('all');

  // Pagination
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    fetchLogs();
  }, [offset, selectedMethod, selectedStatus, accessType]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit, offset };

      if (selectedMethod !== 'all') params.method = selectedMethod;
      if (selectedStatus !== 'all') params.success = selectedStatus === 'success';
      if (accessType !== 'all') params.access_type = accessType;

      const result = await logsService.getLogs(params);
      setLogs(result.logs);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Không thể tải nhật ký ra vào');
    } finally {
      setIsLoading(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'face':
        return <Smile className="w-4 h-4" />;
      case 'fingerprint':
        return <Fingerprint className="w-4 h-4" />;
      case 'keypad':
        return <KeyRound className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'face': return 'Khuôn mặt';
      case 'fingerprint': return 'Vân tay';
      case 'keypad': return 'Keypad';
      default: return method;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'face': return 'bg-primary/10 text-primary';
      case 'fingerprint': return 'bg-secondary/10 text-secondary';
      case 'keypad': return 'bg-accent/10 text-accent';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Thời gian', 'Tên người dùng', 'Phương thức', 'Hành động', 'Trạng thái'],
      ...logs.map(log => [
        new Date(log.timestamp).toLocaleString('vi-VN'),
        log.user_name || 'Không xác định',
        getMethodLabel(log.access_method),
        log.access_type === 'entry' ? 'Vào' : 'Ra',
        log.success ? 'Thành công' : 'Thất bại'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lich-su-ra-vao-${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Lịch sử ra vào</h1>
          <p className="text-muted-foreground">Theo dõi tất cả hoạt động ra vào</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Xuất dữ liệu
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg">Bộ lọc</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Method Filter */}
          <div>
            <label className="block mb-2 text-sm">Theo phương thức</label>
            <select
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setOffset(0);
              }}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tất cả</option>
              <option value="face">Khuôn mặt</option>
              <option value="fingerprint">Vân tay</option>
              <option value="keypad">Keypad</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block mb-2 text-sm">Theo trạng thái</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setOffset(0);
              }}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tất cả</option>
              <option value="success">Thành công</option>
              <option value="failed">Thất bại</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block mb-2 text-sm">Loại truy cập</label>
            <select
              value={accessType}
              onChange={(e) => {
                setAccessType(e.target.value);
                setOffset(0);
              }}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tất cả</option>
              <option value="entry">Vào</option>
              <option value="exit">Ra</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={() => fetchLogs()}
              disabled={isLoading}
              className="w-full h-[50px] bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left py-4 px-6">Thời gian</th>
                <th className="text-left py-4 px-6">Tên người dùng</th>
                <th className="text-left py-4 px-6">Phương thức</th>
                <th className="text-left py-4 px-6">Hành động</th>
                <th className="text-left py-4 px-6">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-6 text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-4 px-6">
                    <span className={!log.success ? 'text-muted-foreground' : ''}>
                      {log.user_name || 'Không xác định'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getMethodColor(log.access_method)}`}>
                      {getMethodIcon(log.access_method)}
                      <span className="text-sm">{getMethodLabel(log.access_method)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm">
                      {log.access_type === 'entry' ? 'Vào' : 'Ra'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {log.success ? (
                      <div className="flex items-center gap-2 text-success">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Thành công</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-destructive">
                        <X className="w-4 h-4" />
                        <span className="text-sm">Thất bại</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && logs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Không có dữ liệu phù hợp với bộ lọc</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Hiển thị {offset + 1}-{Math.min(offset + limit, total)} trong số {total} kết quả
              </p>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="p-2 border border-border rounded hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm mx-2">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="p-2 border border-border rounded hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
