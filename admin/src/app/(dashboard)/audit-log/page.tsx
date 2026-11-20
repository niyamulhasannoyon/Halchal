'use client';

import * as React from 'react';
import {
  ScrollText,
  Download,
  Filter,
  Search,
  Eye,
  Calendar,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

interface AuditLogRow {
  id: string;
  at: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ip_hash?: string | null;
  user_agent?: string | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = React.useState('');
  const [entityFilter, setEntityFilter] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // Selected row for detail modal
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRow | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', '100');

      const res = await fetch(`/api/audit-log?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch audit records.');
      } else {
        setLogs(data.logs || []);
      }
    } catch {
      setError('Network error while querying audit log.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, startDate, endDate]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (actionFilter) params.set('action', actionFilter);
    if (entityFilter) params.set('entityType', entityFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('format', 'csv');

    window.location.href = `/api/audit-log?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-emerald-500" />
            Administrative Audit Trail
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            অপরিবর্তনীয় অডিট লগ — সকল মিউটেশন ও কনফিগারেশন পরিবর্তনের রেকর্ড
          </p>
        </div>

        <Button onClick={handleExportCsv} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Audit CSV
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Action Type</label>
              <Input
                placeholder="Filter action (e.g. ADMIN_INVITE)"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Entity Type</label>
              <Input
                placeholder="Filter entity (e.g. admin_user)"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
            <CardHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Record Details</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">ID: {selectedLog.id}</CardDescription>
                </div>
                <Badge variant="outline">{selectedLog.action}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block">Timestamp:</span>
                  <span className="font-medium">{new Date(selectedLog.at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Operator ID:</span>
                  <span className="font-mono font-medium">{selectedLog.admin_id}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Entity:</span>
                  <span className="font-medium">
                    {selectedLog.entity_type} {selectedLog.entity_id ? `(${selectedLog.entity_id})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">IP Hash (SHA-256):</span>
                  <span className="font-mono">{selectedLog.ip_hash || 'N/A'}</span>
                </div>
              </div>

              {selectedLog.reason && (
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Operational Reason (কারণ):
                  </span>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{selectedLog.reason}</p>
                </div>
              )}

              {selectedLog.before && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-zinc-500">State Before Mutation:</span>
                  <pre className="text-xs bg-zinc-900 text-zinc-100 p-3 rounded-lg overflow-x-auto font-mono">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-zinc-500">State After Mutation:</span>
                  <pre className="text-xs bg-zinc-900 text-zinc-100 p-3 rounded-lg overflow-x-auto font-mono">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Querying audit trail...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              No audit records matched the selected query parameters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Admin ID</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(log.at).toLocaleString('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-zinc-400 font-mono block text-[10px] truncate max-w-[120px]">
                          {log.entity_id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-zinc-500 truncate max-w-[120px]">
                      {log.admin_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">
                      {log.reason || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        title="View Full Record"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
