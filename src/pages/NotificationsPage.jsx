import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notice, setNotice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/tenant/notifications', { params: { limit: 50 } })).data,
  });

  const readMutation = useMutation({
    mutationFn: (id) => api.put(`/tenant/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/tenant/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.data?.items)
      ? data.data.items
      : Array.isArray(data?.data?.notifications)
        ? data.data.notifications
        : [];
  const unreadCount = notifications.filter((n) => n.status !== 'READ').length;
  const selected = notifications.find((n) => n.id === selectedNotification) || null;

  const getNotificationTarget = (notification) => {
    const rawUrl = notification?.navigationUrl || notification?.url || notification?.route || notification?.path;
    if (rawUrl && typeof rawUrl === 'string') {
      return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    }

    const entityId = notification?.entityId || notification?.entity_id || notification?.referenceId || notification?.reference_id;
    const entityType = String(notification?.entityType || notification?.entity_type || notification?.module || notification?.type || '').toUpperCase();
    if (!entityId || !entityType) return null;

    const routeMap = {
      MAINTENANCE: '/maintenance',
      COMPLAINT: '/complaints',
      COMPLAINTS: '/complaints',
      RESIDENT: '/residents',
      RESIDENTS: '/residents',
      BUILDING: '/buildings',
      BUILDINGS: '/buildings',
      ROOM: '/rooms',
      ROOMS: '/rooms',
      BED: '/beds',
      BEDS: '/beds',
      RENT: '/rent',
      PAYMENT: '/rent',
      PAYMENT_PROOF: '/rent',
      DOCUMENT: '/documents',
      DOCUMENTS: '/documents',
      VISITOR: '/visitors',
      VISITORS: '/visitors',
      INVENTORY: '/inventory',
      STAFF: '/staff',
    };

    const route = routeMap[entityType];
    return route ? `${route}?selectedId=${encodeURIComponent(entityId)}` : null;
  };

  const handleNotificationClick = async (notification) => {
    setNotice('');
    const target = getNotificationTarget(notification);

    if (!target) {
      setSelectedNotification(notification.id);
      setNotice('This notification does not include a valid destination. It may refer to a deleted record or a notification type that is not yet linked.');
      return;
    }

    try {
      if (notification.status !== 'READ') {
        await readMutation.mutateAsync(notification.id);
      }
      navigate(target, { replace: false });
    } catch {
      setSelectedNotification(notification.id);
      setNotice('We could not open the linked record. It may no longer exist or the destination is unavailable.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        actions={
          unreadCount > 0 && (
            <Button variant="outline" onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )
        }
      />
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Message</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="w-[80px]" /></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : notifications.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No notifications</TableCell></TableRow>
              : notifications.map((n) => (
                <TableRow
                  key={n.id}
                  className={`${n.status !== 'READ' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} cursor-pointer hover:bg-blue-50/80 dark:hover:bg-blue-900/20`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <TableCell className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    {n.status !== 'READ' && <Bell className="h-4 w-4 text-blue-500" />}
                    {n.title}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{n.message}</TableCell>
                  <TableCell><span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{n.channel}</span></TableCell>
                  <TableCell><StatusBadge status={n.status} /></TableCell>
                  <TableCell>{formatDate(n.createdAt)}</TableCell>
                  <TableCell>
                    {n.status !== 'READ' && (
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800" onClick={(e) => { e.stopPropagation(); readMutation.mutate(n.id); }}>Read</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedNotification} onOpenChange={(open) => { if (!open) { setSelectedNotification(null); setNotice(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification link unavailable</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">{notice}</p>
            {selected && (
              <div className="rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-blue-50/60 dark:bg-blue-900/20 p-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">{selected.title}</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{selected.message}</p>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => { setSelectedNotification(null); setNotice(''); }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
