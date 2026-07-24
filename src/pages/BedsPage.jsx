import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

function DetailField({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <p className="text-sm font-medium text-slate-800 dark:text-white">{value || '-'}</p>
    </div>
  );
}

export default function BedsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ roomId: '', label: '', rentAmount: '0' });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => (await api.get('/tenant/rooms')).data.data,
  });

  const { data: beds, isLoading } = useQuery({
    queryKey: ['beds', search],
    queryFn: async () => (await api.get('/tenant/beds', { params: { search, limit: 50 } })).data,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['bed-detail', selectedId],
    queryFn: async () => (await api.get(`/tenant/beds/${selectedId}`)).data.data,
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/beds', payload),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['beds'] }); 
      setOpen(false);
      setForm({ roomId: '', label: '', rentAmount: '0' });
      setErrors({});
    },
    onError: (error) => {
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => { fieldErrors[err.field] = err.message; });
        setErrors(fieldErrors);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tenant/beds/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beds'] }),
  });

  const items = beds?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    const payload = {
      roomId: form.roomId,
      label: form.label.trim(),
      rentAmount: parseFloat(form.rentAmount) || 0,
    };
    if (!payload.roomId) { setErrors({ roomId: 'Please select a room' }); return; }
    if (!payload.label) { setErrors({ label: 'Bed label is required' }); return; }
    createMutation.mutate(payload);
  };

  const handleRowClick = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div>
      <PageHeader title="Beds" description="Manage beds within rooms" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Bed</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Bed</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Room</Label>
                  <Select value={form.roomId} onValueChange={(value) => setForm({ ...form, roomId: value })}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>{rooms?.map((r) => (<SelectItem key={r.id} value={r.id}>{r.floor?.building?.name || ''} - {r.floor?.name} - {r.name} ({r.number})</SelectItem>))}</SelectContent>
                  </Select>
                  {errors.roomId && <p className="text-sm text-red-500">{errors.roomId}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Bed Label</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="A1" />
                  <p className="text-xs text-slate-400">Bed identifier (auto-uppercase)</p>
                  {errors.label && <p className="text-sm text-red-500">{errors.label}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Rent Amount (₹)</Label>
                  <Input type="number" min="0" step="100" value={form.rentAmount} onChange={(e) => setForm({ ...form, rentAmount: e.target.value })} />
                  {errors.rentAmount && <p className="text-sm text-red-500">{errors.rentAmount}</p>}
                </div>
              </div>
              {createMutation.error && Object.keys(errors).length === 0 && (
                <p className="text-sm text-red-500">{createMutation.error.response?.data?.message || 'Failed to create bed'}</p>
              )}
              <DialogFooter><Button type="submit" disabled={createMutation.isPending}>Create Bed</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search beds..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Label</TableHead><TableHead>Rent</TableHead><TableHead>Status</TableHead><TableHead>Resident</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No beds yet. Create a room first.</TableCell></TableRow>
              : items.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => handleRowClick(b.id)}>
                  <TableCell>{b.room?.name} ({b.room?.number})</TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-white">{b.label}</TableCell>
                  <TableCell>₹{b.rentAmount}</TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                  <TableCell>{b.residents?.[0]?.firstName || '-'}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(b.id); }}><Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bed Details</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-slate-400">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-5">
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Location</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Building" value={detailData.room?.floor?.building?.name} />
                  <DetailField label="Floor" value={detailData.room?.floor?.name} />
                  <DetailField label="Room" value={detailData.room?.name} />
                  <DetailField label="Bed Label" value={detailData.label} />
                </div>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Rent Amount" value={formatCurrency(detailData.rentAmount)} />
                  <DetailField label="Status" value={detailData.status} />
                </div>
              </div>
              {detailData.residents && detailData.residents.length > 0 && (
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Current Resident</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <DetailField label="Name" value={`${detailData.residents[0].firstName} ${detailData.residents[0].lastName}`} />
                    <DetailField label="Phone" value={detailData.residents[0].phone} />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
