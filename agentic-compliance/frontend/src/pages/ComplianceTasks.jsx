import React, { useEffect, useState } from 'react';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Paperclip,
  Check,
  ChevronRight,
  Upload,
  User,
  X,
  Sparkles,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { apiFetch } from '../services/api';

const RISK_COLUMNS = [
  { 
    id: 'High', 
    label: 'High Risk Gaps & Tasks', 
    cardClass: 'dash-card-rose',
    headerBg: 'bg-rose-50 border-rose-200 text-rose-900',
    iconColor: 'text-rose-600',
    countBg: 'bg-rose-100 text-rose-950'
  },
  { 
    id: 'Medium', 
    label: 'Medium Risk Gaps & Tasks', 
    cardClass: 'dash-card-amber',
    headerBg: 'bg-amber-50 border-amber-200 text-amber-900',
    iconColor: 'text-amber-600',
    countBg: 'bg-amber-100 text-amber-950'
  },
  { 
    id: 'Low', 
    label: 'Low Risk Gaps & Tasks', 
    cardClass: 'dash-card-emerald',
    headerBg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    iconColor: 'text-emerald-600',
    countBg: 'bg-emerald-100 text-emerald-950'
  }
];

export default function ComplianceTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected task detail card state
  const [activeTask, setActiveTask] = useState(null);

  // Evidence upload form state
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiFetch('/compliance/tasks');
      setTasks(data);
      if (activeTask) {
        const freshActive = data.find(t => t.id === activeTask.id);
        setActiveTask(freshActive || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch compliance tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (taskId, newStatus) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (newStatus === 'Completed' && targetTask) {
      const hasEvidence = targetTask.evidence_items && targetTask.evidence_items.length > 0;
      if (!hasEvidence) {
        setError("Cannot mark task as Completed without uploading at least one audit proof file.");
        return;
      }
    }

    try {
      setError('');
      setSuccess('');
      await apiFetch(`/compliance/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setSuccess(`Task status updated to "${newStatus.replace('_', ' ')}"`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update task status.');
    }
  };

  const handleEvidenceFileChange = (e) => {
    setEvidenceFile(e.target.files[0]);
  };

  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();
    if (!activeTask || !evidenceFile || !evidenceTitle.trim()) return;

    setUploadingEvidence(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('task_id', activeTask.id.toString());
      formData.append('title', evidenceTitle);
      formData.append('file', evidenceFile);

      await apiFetch('/evidence', {
        method: 'POST',
        body: formData
      });

      setSuccess(`Audit proof "${evidenceTitle}" uploaded successfully!`);
      setEvidenceTitle('');
      setEvidenceFile(null);
      const inputEl = document.getElementById('evidence-file-input');
      if (inputEl) inputEl.value = '';
      await loadData();
    } catch (err) {
      setError(err.message || 'Evidence upload failed.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white p-8 space-y-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Page Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            <span>Compliance Action Tasks</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Control execution, risk mitigations & audit evidence tracker</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            Total Tasks: <strong className="text-slate-900">{tasks.length}</strong>
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed: {tasks.filter(t => t.status === 'Completed').length}</span>
          </span>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Main Grid: Kanban Columns + Resolution Drawer */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Segment: Kanban Board Columns Segregated by parent obligation risk levels */}
        <div className="flex-1 overflow-x-auto flex gap-4 pb-4 w-full max-w-full">
          {RISK_COLUMNS.map((col) => {
            const colTasks = tasks.filter(t => (t.obligation_risk_level || 'Medium').toUpperCase() === col.id.toUpperCase());
            return (
              <div 
                key={col.id}
                className="w-72 shrink-0 flex flex-col rounded-3xl bg-slate-50/60 border border-slate-200/90 overflow-hidden shadow-sm h-[580px]"
              >

                {/* Column Header */}
                <div className={`p-4 border-b flex justify-between items-center ${col.headerBg}`}>
                  <span className="text-xs font-black tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className={`w-3.5 h-3.5 ${col.iconColor}`} />
                    <span>{col.label}</span>
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-black ${col.countBg}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {colTasks.map((task) => {
                    const isSelected = activeTask?.id === task.id;
                    const hasEvidence = task.evidence_items && task.evidence_items.length > 0;

                    return (
                      <div 
                        key={task.id}
                        onClick={() => setActiveTask(task)}
                        tabIndex={0}
                        className={`p-4 rounded-2xl outline-none dash-card ${col.cardClass} cursor-pointer transition-all ${
                          isSelected ? 'dash-card-active' : ''
                        } ${task.status === 'Completed' ? 'opacity-70 bg-slate-50/50 border-slate-200' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider ${
                            task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            task.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {task.status === 'Completed' ? '✓ Completed' : `${task.priority} Priority`}
                          </span>

                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{task.due_date || 'No due date'}</span>
                          </span>
                        </div>

                        <h5 className={`text-xs font-bold text-slate-900 leading-snug mb-1.5 line-clamp-2 ${
                          task.status === 'Completed' ? 'line-through text-slate-400 font-medium' : ''
                        }`}>
                          {task.title}
                        </h5>
                        <p className={`text-[11px] leading-relaxed mb-3 line-clamp-2 font-medium ${
                          task.status === 'Completed' ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {task.description}
                        </p>
                        
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          {task.status === 'Completed' ? (
                            <span className="text-[10px] text-emerald-600 font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed</span>
                            </span>
                          ) : hasEvidence ? (
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'Completed')}
                              className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 hover:border-emerald-300 rounded-lg text-[10px] font-extrabold tracking-wide flex items-center gap-1 transition cursor-pointer shadow-sm animate-pulse"
                            >
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Mark as Done</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTask(task);
                                setError("Evidence file is required. Please upload an audit proof in the Resolution drawer first.");
                              }}
                              className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-extrabold tracking-wide flex items-center gap-1 transition cursor-pointer"
                              title="Upload evidence file to unlock task completion"
                            >
                              <AlertCircle className="w-3 h-3 text-slate-400" />
                              <span>Upload Proof First</span>
                            </button>
                          )}

                          {hasEvidence && (
                            <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {task.evidence_items.length} file(s)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      No tasks in this risk column.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Segment: Task Resolution & Audit Evidence Drawer */}
        {activeTask && (
          <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-200 shadow-xl p-6 shrink-0 space-y-5 animate-fadeIn">
            {/* Console Header */}
            <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-black text-amber-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Resolution Console
                </span>
                <h4 className="text-sm font-bold text-slate-900 leading-snug mt-1">{activeTask.title}</h4>
              </div>
              <button 
                onClick={() => setActiveTask(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Status Dropdown */}
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5">
                Update Task Lifecycle Status
              </label>
              <select
                value={activeTask.status}
                onChange={(e) => handleUpdateStatus(activeTask.id, e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-900 bg-slate-50 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition cursor-pointer"
              >
                <option value="Pending">Pending (Backlog)</option>
                <option value="In_Progress">In Progress</option>
                <option value="Under_Review">Under Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Action Plan Details */}
            <div>
              <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5">
                Action Plan & Controls
              </h5>
              <p className="text-xs text-slate-700 leading-relaxed p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 font-medium">
                {activeTask.description}
              </p>
            </div>

            {/* Attached Audit Evidence Feed */}
            <div>
              <h5 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Audit Proofs / Files</span>
              </h5>
              <div className="space-y-2">
                {activeTask.evidence_items && activeTask.evidence_items.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{ev.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Uploaded: {new Date(ev.uploaded_at).toLocaleDateString()}</p>
                    </div>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      ev.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      ev.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                      'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      {ev.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}

                {(!activeTask.evidence_items || activeTask.evidence_items.length === 0) && (
                  <p className="text-[11px] text-slate-400 italic">No evidence uploaded yet for this control task.</p>
                )}
              </div>
            </div>

            {/* Evidence Upload Form */}
            {activeTask.status !== 'Completed' && (
              <form onSubmit={handleEvidenceSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                <h5 className="text-[10px] uppercase font-black tracking-widest text-amber-600">
                  Upload New Audit Proof
                </h5>
                
                <input
                  type="text"
                  required
                  placeholder="Evidence Title (e.g. Net Worth Certificate)"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition"
                />

                <div className="relative border border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-3.5 text-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/30 transition">
                  <input
                    id="evidence-file-input"
                    type="file"
                    required
                    onChange={handleEvidenceFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-700 font-bold block truncate">
                    {evidenceFile ? evidenceFile.name : 'Choose proof file (PDF / Image)'}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={uploadingEvidence || !evidenceFile}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide transition duration-200 cursor-pointer shadow-md shadow-orange-500/20"
                >
                  {uploadingEvidence ? 'Uploading...' : 'Submit Evidence File'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
