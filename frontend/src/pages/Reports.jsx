import React, { useState, useEffect, useRef } from 'react';
import {
  FileDown, Download, Sparkles, AlertTriangle, FileSearch,
  BookOpen, Package, CheckCircle2, FileText, TrendingUp, BarChart3
} from 'lucide-react';
import { apiFetch } from '../services/api';

export default function Reports() {
  const [regulations, setRegulations]     = useState([]);
  const [selectedReg, setSelectedReg]     = useState('');
  const [reportType, setReportType]       = useState('audit');
  const [previewContent, setPreviewContent] = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [exportingId, setExportingId]     = useState(null);
  const [exported, setExported]           = useState({});
  const [exportingPdf, setExportingPdf]   = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    apiFetch('/regulations')
      .then(data => {
        const ok = data.filter(r => r.status === 'Processed');
        setRegulations(ok);
        if (ok.length > 0) setSelectedReg(ok[0].id.toString());
      })
      .catch(err => setError(err.message || 'Failed to fetch regulations.'));
  }, []);

  const handlePreview = async (regId) => {
    const targetReg = regId || selectedReg;
    if (!targetReg) return;
    setLoading(true); setPreviewContent(''); setError('');
    try {
      const response = await apiFetch(`/regulations/${targetReg}/report`);
      const text = typeof response === 'string' ? response : await response.text?.() || JSON.stringify(response, null, 2);
      setPreviewContent(text);
    } catch (err) {
      setError(err.message || 'Failed to retrieve report.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedReg) {
      handlePreview(selectedReg);
    }
  }, [selectedReg]);

  const handleDownload = async () => {
    if (!selectedReg || !previewContent) return;
    const blob = new Blob([previewContent], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `audit_report_reg_${selectedReg}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPackage = async (regId) => {
    setExportingId(regId);
    try {
      const token   = localStorage.getItem('token');
      const BASE    = import.meta.env.VITE_API_URL || '/api';
      const res     = await fetch(`${BASE}/export/audit-package/${regId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `audit_package_reg_${regId}.json`; a.click();
      URL.revokeObjectURL(url);
      setExported(p => ({ ...p, [regId]: true }));
    } catch (err) {
      alert(err.message);
    } finally { setExportingId(null); }
  };

  const reportTypes = [
    { id: 'audit',     label: 'Audit Report',      icon: FileSearch, color: 'text-amber-700',  bg: 'bg-amber-50/80 border-amber-200' },
  ];

  const activeReg = regulations.find(r => r.id.toString() === selectedReg);

  const parseReportText = (text) => {
    if (!text) return null;
    
    // Fallback if formatting structure differs
    if (!text.includes("1. Executive Summary") || !text.includes("3. Obligations Matrix Summary")) {
      return <div className="font-mono text-xs whitespace-pre-wrap">{text}</div>;
    }

    try {
      const lines = text.split('\n');
      
      const getValue = (label) => {
        const line = lines.find(l => l.startsWith(label));
        return line ? line.replace(label, '').trim() : '';
      };

      const regulation = getValue("Regulation:");
      const authority = getValue("Issuing Authority:");
      const category = getValue("Category:");
      const pubDate = getValue("Publication Date:");
      const reportDate = getValue("Audit Report Date:");
      const status = getValue("Status:");

      const getSectionContent = (startHeader, endHeader) => {
        const startIdx = text.indexOf(startHeader);
        if (startIdx === -1) return '';
        const contentStart = startIdx + startHeader.length;
        if (!endHeader) return text.substring(contentStart).trim();
        const endIdx = text.indexOf(endHeader);
        return text.substring(contentStart, endIdx === -1 ? undefined : endIdx).trim();
      };

      const execSummary = getSectionContent("1. Executive Summary", "2. Regulatory Background");
      const regBackground = getSectionContent("2. Regulatory Background", "3. Obligations Matrix Summary");
      const gapAnalysis = getSectionContent("4. Compliance Gap Analysis", "5. Risk Assessment");
      const riskAssessment = getSectionContent("5. Risk Assessment", "6. Recommended Action Plan");
      const actionPlan = getSectionContent("6. Recommended Action Plan", "7. Conclusion");
      const conclusion = getSectionContent("7. Conclusion", "---");

      // Table formatting
      const tableText = getSectionContent("3. Obligations Matrix Summary", "Core Obligation Detail:");
      const tableLines = tableText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const tableHeader = tableLines[0] ? tableLines[0].split('\t') : [];
      const tableRows = tableLines.slice(1).map(l => l.split('\t'));

      const coreDetailsText = getSectionContent("Core Obligation Detail:", "4. Compliance Gap Analysis");

      const formatBullets = (bodyText) => {
        return bodyText.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          if (trimmed.startsWith('•')) {
            return (
              <div key={i} className="flex items-start gap-2.5 my-2 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                <p className="text-xs text-slate-700 leading-relaxed font-medium text-justify">{trimmed.replace(/^•\s*/, '')}</p>
              </div>
            );
          }
          return <p key={i} className="text-xs text-slate-700 leading-relaxed font-medium mb-3 text-justify">{trimmed}</p>;
        });
      };

      return (
        <div ref={previewRef} className="bg-white shadow-xl border border-slate-200 p-12 max-w-4xl mx-auto rounded-none font-sans text-slate-800 space-y-8 select-text" style={{ minHeight: '1120px' }}>
          {/* Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-end">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-wider">AEGIS COMPLIANCE SERVICES</h2>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Internal Compliance Audit Division</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-900">REPORT NO: ACS-2026-AUD</p>
              <p className="text-[10px] text-slate-400 font-bold">Generated: {reportDate || 'October 2026'}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1.5 py-4">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Compliance Audit Report</h1>
            <p className="text-xs font-semibold text-slate-500">Evaluation of Operational Control Posture and Adherence</p>
          </div>

          {/* Metadata Table */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Regulation</p>
              <p className="font-bold text-slate-800 mt-0.5">{regulation || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Issuing Authority</p>
              <p className="font-bold text-slate-800 mt-0.5">{authority || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Category</p>
              <p className="font-bold text-slate-800 mt-0.5">{category || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Publication Date</p>
              <p className="font-bold text-slate-800 mt-0.5">{pubDate || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Audit Report Date</p>
              <p className="font-bold text-slate-800 mt-0.5">{reportDate || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Compliance Status</p>
              <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border mt-0.5 uppercase tracking-wide ${
                status?.toLowerCase().includes('action') 
                  ? 'bg-rose-50 border-rose-200 text-rose-600' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}>{status || 'Pending Review'}</span>
            </div>
          </div>

          {/* 1. Executive Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">1. Executive Summary</h3>
            {formatBullets(execSummary)}
          </div>

          {/* 2. Regulatory Background */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">2. Regulatory Background</h3>
            {formatBullets(regBackground)}
          </div>

          {/* 3. Obligations Matrix Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">3. Obligations Matrix Summary</h3>
            {tableHeader.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-[10px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {tableHeader.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-black text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tableRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50">
                        {row.map((val, cIdx) => (
                          <td key={cIdx} className={`px-3 py-2 text-slate-700 font-medium ${cIdx === 2 ? 'font-bold text-rose-600' : ''}`}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {coreDetailsText && (
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 space-y-2 mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Core Obligation Details</p>
                {coreDetailsText.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  return (
                    <p key={i} className="text-xs text-slate-700 leading-relaxed font-medium">{trimmed}</p>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Compliance Gap Analysis */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">4. Compliance Gap Analysis</h3>
            {formatBullets(gapAnalysis)}
          </div>

          {/* 5. Risk Assessment */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">5. Risk Assessment</h3>
            {formatBullets(riskAssessment)}
          </div>

          {/* 6. Recommended Action Plan */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">6. Recommended Action Plan</h3>
            {formatBullets(actionPlan)}
          </div>

          {/* 7. Conclusion */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">7. Conclusion</h3>
            {formatBullets(conclusion)}
          </div>

          {/* Audit Sign-off */}
          <div className="border-t border-slate-200 pt-6 mt-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-1 text-[11px] text-slate-500">
              <p>Lead Auditor: <strong className="text-slate-800">Aegis Compliance Advisory Team</strong></p>
              <p>Verification Status: <span className="text-emerald-600 font-bold">COMPLETED & SIGNED</span></p>
            </div>
            <div className="text-center space-y-1 shrink-0">
              <div className="w-40 border-b border-slate-400 h-8" />
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Authorized Audit Signature</p>
            </div>
          </div>
        </div>
      );
    } catch (err) {
      console.error("Error parsing report, using raw view: ", err);
      return <div className="font-mono text-xs whitespace-pre-wrap">{text}</div>;
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-transparent" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <FileDown className="w-6 h-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Report Builder</h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">Generate AI-powered audit reports and compliance packages</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex gap-2 items-center font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            <h3 className="text-sm font-black text-slate-900">Configuration</h3>

            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Target Regulation</label>
              <select
                value={selectedReg}
                onChange={e => setSelectedReg(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-55 border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition"
              >
                {regulations.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                {regulations.length === 0 && <option value="">No processed regulations</option>}
              </select>
              {activeReg && (
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{activeReg.source} · {activeReg.obligations?.length ?? 0} obligations</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Report Type</label>
              <div className="space-y-2">
                {reportTypes.map(rt => (
                  <button
                    key={rt.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-bold transition bg-amber-50/80 border-amber-200 text-amber-700"
                  >
                    <rt.icon className="w-4 h-4 shrink-0" />
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handlePreview()}
                disabled={loading || !selectedReg}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Refresh Report
              </button>

              <button
                onClick={handleDownload}
                disabled={!previewContent}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download (.md)
              </button>

              <button
                onClick={async () => {
                  if (!previewContent || !previewRef.current) return;
                  setExportingPdf(true);
                  try {
                    const html2pdfModule = await import('html2pdf.js/dist/html2pdf.js');
                    const html2pdf = html2pdfModule.default || html2pdfModule;
                    const element = previewRef.current;
                    const opt = {
                      margin:       12,
                      filename:     `audit_report_reg_${selectedReg || 'report'}.pdf`,
                      image:        { type: 'jpeg', quality: 0.98 },
                      html2canvas:  { scale: 2, useCORS: true },
                      jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(element).save();
                  } catch (err) {
                    console.error('PDF export failed', err);
                    alert('Failed to export PDF: ' + (err.message || err));
                  } finally {
                    setExportingPdf(false);
                  }
                }}
                disabled={!previewContent || exportingPdf}
                className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-slate-800/20"
              >
                {exportingPdf ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Exporting…</>
                ) : (
                  <><FileDown className="w-3.5 h-3.5" /> Export PDF</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-3">
          <div className="bg-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '620px' }}>
            <div className="px-5 py-4 border-b border-slate-150 flex items-center gap-2.5 bg-white">
              <FileSearch className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Official Document Preview</h4>
              {previewContent && <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Signed & Verified</span>}
            </div>

            <div className="flex-1 p-8 overflow-y-auto bg-slate-50 border-t border-slate-100">
              {loading ? (
                <div className="h-full flex items-center justify-center gap-3 text-slate-400 py-20">
                  <Sparkles className="w-5 h-5 text-amber-600 animate-spin" />
                  <span className="font-sans font-semibold">Compiling compliance report…</span>
                </div>
              ) : previewContent ? (
                parseReportText(previewContent)
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-20">
                  <BookOpen className="w-10 h-10 opacity-20" />
                  <div className="text-center font-sans">
                    <p className="text-sm font-semibold text-slate-600">No preview yet</p>
                    <p className="text-xs text-slate-400 mt-1">Select a regulation and click "Refresh Report"</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Packages */}
      {regulations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-black text-slate-900">Audit Package Export</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Full JSON bundle: obligations, tasks, evidence, gap analyses, audit trail</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {regulations.map(reg => (
              <div key={reg.id} className="flex items-center justify-between py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="text-sm font-bold text-slate-800">{reg.title}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 ml-6">{reg.source} · {reg.obligations?.length ?? 0} obligations</p>
                </div>
                <button
                  onClick={() => handleExportPackage(reg.id)}
                  disabled={exportingId === reg.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    exported[reg.id]
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                  }`}
                >
                  {exportingId === reg.id ? (
                    <><div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />Exporting…</>
                  ) : exported[reg.id] ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" />Exported</>
                  ) : (
                    <><Package className="w-3.5 h-3.5" />Export Package</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
