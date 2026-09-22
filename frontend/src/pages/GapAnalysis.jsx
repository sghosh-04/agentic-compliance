import React, { useEffect, useState } from 'react';
import { 
  GitCompare, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  Calendar,
  ShieldAlert,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../services/api';

export default function GapAnalysis() {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  const toggleCard = (id) => setSelectedCard(prev => prev === id ? null : id);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiFetch('/reports/gap-analyses');
        setGaps(data);
      } catch (err) {
        setError(err.message || 'Failed to load gap analysis logs.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white p-8 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Header Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-500" />
            <span>Audit Gap Analysis & Risk Controls</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated multi-agent operational gap audits and risk remediation</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            Total Audits: <strong className="text-slate-900">{gaps.length}</strong>
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Gap Analysis Cards List */}
      <div className="space-y-6">
        {gaps.map((gap) => {
          const isSelected = selectedCard === `gap-${gap.id}`;
          const isMitigated = gap.status === 'Mitigated';
          const isInProgress = gap.status === 'In_Progress';

          return (
            <div 
              key={gap.id}
              onClick={() => toggleCard(`gap-${gap.id}`)}
              tabIndex={0}
              className={`rounded-3xl p-6 outline-none bg-white border border-slate-200/90 shadow-sm dash-card dash-card-amber space-y-5 transition-all cursor-pointer ${
                isSelected ? 'dash-card-active' : ''
              }`}
            >
              {/* Header Info Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <GitCompare className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 tracking-wide">Gap Audit ID: #{gap.id}</h4>
                    <p className="text-[11px] font-bold text-slate-600 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Audited: {new Date(gap.created_at).toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-3.5 py-1 rounded-full font-black uppercase tracking-wider ${
                    isMitigated ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    isInProgress ? 'bg-amber-50/80 text-amber-800 border border-amber-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {gap.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* 3 Sub-Cards Grid (Findings, Risk Assessment, Recommendations) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Auditor Findings Card */}
                <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2.5 dash-card dash-card-rose">
                  <div className="flex items-center gap-2 text-xs font-black text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Auditor Findings</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                    {gap.findings}
                  </p>
                </div>

                {/* Impact Risk Assessment Card */}
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2.5 dash-card dash-card-amber">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                    <Activity className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Impact Risk Assessment</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                    {gap.risk_assessment}
                  </p>
                </div>

                {/* Mitigation Recommendations Card */}
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 dash-card dash-card-emerald">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mitigation Recommendations</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                    {gap.recommendations}
                  </p>
                </div>

              </div>
            </div>
          );
        })}

        {gaps.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <GitCompare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No gap analyses have been recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Upload a circular to trigger automatic multi-agent gap auditing.</p>
          </div>
        )}
      </div>

    </div>
  );
}
