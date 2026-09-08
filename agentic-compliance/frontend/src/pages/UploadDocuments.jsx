import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Check, 
  AlertCircle,
  MoreVertical,
  Send,
  RotateCw,
  FolderOpen
} from 'lucide-react';
import { apiFetch } from '../services/api';

const CARD_THEMES = [
  {
    iconBg: 'bg-rose-50 border-rose-100 text-rose-500',
    titleColor: 'text-rose-500',
    pillBg: 'bg-[#fff8f8] border-rose-100/80',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-500',
    badgeBorder: 'border-rose-200/80',
    spinnerBorder: 'border-rose-500',
    ringColor: 'border-rose-500',
    textColor: 'text-rose-500',
    cardClass: 'dash-card-rose',
  },
  {
    iconBg: 'bg-amber-50 border-amber-100 text-amber-500',
    titleColor: 'text-amber-500',
    pillBg: 'bg-[#fffbf5] border-amber-100/80',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-500',
    badgeBorder: 'border-amber-200/80',
    spinnerBorder: 'border-amber-500',
    ringColor: 'border-amber-500',
    textColor: 'text-amber-500',
    cardClass: 'dash-card-amber',
  },
  {
    iconBg: 'bg-slate-50 border-slate-100 text-slate-500',
    titleColor: 'text-slate-500',
    pillBg: 'bg-[#faf8ff] border-slate-100/80',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-500',
    badgeBorder: 'border-slate-200/80',
    spinnerBorder: 'border-slate-500',
    ringColor: 'border-slate-500',
    textColor: 'text-slate-500',
    cardClass: 'dash-card-slate',
  },
  {
    iconBg: 'bg-amber-50/80 border-amber-100 text-amber-600',
    titleColor: 'text-amber-600',
    pillBg: 'bg-[#f8faff] border-amber-100/80',
    badgeBg: 'bg-amber-50/80',
    badgeText: 'text-amber-600',
    badgeBorder: 'border-amber-200/80',
    spinnerBorder: 'border-amber-500',
    ringColor: 'border-amber-500',
    textColor: 'text-amber-600',
    cardClass: 'dash-card-amber',
  },
  {
    iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-500',
    titleColor: 'text-emerald-500',
    pillBg: 'bg-[#f6fcf8] border-emerald-100/80',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-500',
    badgeBorder: 'border-emerald-200/80',
    spinnerBorder: 'border-emerald-500',
    ringColor: 'border-emerald-500',
    textColor: 'text-emerald-500',
    cardClass: 'dash-card-emerald',
  },
];

const LEFT_STEPS = [
  'Extract PDF into text (Lead: Reader Agent)',
  'Synthesize executive summary (Interpreter Agent)',
  'Map compliance obligations (Obligation Agent)',
  'Audit context & document gaps (Gap Analyst Agent)',
];

const RIGHT_STEPS = [
  'Check & cross-referencing to Indian CIE (RAG Ingestion)',
  'Evaluate business applicability score (Applicability Agent)',
  'File final action framework (Task Planner Agent)',
  'Generate insights & recommendations',
];

