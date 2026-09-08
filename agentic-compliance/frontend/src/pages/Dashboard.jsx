import React, { useEffect, useState } from 'react';
import {
  FileText,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
  ChevronDown,
  Check,
} from 'lucide-react';
import { apiFetch } from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Label,
} from 'recharts';

function MiniBarSparkline({ color }) {
  const heights = [30, 55, 40, 70, 50, 80, 60, 90, 65, 100, 75];
  return (
    <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
      {heights.map((h, i) => (
        <rect key={i} x={i * 7.5} y={36 - h * 0.36} width="5" height={h * 0.36} rx="2" fill={color} opacity={0.15 + i * 0.07} />
      ))}
    </svg>
  );
}

function MiniWaveLine({ color }) {
  return (
    <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
      <path d="M0 28 C10 22, 15 10, 25 14 C35 18, 40 6, 50 10 C60 14, 65 4, 80 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CircleProgress({ pct, color = '#10b981' }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} stroke="#e2e8f0" strokeWidth="5" fill="none" />
      <circle cx="32" cy="32" r={r} stroke={color} strokeWidth="5" fill="none" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

function StatusBadge({ status }) {
  const map = {
    Processed:     'bg-emerald-50 text-emerald-600 border border-emerald-200',
    Processing:    'bg-amber-50/80 text-amber-700 border border-amber-200',
    Error:         'bg-rose-50 text-rose-600 border border-rose-200',
    Completed:     'bg-emerald-50 text-emerald-600 border border-emerald-200',
    In_Progress:   'bg-amber-50/80 text-amber-700 border border-amber-200',
    Pending:       'bg-amber-50 text-amber-600 border border-amber-200',
    Under_Review:  'bg-slate-50 text-slate-600 border border-slate-200',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-500 border border-slate-200';
  return <span className={`text-[11px] font-semibold px-3 py-1 rounded-lg whitespace-nowrap ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}

function DocIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
      <FileText className="w-4 h-4 text-emerald-500" />
    </div>
  );
}

function CustomDonutLabel({ viewBox, total }) {
  const { cx, cy } = viewBox;
  return (
    <>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="800" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="#64748b">Total</text>
    </>
  );
}

export default function Dashboard({ setPage }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState('posture');
  const [timeRange, setTimeRange] = useState('This Month');
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  const toggleCard = (id) => setSelectedCard(prev => prev === id ? null : id);

  const TIME_OPTIONS = [
    { label: 'This Month', mult: 1 },
    { label: 'This Quarter (Q2)', mult: 2.2 },
    { label: 'Year to Date (YTD)', mult: 3.5 },
    { label: 'All Time', mult: 4.8 }
  ];

  useEffect(() => {
    apiFetch('/analytics/dashboard')
      .then(setMetrics)
      .catch(err => setError(err.message || 'Failed to load.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="flex-1 flex flex-col items-center justify-center gap-2 text-rose-500"><AlertTriangle className="w-8 h-8" /><span className="text-sm">{error}</span></div>;

  const selectedTimeOption = TIME_OPTIONS.find(o => o.label === timeRange) || TIME_OPTIONS[0];
  const taskBarData = Object.entries(metrics.tasks_by_status).map(([k, v]) => {
    const rawVal = v || 0;
    const computedVal = timeRange === 'This Month' ? rawVal : Math.round(rawVal * selectedTimeOption.mult);
    return {
      name: k.replace(/_/g, ' '),
      value: computedVal,
      key: k
    };
  });
  const BAR_COLORS = { Pending: '#f59e0b', In_Progress: '#ea580c', Under_Review: '#78350f', Completed: '#10b981' };
  const riskEntries = Object.entries(metrics.obligations_by_risk);
  const totalRisk = riskEntries.reduce((s, [, v]) => s + v, 0);
  const RISK_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
  const riskPieData = riskEntries.map(([k, v]) => ({ name: k, value: v }));
  const score = metrics.overall_compliance_score ?? 0;

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="px-8 py-6 space-y-5">

        {/* Top stat cards */}
        <div className="grid grid-cols-4 gap-5">

          {/* Compliance Posture */}
          <div 
            onClick={() => toggleCard('posture')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/posture-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-5 dash-card dash-card-emerald outline-none relative overflow-hidden ${selectedCard === 'posture' ? 'dash-card-active' : ''}`}
          >
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-900 mb-3">Compliance Posture</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black text-slate-900">{score}%</p>
                  <p className="text-xs font-bold text-emerald-800 mt-2">Active tasks met successfully</p>
                </div>
                <CircleProgress pct={score} color="#10b981" />
              </div>
            </div>
          </div>

          {/* Regulations Cataloged */}
          <div 
            onClick={() => toggleCard('regulations')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/regulations-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'right bottom',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-5 dash-card dash-card-orange outline-none relative overflow-hidden ${selectedCard === 'regulations' ? 'dash-card-active' : ''}`}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Regulations Cataloged</p>
                <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center"><FileText className="w-4 h-4 text-orange-600" /></div>
              </div>
              <p className="text-4xl font-black text-slate-900 mb-1">{metrics.total_regulations}</p>
              <button onClick={(e) => { e.stopPropagation(); setPage('regulations'); }} className="flex items-center gap-1 text-[12px] font-bold text-orange-700 hover:text-orange-900 transition">View catalog <ArrowRight className="w-3.5 h-3.5" /></button>
              <div className="mt-3"><MiniBarSparkline color="#ea580c" /></div>
            </div>
          </div>

          {/* Extracted Obligations */}
          <div 
            onClick={() => toggleCard('obligations')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/obligations-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'right bottom',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-5 dash-card dash-card-amber outline-none relative overflow-hidden ${selectedCard === 'obligations' ? 'dash-card-active' : ''}`}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-950">Extracted Obligations</p>
                <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-amber-700" /></div>
              </div>
              <p className="text-4xl font-black text-amber-950 mb-1">{metrics.total_obligations}</p>
              <button onClick={(e) => { e.stopPropagation(); setPage('obligations'); }} className="flex items-center gap-1 text-[12px] font-bold text-amber-800 hover:text-amber-950 transition">Audit matrix <ArrowRight className="w-3.5 h-3.5" /></button>
              <div className="mt-3"><MiniWaveLine color="#d97706" /></div>
            </div>
          </div>

          {/* Compliance Gaps */}
          <div 
            onClick={() => toggleCard('gaps')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/gaps-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'right bottom',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-5 dash-card dash-card-rose outline-none relative overflow-hidden ${selectedCard === 'gaps' ? 'dash-card-active' : ''}`}
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-950">Compliance Gaps</p>
                <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-rose-600" /></div>
              </div>
              <p className="text-4xl font-black text-rose-950 mb-1">{metrics.gaps_count}</p>
              <button onClick={(e) => { e.stopPropagation(); setPage('gap'); }} className="flex items-center gap-1 text-[12px] font-bold text-rose-700 hover:text-rose-950 transition">Resolve gaps <ArrowRight className="w-3.5 h-3.5" /></button>
              <div className="mt-3"><MiniBarSparkline color="#ef4444" /></div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-5">

          {/* Bar chart */}
          <div 
            onClick={() => toggleCard('tasks-chart')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/tasks-chart-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-6 dash-card dash-card-amber outline-none relative overflow-hidden ${selectedCard === 'tasks-chart' ? 'dash-card-active' : ''}`}
          >
            {/* Light ambient tint to keep image prominent and crisp */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-white/20 z-0 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black text-slate-900">Scheduled Compliance Tasks status</h3>
                <div className="flex items-center gap-2 relative">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setTimeDropdownOpen(prev => !prev); 
                    }} 
                    className="flex items-center gap-1.5 border border-slate-300/90 bg-white/95 hover:bg-white rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <span>{timeRange}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${timeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu Popover */}
                  {timeDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => { e.stopPropagation(); setTimeDropdownOpen(false); }} 
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {TIME_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTimeRange(opt.label);
                              setTimeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                              timeRange === opt.label 
                                ? 'font-black text-orange-600 bg-orange-50/80' 
                                : 'font-semibold text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {timeRange === opt.label && <Check className="w-3.5 h-3.5 text-orange-600" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <button onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskBarData} barSize={42} margin={{ top: 18, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={11} fontWeight={700} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis stroke="#475569" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 12, fontSize: 12, fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 12, fontWeight: 800, fill: '#0f172a' }}>
                      {taskBarData.map((entry, i) => <Cell key={i} fill={BAR_COLORS[entry.key] || '#ea580c'} stroke="#ffffff" strokeWidth={2} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Donut chart */}
          <div 
            onClick={() => toggleCard('risk-chart')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/risk-chart-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'right center',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-6 flex flex-col dash-card dash-card-rose outline-none relative overflow-hidden ${selectedCard === 'risk-chart' ? 'dash-card-active' : ''}`}
          >
            {/* Ambient light layer */}
            <div className="absolute inset-0 bg-white/40 z-0 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              <h3 className="text-sm font-black text-slate-900">Obligation Risk profile</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1 mb-4">Distribution of statutory obligations by calculated impact risk.</p>
              <div className="flex items-center justify-between flex-1">
                <div className="space-y-4">
                  {riskPieData.map(({ name, value }) => {
                    const pct = totalRisk > 0 ? Math.round((value / totalRisk) * 100) : 0;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: RISK_COLORS[name] || '#ea580c' }} />
                        <span className="text-sm font-bold text-slate-800 w-24">{name} Risk</span>
                        <span className="text-xs font-semibold text-slate-500">{value} {value === 1 ? 'item' : 'items'}</span>
                        <span className="text-sm font-black text-slate-900 ml-1">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                        {riskPieData.map(({ name }, i) => <Cell key={i} fill={RISK_COLORS[name] || '#ea580c'} stroke="#ffffff" strokeWidth={2} />)}
                        <Label content={<CustomDonutLabel total={totalRisk} />} position="center" />
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1.5px solid #cbd5e1', borderRadius: 12, fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom lists row */}
        <div className="grid grid-cols-2 gap-5 pb-4">

          {/* Recent Circular Uploads */}
          <div 
            onClick={() => toggleCard('recent-circulars')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/recent-circulars-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'right top',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-6 dash-card dash-card-orange outline-none relative overflow-hidden ${selectedCard === 'recent-circulars' ? 'dash-card-active' : ''}`}
          >
            {/* Ambient light wash to keep circular rows crisp and readable */}
            <div className="absolute inset-0 bg-white/60 z-0 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black text-slate-900">Recent Circular uploads</h3>
                <button onClick={(e) => { e.stopPropagation(); setPage('regulations'); }} className="flex items-center gap-1 text-[12px] font-bold text-orange-700 hover:text-orange-900 transition">View catalog <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
              <div className="space-y-1">
                {metrics.recent_regulations.slice(0, 3).map((reg) => (
                  <div key={reg.id} className="flex items-center gap-3 py-2.5 border-b border-slate-200/60 last:border-0 bg-white/75 px-3 rounded-xl mb-1.5 shadow-sm border border-slate-100/80">
                    <DocIcon />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{reg.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Source: {reg.source}&nbsp;&nbsp;|&nbsp;&nbsp;Date: {reg.published_date}</p>
                    </div>
                    <StatusBadge status={reg.status} />
                    <button onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-slate-600 shrink-0"><MoreVertical className="w-4 h-4" /></button>
                  </div>
                ))}
                {metrics.recent_regulations.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No regulations cataloged yet.</p>}
              </div>
            </div>
          </div>

          {/* Action Items Watchlist */}
          <div 
            onClick={() => toggleCard('action-watchlist')}
            tabIndex={0} 
            style={{
              backgroundImage: 'url(/assets/action-items-bg.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
            className={`rounded-2xl p-6 dash-card dash-card-emerald outline-none relative overflow-hidden ${selectedCard === 'action-watchlist' ? 'dash-card-active' : ''}`}
          >
            {/* Ambient light wash */}
            <div className="absolute inset-0 bg-white/50 z-0 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-black text-slate-900">Action items watchlist</h3>
                <button onClick={(e) => { e.stopPropagation(); setPage('tasks'); }} className="flex items-center gap-1 text-[12px] font-bold text-emerald-800 hover:text-emerald-950 transition">Task Board <ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
              <div className="space-y-1">
                {metrics.recent_tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-slate-200/60 last:border-0 bg-white/75 px-3 rounded-xl mb-1.5 shadow-sm border border-slate-100/80">
                    <DocIcon />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{task.title}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Due: {task.due_date}&nbsp;&nbsp;|&nbsp;&nbsp;Priority: {task.priority}</p>
                    </div>
                    <StatusBadge status={task.status} />
                    <button onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-slate-600 shrink-0"><MoreVertical className="w-4 h-4" /></button>
                  </div>
                ))}
                {metrics.recent_tasks.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No compliance tasks assigned.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
