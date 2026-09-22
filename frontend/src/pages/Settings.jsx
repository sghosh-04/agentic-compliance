import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Building2, 
  Check, 
  AlertTriangle,
  HelpCircle,
  Activity
} from 'lucide-react';
import { apiFetch } from '../services/api';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [apiMode, setApiMode] = useState('Mock');
  const [savingKey, setSavingKey] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Organization settings states
  const [orgName, setOrgName] = useState('Antigravity Asset Management');
  const [sector, setSector] = useState('Asset Management / Mutual Funds');
  const [region, setRegion] = useState('India (SEBI/RBI Regulated)');

  const checkHealth = async () => {
    try {
      const data = await apiFetch('/health');
      setApiMode(data.api_mode);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleKeyUpdate = async (e) => {
    e.preventDefault();
    setSavingKey(true);
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch('/settings/config', {
        method: 'POST',
        body: JSON.stringify({ gemini_api_key: apiKey })
      });

      if (res.success) {
        setSuccess('Google Gemini API key updated. Live extraction mode is active.');
      } else {
        setSuccess('API key removed. Running in simulated fallback mode.');
      }
      setApiKey('');
      checkHealth();
    } catch (err) {
      setError(err.message || 'Failed to update API configuration.');
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* API Configurations */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center gap-2.5">
              <Key className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-bold text-white">AI Agent Settings</h3>
            </div>

            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Current API State */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Active Extraction Mode</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {apiMode === 'Live' ? 'Google Gemini 3.5' : 'Simulated Sandbox'}
                </p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                apiMode === 'Live' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
              }`}>
                {apiMode === 'Live' ? 'Live API Key' : 'Sandbox Fallback'}
              </span>
            </div>

            <form onSubmit={handleKeyUpdate} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="Paste your GEMINI_API_KEY (leave empty to disable)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-white focus:outline-none"
                />
                <span className="text-[9px] text-slate-500 block mt-1.5 leading-relaxed">
                  Keys are stored dynamically during the active server session. If key is missing, agents will synthesize mock data based on input text keywords.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingKey}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition duration-200 cursor-pointer shadow-md shadow-orange-500/20"
              >
                {savingKey ? 'Updating Key...' : 'Save Configuration'}
              </button>

            </form>
          </div>
        </div>

        {/* Corporate Profile Settings */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-bold text-white">Compliance Business Profile</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">Industry Segment</label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">Target Jurisdiction</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-white focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => alert('Corporate Profile configurations updated.')}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