function formatUploadedDate(dateStr) {
  if (!dateStr) return 'Uploaded on: 27/07/2026, 11:10 AM';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return `Uploaded on: ${dateStr}`;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `Uploaded on: ${day}/${month}/${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export default function UploadDocuments() {
  const [file, setFile] = useState(null);
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  const toggleCard = (id) => setSelectedCard(prev => prev === id ? null : id);

  const loadRegulations = async () => {
    try {
      const data = await apiFetch('/regulations');
      setRegulations(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRegulations();
    const timer = setInterval(() => {
      loadRegulations();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSuccess('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
      setSuccess('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUploadSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      await apiFetch('/upload', {
        method: 'POST',
        body: formData
      });

      setSuccess(`File "${file.name}" dispatched to multi-agent compliance pipeline!`);
      setFile(null);
      const inputEl = document.getElementById('file-upload-input');
      if (inputEl) inputEl.value = '';
      loadRegulations();
    } catch (err) {
      setError(err.message || 'File ingestion failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white p-8 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column: Upload Dropzone & Action Button */}
        <div className="lg:col-span-4 space-y-5">
          {/* Dropzone Card */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => toggleCard('dropzone')}
            tabIndex={0}
            className={`rounded-3xl p-8 flex flex-col items-center justify-center text-center outline-none dash-card ${selectedCard === 'dropzone' ? 'dash-card-active' : ''}`}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-orange-500 mb-3">
              <UploadCloud className="w-11 h-11 text-orange-500 stroke-[1.75]" />
            </div>
            
            <p className="text-[13px] font-bold text-slate-800">Select or Drop PDF document</p>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-6">PDF files up to 150MB</p>

            <label 
              htmlFor="file-upload-input" 
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all cursor-pointer group"
            >
              <FolderOpen className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
              <span>Browse Files</span>
            </label>
            <input 
              id="file-upload-input" 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              className="hidden" 
            />

            {file && (
              <div className="mt-4 px-3.5 py-2 bg-orange-50/90 border border-orange-200/80 rounded-xl text-xs text-orange-700 flex items-center gap-2 max-w-full truncate">
                <FileText className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                <span className="truncate font-semibold">{file.name}</span>
                <span className="text-[10px] text-orange-400 shrink-0">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
            )}
          </div>

          {/* Dispatch Agents Button */}
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={loading || !file}
            tabIndex={0}
            className="w-full py-4 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 font-bold text-slate-800 text-xs tracking-wide transition-all outline-none dash-card dash-card-emerald"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 text-emerald-500 animate-spin" />
                <span>Dispatching Pipeline Agents...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-emerald-500" />
                <span>Dispatch Agents</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Upload Tracker & Multi-Agent Checklists */}
        <div className="lg:col-span-8 space-y-4">
          {regulations.map((reg, idx) => {
            const theme = CARD_THEMES[idx % CARD_THEMES.length];
            const isError = reg.status === 'Error';
            const isSelected = selectedCard === `card-${reg.id}`;
            const showChecklist = !isError;

            return (
              <div 
                key={reg.id} 
                onClick={() => toggleCard(`card-${reg.id}`)}
                tabIndex={0}
                className={`rounded-2xl p-5 outline-none dash-card ${theme.cardClass} ${isSelected ? 'dash-card-active' : ''}`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-bold text-slate-900 truncate">{reg.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatUploadedDate(reg.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {reg.status === 'Processing' && (
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder} flex items-center gap-1.5`}>
                        <span className={`w-2 h-2 rounded-full border-2 ${theme.spinnerBorder} border-t-transparent animate-spin`}></span>
                        Processing
                      </span>
                    )}

                    {reg.status === 'Error' && (
                      <span className="px-3.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-500 border border-rose-200">
                        Error
                      </span>
                    )}

                    {reg.status === 'Processed' && (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center gap-1.5">
                        <Check className="w-3 h-3" />
                        Processed
                      </span>
                    )}

                    <button 
                      onClick={(e) => e.stopPropagation()} 
                      className="text-slate-300 hover:text-slate-600 transition p-1"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Multi-Agent Processing Checklist */}
                {showChecklist && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <p className={`text-[10px] uppercase font-bold tracking-wider mb-2.5 ${theme.titleColor}`}>
                      MULTI-AGENT PROCESSING CHECKLIST
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {/* Left 4 steps */}
                      <div className="space-y-1.5">
                        {LEFT_STEPS.map((step, sIdx) => (
                          <div 
                            key={sIdx} 
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${theme.pillBg}`}
                          >
                            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-700 truncate">{step}</span>
                          </div>
                        ))}
                      </div>

                      {/* Right 4 steps */}
                      <div className="space-y-1.5">
                        {RIGHT_STEPS.map((step, sIdx) => {
                          const isLast = sIdx === RIGHT_STEPS.length - 1;
                          const isCurrentlyWorking = isLast && reg.status === 'Processing';
                          return (
                            <div 
                              key={sIdx} 
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${theme.pillBg}`}
                            >
                              {isCurrentlyWorking ? (
                                <div className={`w-4 h-4 rounded-full border-2 ${theme.ringColor} flex items-center justify-center shrink-0 animate-pulse`}></div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                              <span className={`text-[11px] font-medium truncate ${isCurrentlyWorking ? theme.textColor : 'text-slate-700'}`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}

          {regulations.length === 0 && (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No regulatory circulars cataloged yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Drop a PDF document on the left to dispatch multi-agent pipelines.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

