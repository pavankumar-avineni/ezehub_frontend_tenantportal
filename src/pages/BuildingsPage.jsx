import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
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

export default function BuildingsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', state: '', pincode: '', buildingTypeId: '' });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings', search],
    queryFn: async () => (await api.get('/tenant/buildings', { params: { search, limit: 50 } })).data,
  });

  const { data: buildingTypes } = useQuery({
    queryKey: ['building-types'],
    queryFn: async () => (await api.get('/tenant/building-types')).data.data,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['building-detail', selectedId],
    queryFn: async () => (await api.get(`/tenant/buildings/${selectedId}`)).data.data,
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/buildings', payload),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['buildings'] }); 
      setOpen(false);
      setForm({ name: '', code: '', address: '', city: '', state: '', pincode: '', buildingTypeId: '' });
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

  const items = buildings?.data || [];

  const handleRowClick = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div>
      <PageHeader title="Buildings" description="Manage your property structure" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Building</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Building</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); setErrors({}); createMutation.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Building Type</Label>
                  <Select value={form.buildingTypeId} onValueChange={(value) => setForm({ ...form, buildingTypeId: value })} required>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{buildingTypes?.map((bt) => (<SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>))}</SelectContent>
                  </Select>
                  {errors.buildingTypeId && <p className="text-sm text-red-500">{errors.buildingTypeId}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="B1" required />
                  <p className="text-xs text-slate-400">Building identifier</p>
                  {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Building 1" required />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" required />
                  {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                </div>
                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bengaluru" /></div>
                <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Karnataka" /></div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={(e) => { const value = e.target.value.replace(/\D/g, '').slice(0, 6); setForm({ ...form, pincode: value }); }} placeholder="560001" maxLength={6} />
                  <p className="text-xs text-slate-400">6 digits required</p>
                  {errors.pincode && <p className="text-sm text-red-500">{errors.pincode}</p>}
                </div>
              </div>
              {createMutation.error && !errors.buildingTypeId && !errors.code && !errors.name && !errors.address && !errors.pincode && (
                <p className="text-sm text-red-500">{createMutation.error.response?.data?.message || 'Failed to create building'}</p>
              )}
              <DialogFooter><Button type="submit" disabled={createMutation.isPending}>Create Building</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="mb-4 relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search buildings..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>City</TableHead><TableHead>Floors</TableHead><TableHead>Address</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No buildings yet</TableCell></TableRow>
              : items.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => handleRowClick(b.id)}>
                  <TableCell className="font-semibold text-slate-800 dark:text-white">{b.name}</TableCell>
                  <TableCell><span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{b.code}</span></TableCell>
                  <TableCell>{b.city || '-'}</TableCell>
                  <TableCell>{b._count?.floors ?? b.floors?.length ?? 0}</TableCell>
                  <TableCell className="max-w-xs truncate">{b.address || '-'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Building Details</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-slate-400">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-5">
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">General</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Name" value={detailData.name} />
                  <DetailField label="Code" value={detailData.code} />
                  <DetailField label="Type" value={detailData.buildingType?.name} />
                </div>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Address</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Address" value={detailData.address} />
                  <DetailField label="City" value={detailData.city} />
                  <DetailField label="State" value={detailData.state} />
                  <DetailField label="Pincode" value={detailData.pincode} />
                </div>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Occupancy</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Total Floors" value={detailData._count?.floors ?? detailData.floors?.length ?? 0} />
                  <DetailField label="Total Rooms" value={detailData._count?.rooms ?? detailData.totalRooms ?? '-'} />
                  <DetailField label="Total Beds" value={detailData._count?.beds ?? detailData.totalBeds ?? '-'} />
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
