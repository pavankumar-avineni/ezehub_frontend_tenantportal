import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function DetailField({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <p className="text-sm font-medium text-slate-800 dark:text-white">{value || '-'}</p>
    </div>
  );
}

export default function FloorsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ buildingId: '', name: '', number: '' });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: async () => (await api.get('/tenant/buildings')).data.data,
  });

  const { data: floors, isLoading } = useQuery({
    queryKey: ['floors', search],
    queryFn: async () => (await api.get('/tenant/floors', { params: { search, limit: 50 } })).data,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['floor-detail', selectedId],
    queryFn: async () => (await api.get(`/tenant/floors/${selectedId}`)).data.data,
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/floors', payload),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['floors'] }); 
      setOpen(false);
      setForm({ buildingId: '', name: '', number: '' });
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
    mutationFn: (id) => api.delete(`/tenant/floors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['floors'] }),
  });

  const items = floors?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    const payload = {
      buildingId: form.buildingId,
      name: form.name.trim(),
      number: parseInt(form.number, 10),
    };
    if (!payload.buildingId) { setErrors({ buildingId: 'Please select a building' }); return; }
    if (!payload.name) { setErrors({ name: 'Floor name is required' }); return; }
    if (isNaN(payload.number) || payload.number < 0) { setErrors({ number: 'Floor number must be 0 or higher' }); return; }
    createMutation.mutate(payload);
  };

  const handleRowClick = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div>
      <PageHeader title="Floors" description="Manage building floors" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Floor</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Floor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Building</Label>
                  <Select value={form.buildingId} onValueChange={(value) => setForm({ ...form, buildingId: value })}>
                    <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                    <SelectContent>{buildings?.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>))}</SelectContent>
                  </Select>
                  {errors.buildingId && <p className="text-sm text-red-500">{errors.buildingId}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Floor Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ground Floor" />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Floor Number</Label>
                  <Input type="number" min="0" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="0" />
                  {errors.number && <p className="text-sm text-red-500">{errors.number}</p>}
                </div>
              </div>
              {createMutation.error && Object.keys(errors).length === 0 && (
                <p className="text-sm text-red-500">{createMutation.error.response?.data?.message || 'Failed to create floor'}</p>
              )}
              <DialogFooter><Button type="submit" disabled={createMutation.isPending}>Create Floor</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search floors..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Building</TableHead><TableHead>Name</TableHead><TableHead>Number</TableHead><TableHead>Rooms</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No floors yet. Create a building first.</TableCell></TableRow>
              : items.map((f) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => handleRowClick(f.id)}>
                  <TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" /><span className="text-slate-700 dark:text-slate-300">{f.building?.name || '-'}</span></div></TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-white">{f.name}</TableCell>
                  <TableCell>{f.number}</TableCell>
                  <TableCell>{f._count?.rooms ?? 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(f.id); }}>
                      <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Floor Details</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-slate-400">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-5">
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">General</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Building" value={detailData.building?.name} />
                  <DetailField label="Floor Name" value={detailData.name} />
                  <DetailField label="Floor Number" value={detailData.number} />
                  <DetailField label="Rooms Count" value={detailData._count?.rooms ?? detailData.rooms?.length ?? 0} />
                </div>
              </div>
              {detailData.rooms && detailData.rooms.length > 0 && (
                <div>
                  <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Rooms</p>
                  <div className="space-y-1">
                    {detailData.rooms.map((room) => (
                      <div key={room.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="font-medium text-slate-800 dark:text-white">{room.name} ({room.number})</span>
                        <span className="text-slate-500">Capacity: {room.capacity}</span>
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
