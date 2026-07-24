import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

function DetailField({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <p className="text-sm font-medium text-slate-800 dark:text-white">{value || '-'}</p>
    </div>
  );
}

export default function RoomsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ buildingId: '', floorId: '', name: '', number: '', capacity: '1', rentAmount: '0' });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => (await api.get('/tenant/buildings', { params: { limit: 100 } })).data.data,
  });

  const { data: allFloors } = useQuery({
    queryKey: ['floors-all'],
    queryFn: async () => (await api.get('/tenant/floors', { params: { limit: 200 } })).data.data,
  });

  const filteredFloors = useMemo(() => {
    if (!form.buildingId || !allFloors) return allFloors || [];
    return allFloors.filter(f => f.buildingId === form.buildingId);
  }, [form.buildingId, allFloors]);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', search],
    queryFn: async () => (await api.get('/tenant/rooms', { params: { search, limit: 50 } })).data,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['room-detail', selectedId],
    queryFn: async () => (await api.get(`/tenant/rooms/${selectedId}`)).data.data,
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/rooms', payload),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['rooms'] }); 
      setOpen(false);
      setForm({ buildingId: '', floorId: '', name: '', number: '', capacity: '1', rentAmount: '0' });
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
    mutationFn: (id) => api.delete(`/tenant/rooms/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });

  const items = rooms?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    const payload = {
      floorId: form.floorId,
      name: form.name.trim(),
      number: form.number.trim(),
      capacity: parseInt(form.capacity, 10),
      rentAmount: parseFloat(form.rentAmount) || 0,
    };
    if (!form.buildingId) { setErrors({ buildingId: 'Please select a building' }); return; }
    if (!payload.floorId) { setErrors({ floorId: 'Please select a floor' }); return; }
    if (!payload.name) { setErrors({ name: 'Room name is required' }); return; }
    if (!payload.number) { setErrors({ number: 'Room number is required' }); return; }
    if (isNaN(payload.capacity) || payload.capacity < 1) { setErrors({ capacity: 'Capacity must be at least 1' }); return; }
    createMutation.mutate(payload);
  };

  const handleRowClick = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div>
      <PageHeader title="Rooms" description="Manage rooms within floors" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Room</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Room</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Building</Label>
                  <select className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all" value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: e.target.value, floorId: '' })}>
                    <option value="">Select building</option>
                    {(buildings || []).map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                  </select>
                  {errors.buildingId && <p className="text-sm text-red-500">{errors.buildingId}</p>}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Floor</Label>
                  <Select value={form.floorId} onValueChange={(value) => setForm({ ...form, floorId: value })} disabled={!form.buildingId}>
                    <SelectTrigger><SelectValue placeholder={form.buildingId ? "Select floor" : "Select a building first"} /></SelectTrigger>
                    <SelectContent>{filteredFloors.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name} (Floor {f.number})</SelectItem>))}</SelectContent>
                  </Select>
                  {errors.floorId && <p className="text-sm text-red-500">{errors.floorId}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Room Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Room 101" />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Room Number</Label>
                  <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="101" />
                  {errors.number && <p className="text-sm text-red-500">{errors.number}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Capacity (Beds)</Label>
                  <Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                  {errors.capacity && <p className="text-sm text-red-500">{errors.capacity}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Rent Amount (₹)</Label>
                  <Input type="number" min="0" step="100" value={form.rentAmount} onChange={(e) => setForm({ ...form, rentAmount: e.target.value })} />
                </div>
              </div>
              {createMutation.error && Object.keys(errors).length === 0 && (
                <p className="text-sm text-red-500">{createMutation.error.response?.data?.message || 'Failed to create room'}</p>
              )}
              <DialogFooter><Button type="submit" disabled={createMutation.isPending}>Create Room</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search rooms..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Building</TableHead><TableHead>Floor</TableHead><TableHead>Name</TableHead><TableHead>Number</TableHead><TableHead>Capacity</TableHead><TableHead>Rent</TableHead><TableHead>Beds</TableHead><TableHead className="w-[80px]">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No rooms yet. Create a floor first.</TableCell></TableRow>
              : items.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => handleRowClick(r.id)}>
                  <TableCell className="font-semibold text-slate-800 dark:text-white">{r.floor?.building?.name || '-'}</TableCell>
                  <TableCell>{r.floor?.name}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.number}</TableCell>
                  <TableCell>{r.capacity}</TableCell>
                  <TableCell>₹{r.rentAmount}</TableCell>
                  <TableCell>{r._count?.beds ?? 0}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Room Details</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-slate-400">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-5">
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Location</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Building" value={detailData.floor?.building?.name} />
                  <DetailField label="Floor" value={detailData.floor?.name} />
                  <DetailField label="Room Name" value={detailData.name} />
                  <DetailField label="Room Number" value={detailData.number} />
                </div>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Capacity" value={detailData.capacity} />
                  <DetailField label="Rent Amount" value={formatCurrency(detailData.rentAmount)} />
                  <DetailField label="Status" value={detailData.status} />
                  <DetailField label="Beds Count" value={detailData._count?.beds ?? detailData.beds?.length ?? 0} />
                </div>
              </div>
              {detailData.beds && detailData.beds.length > 0 && (
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Beds</p>
                  <div className="space-y-1">
                    {detailData.beds.map((bed) => (
                      <div key={bed.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="font-medium text-slate-800 dark:text-white">{bed.label}</span>
                        <StatusBadge status={bed.status} />
                      </div>
                    ))}
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
