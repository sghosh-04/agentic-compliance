import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Trash2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Bookmark,
  Search,
  Check,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Layers,
  Clock,
  Filter,
  Play,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { apiFetch } from '../services/api';


const CARD_THEMES = [
  {
    iconBg: 'bg-orange-50 border-orange-200 text-orange-600',
    titleColor: 'text-orange-600',
    badgeBg: 'bg-orange-50 text-orange-600 border-orange-200',
    cardClass: 'dash-card-orange',
    accentBorder: 'border-l-orange-500',
    summaryBg: 'bg-orange-50/40 border-orange-100/70',
  },
  {
    iconBg: 'bg-amber-50 border-amber-200 text-amber-700',
    titleColor: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    cardClass: 'dash-card-amber',
    accentBorder: 'border-l-amber-500',
    summaryBg: 'bg-amber-50/40 border-amber-100/70',
  },
  {
    iconBg: 'bg-amber-900/10 border-amber-900/20 text-amber-900',
    titleColor: 'text-amber-900',
    badgeBg: 'bg-amber-900/10 text-amber-900 border-amber-900/20',
    cardClass: 'dash-card-brown',
    accentBorder: 'border-l-amber-900',
    summaryBg: 'bg-amber-900/5 border-amber-900/10',
  },
  {
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    titleColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    cardClass: 'dash-card-emerald',
    accentBorder: 'border-l-emerald-500',
    summaryBg: 'bg-emerald-50/40 border-emerald-100/70',
  },
  {
    iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
    titleColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-600 border-rose-200',
    cardClass: 'dash-card-rose',
    accentBorder: 'border-l-rose-500',
    summaryBg: 'bg-rose-50/40 border-rose-100/70',
  },
];

