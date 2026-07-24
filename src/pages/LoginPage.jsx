import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Loader2, Building2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/tenant/login', { email, password });
      setAuth(data.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex premium-bg">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-sm" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-400/10 blur-sm" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-blue-300/5" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm font-bold text-2xl border border-white/20 shadow-xl">E</div>
          <span className="text-2xl font-bold tracking-tight">EzeHub</span>
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium border border-white/10 mb-6">
            <Building2 className="h-4 w-4" /> Tenant Portal
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">Manage Your Accommodation Business</h1>
          <p className="text-lg text-white/75 leading-relaxed">Residents, rent, complaints, staff, finance — everything in one place for PGs, hostels, co-living, and more.</p>
        </div>
        <p className="text-sm text-white/50 relative z-10">Secure tenant access</p>
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 glass-card premium-shadow">
          <CardHeader>
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <Home className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">EzeHub</span>
            </div>
            <CardTitle className="text-2xl text-slate-800 dark:text-white">Sign in</CardTitle>
            <CardDescription>Access your accommodation management dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="glass-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="glass-input" />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 rounded-xl h-11 font-semibold transition-all duration-200" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
