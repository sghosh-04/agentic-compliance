import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { apiFetch } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('officer');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: formData,
      });

      localStorage.setItem('token', data.access_token);
      
      // Fetch profile details
      const userProfile = await apiFetch('/auth/me');
      localStorage.setItem('username', userProfile.username);
      localStorage.setItem('role', userProfile.role);
      
      onLoginSuccess(userProfile);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.14),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a)] p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_30%,rgba(255,255,255,0.03))]" />
      <div className="absolute top-10 left-10 h-40 w-40 rounded-full bg-slate-500/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950/70 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-600/20 via-slate-900/70 to-amber-600/20 p-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-400/30 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-200">
                <Sparkles className="h-3.5 w-3.5" />
                AI Compliance Hub
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">Secure compliance, simplified.</h1>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">
                  Monitor obligations, evidence, and governance tasks from one intelligent control center.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <div className="mb-3 flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Trusted by compliance teams
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Live task monitoring and risk visibility</li>
                <li>• AI assistance for regulatory questions</li>
                <li>• Evidence-backed reporting workflows</li>
              </ul>
            </div>
          </div>

          <div className="p-8 sm:p-10 lg:p-12">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-500/30 bg-slate-600/20 shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                <ShieldCheck className="h-7 w-7 text-slate-300" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-400">Sign in to continue to your compliance workspace</p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="officer or admin"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-slate-500/50 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-slate-500/50 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-all duration-300 shadow-md shadow-orange-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </button>

            </form>

            <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 text-center text-[11px] leading-6 text-slate-400">
              Seeded users: <span className="font-semibold text-slate-200">officer</span> / <span className="font-semibold text-slate-200">admin</span>
              <br />
              Password for both: <span className="font-semibold text-slate-200">password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