export default function Regulations() {
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedReg, setExpandedReg] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const initialSetRef = React.useRef(false);

  const toggleCard = (id) => setSelectedCard(prev => prev === id ? null : id);

  const loadData = async (isInitial = false) => {
    try {
      const data = await apiFetch('/regulations');
      setRegulations(data);
      if (isInitial && !initialSetRef.current && data.length > 0) {
        setExpandedReg(data[0].id);
        initialSetRef.current = true;
      }
    } catch (err) {
      setError(err.message || 'Failed to load regulations catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    // Background refresh that does NOT tamper with user expanded item
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);


  const handleDownloadReport = async (regId, title, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(`report-${regId}`);
      const response = await apiFetch(`/regulations/${regId}/report`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `compliance_report_${title.replace(/\s+/g, '_').toLowerCase()}.md`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSuccess(`Downloaded compliance audit report for "${title}"`);
    } catch (err) {
      setError(err.message || 'Report file has not been compiled yet. Please wait for agent completion.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (regId, title, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"? All extracted obligations, tasks, and audit logs will be permanently removed.`)) {
      return;
    }

    try {
      setActionLoadingId(`delete-${regId}`);
      await apiFetch(`/regulations/${regId}`, { method: 'DELETE' });
      setSuccess(`Regulation "${title}" deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete regulation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProcessNow = async (regId, title, e) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(`process-${regId}`);
      await apiFetch(`/regulations/${regId}/process`, { method: 'POST' });
      setSuccess(`Multi-agent pipeline completed analysis for "${title}"!`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Multi-agent analysis failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDirectLink = (url, title, e) => {
    if (e) e.stopPropagation();
    let targetUrl = url;
    if (!targetUrl || targetUrl.includes('google.com/search')) {
      targetUrl = title?.toLowerCase().includes('sebi')
        ? 'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=7&smid=0'
        : 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx';
    }
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (win) {
      win.opener = null;
    }
  };


  // Metrics calculation
  const totalCount = regulations.length;
  const processedCount = regulations.filter(r => r.status === 'Processed').length;
  const processingCount = regulations.filter(r => r.status === 'Processing').length;
  const totalObligations = regulations.reduce((acc, r) => acc + (r.obligations ? r.obligations.length : 0), 0);

  // Filtered regulations
  const filteredRegulations = useMemo(() => {
    return regulations.filter((reg) => {
      const matchesSearch = reg.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || reg.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [regulations, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-8 h-8 border-4 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white p-8 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Top Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Total Regulations */}
        <div 
          onClick={() => toggleCard('stat-total')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-slate outline-none ${selectedCard === 'stat-total' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Cataloged</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Official circular documents</p>
        </div>

        {/* Processed & Verified */}
        <div 
          onClick={() => toggleCard('stat-processed')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-emerald outline-none ${selectedCard === 'stat-processed' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fully Processed</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">{processedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Ready for audit & reporting</p>
        </div>

        {/* In Pipeline */}
        <div 
          onClick={() => toggleCard('stat-pipeline')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-amber outline-none ${selectedCard === 'stat-pipeline' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">In Pipeline</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-500">{processingCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Agent extraction in progress</p>
        </div>

        {/* Total Obligations Extracted */}
        <div 
          onClick={() => toggleCard('stat-obligations')}
          tabIndex={0}
          className={`rounded-2xl p-5 dash-card dash-card-amber outline-none ${selectedCard === 'stat-obligations' ? 'dash-card-active' : ''}`}
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mapped Obligations</p>
            <div className="w-9 h-9 rounded-xl dash-icon-box flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-700">{totalObligations}</p>
          <p className="text-[11px] text-slate-400 mt-1">Extracted compliance rules</p>
        </div>
      </div>

      {/* Search & Filter Header Bar */}
      <div className="rounded-2xl border border-slate-100 p-4 shadow-sm bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search circulars by title, source, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-500 focus:ring-2 focus:ring-orange-500/10 transition"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {['ALL', 'Processed', 'Processing', 'Error'].map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Catalog List */}
      <div className="space-y-4">
        {filteredRegulations.map((reg, idx) => {
          const theme = CARD_THEMES[idx % CARD_THEMES.length];
          const isExpanded = expandedReg === reg.id;
          const isSelected = selectedCard === `reg-${reg.id}`;
          const obligationsList = reg.obligations || [];
          const isDeleting = actionLoadingId === `delete-${reg.id}`;
          const isProcessing = actionLoadingId === `process-${reg.id}`;
          const isReporting = actionLoadingId === `report-${reg.id}`;

          return (
            <div 
              key={reg.id}
              onClick={() => {
                toggleCard(`reg-${reg.id}`);
                setExpandedReg(isExpanded ? null : reg.id);
              }}
              tabIndex={0}
              className={`rounded-2xl p-6 outline-none dash-card ${theme.cardClass} ${isSelected ? 'dash-card-active' : ''}`}
            >
              {/* Top Row / Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 ${theme.iconBg}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate max-w-xl">{reg.title}</h3>
                    
                    <div className="flex flex-wrap items-center gap-2.5 mt-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {reg.source || 'Regulator'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Category: <strong className="text-slate-700">{reg.category || 'General'}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Date: {reg.published_date}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{obligationsList.length} Obligations</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Badges & Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                  {/* Status Indicator */}
                  {reg.status === 'Processing' && (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></span>
                      Processing
                    </span>
                  )}

                  {reg.status === 'Error' && (
                    <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-500 border border-rose-200">
                      Error
                    </span>
                  )}

                  {reg.status === 'Processed' && (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Processed
                    </span>
                  )}

                  {/* Run / Reprocess Agent Button (if in Processing or Error) */}
                  {reg.status !== 'Processed' && (
                    <button
                      onClick={(e) => handleProcessNow(reg.id, reg.title, e)}
                      disabled={isProcessing}
                      title="Run Multi-Agent Compliance Pipeline"
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isProcessing ? 'Analyzing...' : 'Run Agents'}</span>
                    </button>
                  )}

                  {/* Download Report Button */}
                  <button
                    onClick={(e) => handleDownloadReport(reg.id, reg.title, e)}
                    disabled={isReporting || reg.status !== 'Processed'}
                    title="Download Compliance Audit Report"
                    className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    {isReporting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Report</span>
                  </button>

                  {/* Direct Official Link Button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenDirectLink(reg.reference_url, reg.title, e)}
                    title="Open Direct Official Portal Link"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Official Portal</span>
                  </button>



                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(reg.id, reg.title, e)}
                    disabled={isDeleting}
                    title="Delete regulation and all related obligations"
                    className="p-2 rounded-xl border border-slate-200/90 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50 transition cursor-pointer flex items-center justify-center"
                  >
                    {isDeleting ? <RotateCw className="w-3.5 h-3.5 animate-spin text-rose-500" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Expand / Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedReg(isExpanded ? null : reg.id);
                    }}
                    title={isExpanded ? "Collapse details" : "Expand details"}
                    className="p-2 rounded-xl border border-slate-200/90 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition flex items-center justify-center cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Multi-Agent Extraction Details */}
              {isExpanded && (
                <div className="mt-5 pt-5 border-t border-slate-100 space-y-4" onClick={(e) => e.stopPropagation()}>
                  {/* Executive Summary */}
                  <div className={`p-4 rounded-2xl border ${theme.summaryBg}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-slate-600" />
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-800">Executive Summary (Interpreter Agent)</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {reg.description || 'No parsed executive summary recorded. Full obligation breakdown available below.'}
                    </p>
                  </div>

                  {/* Obligations List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-700" />
                        <span>Extracted Obligations Checklist ({obligationsList.length})</span>
                      </h4>
                    </div>

                    <div className="space-y-2.5">
                      {obligationsList.map((ob) => (
                        <div 
                          key={ob.id} 
                          className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all flex flex-col md:flex-row md:items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              <Bookmark className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="truncate">{ob.title}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-500">
                                Ref: {ob.section_reference || 'General'}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{ob.description}</p>
                            {ob.compliance_deadline && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Compliance Deadline: <strong className="text-slate-600">{ob.compliance_deadline}</strong>
                              </p>
                            )}
                          </div>

                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 self-start ${
                            ob.risk_level === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                            ob.risk_level === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {ob.risk_level} Risk
                          </span>
                        </div>
                      ))}

                      {obligationsList.length === 0 && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                          No obligations currently mapped for this circular.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredRegulations.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No regulations match your search filter.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different term or change the status filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

