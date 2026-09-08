import React, { useEffect, useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Check, 
  Calendar,
  AlertTriangle,
  Plus,
  Bookmark,
  FileText,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../services/api';

const CARD_THEMES = [
  {
    iconBg: 'bg-orange-50 border-orange-200 text-orange-600',
    titleColor: 'text-orange-600',
    cardClass: 'dash-card-orange',
    accentBorder: 'border-l-orange-500',
  },
  {
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    titleColor: 'text-emerald-600',
    cardClass: 'dash-card-emerald',
    accentBorder: 'border-l-emerald-500',
  },
  {
    iconBg: 'bg-amber-50 border-amber-200 text-amber-700',
    titleColor: 'text-amber-700',
    cardClass: 'dash-card-amber',
    accentBorder: 'border-l-amber-500',
  },
  {
    iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
    titleColor: 'text-rose-600',
    cardClass: 'dash-card-rose',
    accentBorder: 'border-l-rose-500',
  },
];

export default function Obligations() {
  const [obligations, setObligations] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [regulationFilter, setRegulationFilter] = useState('ALL');
  const [selectedCard, setSelectedCard] = useState(null);

  // Quick task modal state
  const [taskModalOb, setTaskModalOb] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDays, setTaskDays] = useState(30);
  const [savingTask, setSavingTask] = useState(false);

  // Reminder modal state
  const [reminderModalOb, setReminderModalOb] = useState(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderDays, setReminderDays] = useState(15);
  const [savingReminder, setSavingReminder] = useState(false);

  const toggleCard = (id) => setSelectedCard(prev => prev === id ? null : id);

  const loadData = async () => {
    try {
      const [obData, regData] = await Promise.all([
        apiFetch('/obligations'),
        apiFetch('/regulations')
      ]);
      setObligations(obData);
      setRegulations(regData.filter(r => r.status === 'Processed'));
    } catch (err) {
      setError(err.message || 'Failed to load obligations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenTaskModal = (ob) => {
    const cleanDesc = ob.description ? ob.description.replace(/Link:\s*https?:\/\/\S+/, '').trim() : '';
    setTaskModalOb(ob);
    setTaskTitle(`Resolve obligation: ${ob.title}`);
    setTaskDesc(`Implement operational check to verify compliance with: ${cleanDesc}`);
    setTaskPriority(ob.risk_level || 'Medium');
  };

  const handleOpenReminderModal = (ob) => {
    setReminderModalOb(ob);
    setReminderTitle(`Compliance deadline reminder for: ${ob.title}`);
    setReminderDesc(`Verify control readiness for obligation requirements.`);
    setReminderDays(15);
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskModalOb) return;

    setSavingTask(true);
    setError('');
    setSuccess('');

    try {
      const fromDays = new Date();
      fromDays.setDate(fromDays.getDate() + parseInt(taskDays));
      const dateStr = fromDays.toISOString().split('T')[0];

      await apiFetch('/compliance/tasks', {
        method: 'POST',
        body: JSON.stringify({
          obligation_id: taskModalOb.id,
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          due_date: dateStr
        })
      });

      setSuccess(`Compliance task scheduled for "${taskModalOb.title}"!`);
      setTaskModalOb(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to schedule task.');
    } finally {
      setSavingTask(false);
    }
  };

  const handleCreateReminderSubmit = async (e) => {
    e.preventDefault();
    if (!reminderModalOb) return;

    setSavingReminder(true);
    setError('');
    setSuccess('');

    try {
      const fromDays = new Date();
      fromDays.setDate(fromDays.getDate() + parseInt(reminderDays));
      const dateStr = fromDays.toISOString();

      await apiFetch('/reminders', {
        method: 'POST',
        body: JSON.stringify({
          obligation_id: reminderModalOb.id,
          title: reminderTitle,
          message: reminderDesc,
          remind_at: dateStr
        })
      });

      setSuccess(`Compliance reminder scheduled for "${reminderModalOb.title}"!`);
      setReminderModalOb(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to schedule reminder.');
    } finally {
      setSavingReminder(false);
    }
  };

  // Filter obligations
  const filtered = useMemo(() => {
    return obligations.filter(ob => {
      const matchesSearch = ob.title?.toLowerCase().includes(search.toLowerCase()) || 
                            ob.description?.toLowerCase().includes(search.toLowerCase()) ||
                            ob.category?.toLowerCase().includes(search.toLowerCase()) ||
                            ob.section_reference?.toLowerCase().includes(search.toLowerCase());
      const matchesRisk = riskFilter === 'ALL' || ob.risk_level?.toUpperCase() === riskFilter.toUpperCase();
      const matchesReg = regulationFilter === 'ALL' || ob.regulation_id === parseInt(regulationFilter);
      return matchesSearch && matchesRisk && matchesReg;
    });
  }, [obligations, search, riskFilter, regulationFilter]);

  // Metrics
  const totalCount = obligations.length;
  const highRiskCount = obligations.filter(o => o.risk_level === 'High').length;
  const medRiskCount = obligations.filter(o => o.risk_level === 'Medium').length;
  const lowRiskCount = obligations.filter(o => o.risk_level === 'Low').length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white p-8 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Total Mapped Obligations */}
        <div 
          onClick={() => toggleCard('stat-total')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-amber outline-none cursor-pointer ${selectedCard === 'stat-total' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Obligations</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Extracted compliance rules</p>
        </div>

        {/* High Risk */}
        <div 
          onClick={() => toggleCard('stat-high')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-rose outline-none cursor-pointer ${selectedCard === 'stat-high' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">High Risk Rules</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-600">{highRiskCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Requires immediate controls</p>
        </div>

        {/* Medium Risk */}
        <div 
          onClick={() => toggleCard('stat-med')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-amber outline-none cursor-pointer ${selectedCard === 'stat-med' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Medium Risk Rules</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-500">{medRiskCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Operational reviews pending</p>
        </div>

        {/* Low Risk */}
        <div 
          onClick={() => toggleCard('stat-low')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-emerald outline-none cursor-pointer ${selectedCard === 'stat-low' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Low Risk Rules</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">{lowRiskCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Standard governance policy</p>
        </div>
      </div>

      {/* Filter and Search Header Bar */}
      <div className="rounded-2xl border border-slate-200/90 p-4 shadow-sm bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search obligations by keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 transition bg-slate-50/50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Regulation Dropdown Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
              <FileText className="w-3.5 h-3.5 text-slate-500" /> Regulation:
            </span>
            <select
              value={regulationFilter}
              onChange={(e) => setRegulationFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 transition bg-white"
            >
              <option value="ALL">All Ingested PDFs</option>
              {regulations.map(reg => (
                <option key={reg.id} value={reg.id}>{reg.title}</option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> Filter Risk:
            </span>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((risk) => {
              const isActive = riskFilter === risk;
              return (
                <button
                  key={risk}
                  onClick={() => setRiskFilter(risk)}
                  className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all shrink-0 cursor-pointer ${
                    isActive 
                      ? 'bg-slate-950 text-white shadow-sm' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/65'
                  }`}
                >
                  {risk === 'ALL' ? 'ALL RISK' : `${risk} RISK`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts / Feedback */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Obligations Grid / Matrix List */}
      <div className="space-y-4">
        {filtered.map((ob, idx) => {
          const theme = CARD_THEMES[idx % CARD_THEMES.length];
          const isSelected = selectedCard === `ob-${ob.id}`;
          const hasTasks = ob.tasks && ob.tasks.length > 0;
          const hasReminders = ob.reminders && ob.reminders.length > 0;
          
          const linkMatch = ob.description?.match(/Link:\s*(https?:\/\/\S+)/);
          const officialLink = linkMatch ? linkMatch[1] : null;
          const cleanDesc = ob.description ? ob.description.replace(/Link:\s*https?:\/\/\S+/, '').trim() : '';

          return (
            <div 
              key={ob.id}
              onClick={() => toggleCard(`ob-${ob.id}`)}
              tabIndex={0}
              className={`rounded-2xl p-6 outline-none dash-card ${theme.cardClass} ${isSelected ? 'dash-card-active' : ''} space-y-3.5 cursor-pointer`}
            >
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    ob.risk_level === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                    ob.risk_level === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                    'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                    {ob.risk_level} Risk
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    Ref: {ob.section_reference || 'General'}
                  </span>

                  {ob.category && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60">
                      Category: <strong className="text-slate-700">{ob.category}</strong>
                    </span>
                  )}

                  {hasReminders && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-500" />
                      <span>{ob.reminders.length} reminder(s) set</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Deadline: <strong className="text-slate-700">{ob.compliance_deadline || 'No limit specified'}</strong></span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{ob.title}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1.5 pl-6">{cleanDesc}</p>
              </div>

              {/* Expanded Card Details */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 transition-all duration-300 pl-6 cursor-default" onClick={(e) => e.stopPropagation()}>
                  <div className="text-[11px] text-slate-500 font-medium">
                    <span>Source Regulation PDF: </span>
                    <strong className="text-slate-800">{ob.regulation_title || "SEBI Live Circulars & Regulations"}</strong>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mapped Tasks */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mapped Compliance Tasks ({ob.tasks ? ob.tasks.length : 0})</span>
                      </h5>
                      {ob.tasks && ob.tasks.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {ob.tasks.map(t => (
                            <div key={t.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{t.title}</p>
                                <p className="text-[9px] text-slate-400">Due: {t.due_date || 'N/A'}</p>
                              </div>
                              <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                t.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                t.status === 'In_Progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>{t.status.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No tasks scheduled yet.</p>
                      )}
                    </div>

                    {/* Mapped Reminders */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>Active Reminders ({ob.reminders ? ob.reminders.length : 0})</span>
                      </h5>
                      {ob.reminders && ob.reminders.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {ob.reminders.map(r => {
                            const dateStr = new Date(r.remind_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            });
                            return (
                              <div key={r.id} className="p-2 rounded-xl bg-orange-50/40 border border-orange-100/60 flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{r.title}</p>
                                  <p className="text-[9px] text-slate-400">Remind on: {dateStr}</p>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider bg-orange-100 text-orange-700">{r.status}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No reminders set yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Penalty Notice & Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 pl-6" onClick={(e) => e.stopPropagation()}>
                {ob.penalty_description ? (
                  <p className="text-[11px] text-rose-600 font-semibold bg-rose-50/70 px-3 py-1.5 rounded-xl border border-rose-100 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Penalty: {ob.penalty_description}</span>
                  </p>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No specific regulatory penalty recorded.</span>
                )}

                <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
                  <button
                    onClick={() => handleOpenReminderModal(ob)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-full text-xs font-black tracking-wide flex items-center gap-1.5 border border-slate-200 transition cursor-pointer shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span>Set Reminder</span>
                  </button>

                  {officialLink && (
                    <a
                      href={officialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-black tracking-wide flex items-center gap-1.5 border border-slate-200 transition cursor-pointer shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Document</span>
                    </a>
                  )}

                  {hasTasks ? (
                    <div className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span>{ob.tasks.length} task(s) scheduled</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenTaskModal(ob)}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white rounded-full text-xs font-black tracking-wide flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition cursor-pointer transform hover:-translate-y-0.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Schedule Control Task</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No active obligations match your query filter.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different term or clear the filters.</p>
          </div>
        )}
      </div>

      {/* Task Creation Modal Popup */}
      {taskModalOb && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Schedule Compliance Control Task</h3>
                  <p className="text-[11px] text-slate-400">Assign automated task for compliance tracking</p>
                </div>
              </div>
              <button 
                onClick={() => setTaskModalOb(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Implementation Details</label>
                <textarea
                  required
                  rows={3}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Task Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Due Timeline (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={taskDays}
                    onChange={(e) => setTaskDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition bg-white font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTaskModalOb(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white rounded-full text-xs font-bold transition cursor-pointer shadow-md shadow-orange-500/25 flex items-center gap-1.5"
                >
                  <span>{savingTask ? 'Scheduling...' : 'Schedule Task'}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Creation Modal Popup */}
      {reminderModalOb && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Set Compliance Reminder</h3>
                  <p className="text-[11px] text-slate-400">Schedule database-stored alerts for this obligation</p>
                </div>
              </div>
              <button 
                onClick={() => setReminderModalOb(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateReminderSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Reminder Title</label>
                <input
                  type="text"
                  required
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Message / Details</label>
                <textarea
                  required
                  rows={3}
                  value={reminderDesc}
                  onChange={(e) => setReminderDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1.5">Alert Timeline (Days from now)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition bg-white font-bold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReminderModalOb(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReminder}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 text-white rounded-full text-xs font-bold transition cursor-pointer shadow-md shadow-orange-500/25 flex items-center gap-1.5"
                >
                  <span>{savingReminder ? 'Scheduling...' : 'Set Reminder'}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
