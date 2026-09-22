import React, { useEffect, useState } from 'react';
import { 
  FolderLock, 
  Check, 
  X, 
  MessageSquare, 
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Download,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../services/api';

export default function Evidence() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remarks, setRemarks] = useState({});
  const [userRole, setUserRole] = useState('Compliance_Officer');
  // Auto-match state: { [evId]: { loading, result, error, open } }
  const [autoMatch, setAutoMatch] = useState({});

  const loadData = async () => {
    try {
      const data = await apiFetch('/evidence');
      setEvidence(data);
    } catch (err) {
      setError(err.message || 'Failed to load evidence repository.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const role = localStorage.getItem('role') || 'Compliance_Officer';
    setUserRole(role);
  }, []);

  const handleReview = async (evId, newStatus) => {
    const evRemarks = remarks[evId] || '';
    try {
      await apiFetch(`/evidence/${evId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status_update: newStatus, comments: evRemarks })
      });
      // Clear remark
      setRemarks(prev => ({ ...prev, [evId]: '' }));
      await loadData();
    } catch (err) {
      alert(err.message || 'Review submission failed.');
    }
  };

  const handleRemarkChange = (evId, val) => {
    setRemarks(prev => ({ ...prev, [evId]: val }));
  };

  const handleViewProof = (evId, filename) => {
    const token = localStorage.getItem('token');
    const BASE = import.meta.env.VITE_API_URL || '/api';
    fetch(`${BASE}/evidence/${evId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to download proof file");
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract original file name if possible, or build a clean one
      const extension = filename?.split('.').pop() || 'pdf';
      a.download = filename ? `proof_${filename}` : `evidence_proof_${evId}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => alert(err.message));
  };

  const handleAutoMatch = async (evId) => {
    setAutoMatch(prev => ({
      ...prev,
      [evId]: { loading: true, result: null, error: '', open: true }
    }));
    try {
      const data = await apiFetch(`/evidence/${evId}/auto-match`, { method: 'POST' });
      setAutoMatch(prev => ({
        ...prev,
        [evId]: { loading: false, result: data, error: '', open: true }
      }));
    } catch (err) {
      setAutoMatch(prev => ({
        ...prev,
        [evId]: { loading: false, result: null, error: err.message || 'Auto-match failed.', open: true }
      }));
    }
  };

  const toggleAutoMatchPanel = (evId) => {
    setAutoMatch(prev => ({
      ...prev,
      [evId]: { ...(prev[evId] || {}), open: !(prev[evId]?.open) }
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const showReviewActions = userRole === 'Admin' || userRole === 'Compliance_Officer';

  // Metrics
  const totalCount = evidence.length;
  const pendingCount = evidence.filter(e => e.status === 'Pending_Review').length;
  const approvedCount = evidence.filter(e => e.status === 'Approved').length;
  const rejectedCount = evidence.filter(e => e.status === 'Rejected').length;

  return (
    <div className="flex-1 overflow-y-auto bg-white p-8 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="rounded-2xl p-5 border border-slate-200 shadow-sm bg-white">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Proofs</p>
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <FolderLock className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Uploaded audit materials</p>
        </div>

        <div className="rounded-2xl p-5 border border-amber-200 shadow-sm bg-amber-50/20">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending Review</p>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-500">{pendingCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting control sign-off</p>
        </div>

        <div className="rounded-2xl p-5 border border-emerald-200 shadow-sm bg-emerald-50/20">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Approved Proofs</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">{approvedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Verified compliant records</p>
        </div>

        <div className="rounded-2xl p-5 border border-rose-200 shadow-sm bg-rose-50/20">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rejected Proofs</p>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-rose-500">{rejectedCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Require remediation upload</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Evidence Repository List */}
      <div className="space-y-4">
        {evidence.map((ev) => {
          const hasMatchedResults = autoMatch[ev.id]?.result;
          const matchedOpen = autoMatch[ev.id]?.open;
          
          return (
            <div 
              key={ev.id}
              className="bg-white border border-slate-200/90 hover:border-slate-350 shadow-sm p-6 rounded-2xl transition-all duration-300 flex flex-col gap-5"
            >
              
              {/* Header: Title and Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-amber-700" />
                    <span>{ev.title}</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                      Uploaded: <strong>{new Date(ev.uploaded_at).toLocaleString()}</strong>
                    </span>
                    <span>•</span>
                    <span>Uploaded By: <strong>User #{ev.uploaded_by || 'System'}</strong></span>
                  </p>
                </div>

                <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider self-start md:self-auto border ${
                  ev.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  ev.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                  'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                }`}>
                  {ev.status.replace('_', ' ')}
                </span>
              </div>

              {/* Task Details and Review Actions Container */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Linked Compliance Task metadata details */}
                <div className="lg:col-span-2 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Linked Control Task</p>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">#{ev.task_id}: {ev.task_title || "Compliance Verification Control"}</span>
                      {ev.obligation_risk_level && (
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          ev.obligation_risk_level === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                          ev.obligation_risk_level === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}>{ev.obligation_risk_level} Risk</span>
                      )}
                    </div>
                    
                    <p className="text-slate-600 leading-relaxed font-medium">{ev.task_description || "Audit implementation check for mapped rules."}</p>
                    
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-medium">
                      {ev.obligation_title && <span>Obligation: <strong className="text-slate-600">{ev.obligation_title}</strong></span>}
                      {ev.regulation_title && <span>Regulation: <strong className="text-slate-600">{ev.regulation_title}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* Proof Action Panel: View and Review controls */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewProof(ev.id, ev.file_path?.split(/[\\/]/).pop())}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>View Proof File</span>
                    </button>
                  </div>

                  {/* Comments from Auditor */}
                  {ev.comments && (
                    <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-100 text-xs text-slate-700 font-medium">
                      <strong className="text-orange-700 uppercase tracking-wide text-[9px] block mb-1">Auditor Remarks</strong>
                      {ev.comments}
                    </div>
                  )}

                  {/* Review inputs (only visible to compliance officers/admins for pending review items) */}
                  {showReviewActions && ev.status === 'Pending_Review' && (
                    <div className="space-y-3.5 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">Auditor Review Comments</label>
                        <input
                          type="text"
                          placeholder="Provide review remarks..."
                          value={remarks[ev.id] || ''}
                          onChange={(e) => handleRemarkChange(ev.id, e.target.value)}
                          className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 transition"
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleReview(ev.id, 'Rejected')}
                          className="px-4 py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Not Approved</span>
                        </button>
                        <button
                          onClick={() => handleReview(ev.id, 'Approved')}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white rounded-full text-xs font-black tracking-wide flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Approve Control</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Auto-Match Obligations Panel */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  onClick={() => {
                    const state = autoMatch[ev.id];
                    if (state?.result || state?.error) {
                      toggleAutoMatchPanel(ev.id);
                    } else {
                      handleAutoMatch(ev.id);
                    }
                  }}
                  disabled={autoMatch[ev.id]?.loading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  {autoMatch[ev.id]?.loading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>Semantic matching...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Auto-Match Regulation Context</span>
                      {autoMatch[ev.id]?.result && (
                        matchedOpen
                          ? <ChevronUp className="w-3 h-3 ml-1" />
                          : <ChevronDown className="w-3 h-3 ml-1" />
                      )}
                    </>
                  )}
                </button>

                {/* Auto-match results panel */}
                {matchedOpen && (
                  <div className="mt-3 space-y-3.5 animate-fadeIn">
                    {autoMatch[ev.id]?.error && (
                      <p className="text-xs text-rose-500 flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {autoMatch[ev.id].error}
                      </p>
                    )}

                    {hasMatchedResults && (
                      <div className="space-y-3 pl-2">
                        {autoMatch[ev.id].result.summary && (
                          <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 font-medium">
                            {autoMatch[ev.id].result.summary}
                          </p>
                        )}

                        {autoMatch[ev.id].result.matches?.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No matching obligations found for this evidence.</p>
                        )}

                        {autoMatch[ev.id].result.matches?.map((match, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-800 flex-1">
                                {match.obligation_title}
                              </p>
                              <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                                {Math.round((match.confidence || 0) * 100)}% Match
                              </span>
                            </div>
                            {/* Confidence bar */}
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.round((match.confidence || 0) * 100)}%`,
                                  background: match.confidence >= 0.7
                                    ? 'linear-gradient(to right, #10b981, #059669)'
                                    : match.confidence >= 0.4
                                    ? 'linear-gradient(to right, #f59e0b, #d97706)'
                                    : 'linear-gradient(to right, #6366f1, #4f46e5)'
                                }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{match.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          );
        })}

        {evidence.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <FolderLock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No evidence documents have been uploaded to the repository yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Controls waiting for evidence uploads will appear here once files are submitted.</p>
          </div>
        )}
      </div>

    </div>
  );
}
