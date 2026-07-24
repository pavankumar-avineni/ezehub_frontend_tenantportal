import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate, formatCurrency } from '@/lib/utils';

function DetailField({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <p className="text-sm font-medium text-slate-800 dark:text-white">{value || '-'}</p>
    </div>
  );
}

export default function StaffPage() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', designation: '', department: 'OPERATIONS', roleId: '', salary: '0', joiningDate: new Date().toISOString().split('T')[0] });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get('/tenant/staff', { params: { limit: 50 } })).data,
  });

  const { data: roles } = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: async () => {
      try {
        const res = await api.get('/tenant/staff');
        return null;
      } catch { return null; }
    },
    enabled: false,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['staff-detail', selectedId],
    queryFn: async () => (await api.get(`/tenant/staff/${selectedId}`)).data.data,
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tenant/staff', payload),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['staff'] }); 
      setOpen(false); 
      setForm({ firstName: '', lastName: '', email: '', phone: '', designation: '', department: 'OPERATIONS', roleId: '', salary: '0', joiningDate: new Date().toISOString().split('T')[0] });
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

  const items = data?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    if (!form.firstName.trim()) { setErrors({ firstName: 'First name is required' }); return; }
    if (!form.lastName.trim()) { setErrors({ lastName: 'Last name is required' }); return; }
    if (!form.email.trim()) { setErrors({ email: 'Email is required' }); return; }
    if (!form.phone.trim() || form.phone.trim().length < 10) { setErrors({ phone: 'Valid phone (10 digits) is required' }); return; }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      designation: form.designation.trim() || undefined,
      department: form.department,
      salary: parseFloat(form.salary) || 0,
      joiningDate: new Date(form.joiningDate).toISOString(),
    };
    if (form.roleId) payload.roleId = form.roleId;
    createMutation.mutate(payload);
  };

  const handleRowClick = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div>
      <PageHeader title="Staff" description="Manage your team and operations" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Add Staff</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />{errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}</div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />{errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}</div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />{errors.email && <p className="text-sm text-red-500">{errors.email}</p>}</div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" />{errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}</div>
                <div className="space-y-2"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Warden, Cook, Guard..." /></div>
                <div className="space-y-2"><Label>Department</Label>
                  <select className="flex h-10 w-full rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    {['OPERATIONS', 'HOUSEKEEPING', 'SECURITY', 'KITCHEN', 'MAINTENANCE', 'ADMIN'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></div>
                <div className="space-y-2"><Label>Monthly Salary (₹)</Label><Input type="number" min="0" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
              </div>
              {createMutation.error && Object.keys(errors).length === 0 && <p className="text-sm text-red-500">{createMutation.error.response?.data?.message || 'Failed to add staff'}</p>}
              <DialogFooter><Button type="submit" disabled={createMutation.isPending}>Add Staff</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Designation</TableHead><TableHead>Department</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No staff members</TableCell></TableRow>
              : items.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => handleRowClick(s.id)}>
                  <TableCell className="font-semibold text-slate-800 dark:text-white">{s.firstName} {s.lastName}</TableCell>
                  <TableCell>{s.designation}</TableCell>
                  <TableCell><span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{s.department}</span></TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Staff Details</DialogTitle></DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-slate-400">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-5">
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Personal Information</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Full Name" value={`${detailData.firstName} ${detailData.lastName}`} />
                  <DetailField label="Email" value={detailData.email} />
                  <DetailField label="Phone" value={detailData.phone} />
                  <DetailField label="Status" value={detailData.status} />
                </div>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider mb-3">Work Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <DetailField label="Designation" value={detailData.designation} />
                  <DetailField label="Department" value={detailData.department} />
                  <DetailField label="Joining Date" value={formatDate(detailData.joiningDate)} />
                  <DetailField label="Salary" value={formatCurrency(detailData.salary)} />
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
