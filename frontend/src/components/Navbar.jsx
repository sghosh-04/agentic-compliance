import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Search, 
  Bell, 
  Settings, 
  X, 
  ArrowRight, 
  CheckCheck, 
  Clock, 
  ShieldAlert, 
  FileText, 
  CheckSquare, 
  GitCompare, 
  Sparkles,
  Command,
  ExternalLink
} from 'lucide-react';
import { apiFetch } from '../services/api';

export default function Navbar({ currentPage, setPage }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [unreadCount, setUnreadCount] = useState(3);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'SEBI Regulatory Update',
      desc: 'Master Direction on Capital & Net Worth limits updated for FY26.',
      time: '15m ago',
      page: 'feed',
      read: false,
      tag: 'Circular'
    },
    {
      id: 2,
      title: 'RBI KYC Compliance Mandate',
      desc: 'Re-KYC periodic verification schedule due in 12 days.',
      time: '1h ago',
      page: 'obligations',
      read: false,
      tag: 'Mandate'
    },
    {
      id: 3,
      title: 'Compliance Tasks Due',
      desc: '3 statutory audit action items awaiting evidence submission.',
      time: '3h ago',
      page: 'tasks',
      read: false,
      tag: 'Action'
    }
  ]);

  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const calRef = useRef(null);

  const titles = {
    dashboard: 'Operational Compliance Overview',
    chat: 'AI Compliance RAG Copilot',
    upload: 'Ingest Regulatory Circulars',
    regulations: 'Active Regulations Library',
    obligations: 'Obligation Extraction Audit',
    tasks: 'Task Board Management',
    gap: 'Structural Gap Assessments',
    evidence: 'Uploaded Evidence Logs',
    reports: 'Compliance Document Generator',
    feed: 'Live Regulatory Feed Monitor',
    settings: 'System Configuration'
  };

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setCalendarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (calRef.current && !calRef.current.contains(e.target)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Nav items for Spotlight Search
  const navItems = [
    { id: 'dashboard',   label: 'Dashboard Overview',       category: 'Overview',   icon: FileText },
    { id: 'chat',        label: 'AI Compliance Chat',       category: 'Copilot',    icon: Sparkles },
    { id: 'upload',      label: 'Upload Regulations',       category: 'Ingestion',  icon: FileText },
    { id: 'regulations', label: 'Regulations Catalog',      category: 'Library',    icon: FileText },
    { id: 'obligations', label: 'Obligations Matrix',       category: 'Audit',      icon: ShieldAlert },
    { id: 'tasks',       label: 'Compliance Tasks',         category: 'Workflow',   icon: CheckSquare },
    { id: 'gap',         label: 'Gap Analysis',             category: 'Audit',      icon: GitCompare },
    { id: 'evidence',    label: 'Evidence Repository',      category: 'Records',    icon: FileText },
    { id: 'reports',     label: 'Report Builder',           category: 'Reports',    icon: FileText },
    { id: 'feed',        label: 'Regulatory Feed Monitor',  category: 'Live Data',  icon: Bell },
    { id: 'settings',    label: 'Settings & Config',        category: 'Admin',      icon: Settings },
  ];

  const searchResults = navItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectNav = (id) => {
    if (setPage) setPage(id);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleNotificationClick = (item) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    if (setPage && item.page) setPage(item.page);
    setNotificationsOpen(false);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <header className="h-14 glass-panel border border-white/80 px-6 flex items-center justify-between shrink-0 shadow-[0_8px_32px_rgba(15,23,42,0.05)] mb-6 mx-8 mt-6 rounded-full relative z-30">
      
      {/* Title */}
      <div className="flex flex-col">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          {titles[currentPage] || 'Compliance Control Hub'}
        </h2>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        
        {/* 1. Date & Time Pill with Popover */}
        <div className="relative" ref={calRef}>
          <button 
            onClick={() => setCalendarOpen(prev => !prev)}
            title="System Calendar & Active Audit Window"
            className="flex items-center gap-2 text-xs text-slate-700 bg-white/70 hover:bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm transition-all cursor-pointer font-bold"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>{formattedDate}</span>
          </button>

          {calendarOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">System Time</span>
                <span className="text-xs font-black text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  {formattedTime}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold text-slate-400">Fiscal Period:</span>
                  <span className="font-bold text-slate-800">Q2 FY2026-27</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold text-slate-400">Audit Cycle:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                    Active (Semi-Annual)
                  </span>
                </div>
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                  <p className="font-bold text-amber-950 mb-0.5">Next Statutory Deadline:</p>
                  SEBI Half-Yearly Compliance Audit due in 34 days.
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 2. Global Spotlight Search Button */}
        <button 
          onClick={() => setSearchOpen(true)}
          title="Spotlight Search (Cmd+K)"
          className="w-9 h-9 rounded-full bg-white/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white hover:text-amber-600 shadow-sm transition-all cursor-pointer hover:border-amber-300"
        >
          <Search className="w-4 h-4" />
        </button>
        
        {/* 3. Notification Bell with Popover */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setNotificationsOpen(prev => !prev)}
            title="Compliance Notifications"
            className="w-9 h-9 rounded-full bg-white/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white hover:text-amber-600 shadow-sm transition-all relative cursor-pointer hover:border-amber-300"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-84 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Alerts & Feeds</h4>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 hover:bg-amber-50/40 transition cursor-pointer flex items-start gap-3 ${
                      item.read ? 'opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.read ? 'bg-transparent' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                        <span className="text-[9px] font-bold text-slate-400 shrink-0">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                <button 
                  onClick={() => { if (setPage) setPage('feed'); setNotificationsOpen(false); }}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 transition flex items-center justify-center gap-1.5 w-full py-1 cursor-pointer"
                >
                  <span>Open Full Regulatory Feed</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Settings Shortcut */}
        <button 
          onClick={() => setPage && setPage('settings')}
          title="System Settings & Config"
          className="w-9 h-9 rounded-full bg-white/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white hover:text-amber-600 shadow-sm transition-all cursor-pointer hover:border-amber-300"
        >
          <Settings className="w-4 h-4" />
        </button>

      </div>

      {/* Global Spotlight Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center pt-24 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Search className="w-5 h-5 text-amber-600 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages, regulations, obligations, tasks... (Cmd+K)"
                className="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => setSearchOpen(false)}
                className="px-2 py-1 rounded-lg bg-slate-200/80 text-[10px] font-black text-slate-600 hover:bg-slate-300 transition"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-black tracking-wider text-slate-400">
                Navigation & Modules ({searchResults.length})
              </div>

              {searchResults.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50/60 transition group text-left cursor-pointer border border-transparent hover:border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-amber-100 group-hover:text-amber-800 text-slate-600 flex items-center justify-center transition">
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-amber-950">{item.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{item.category}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition -translate-x-1 group-hover:translate-x-0" />
                  </button>
                );
              })}

              {searchResults.length === 0 && (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-bold text-slate-600">No matching items found</p>
                  <p className="text-[11px]">Try searching for "chat", "tasks", "regulations", or "diff"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-medium px-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                  <Command className="w-3 h-3" /> K
                </span>
                <span>to toggle anytime</span>
              </div>
              <span>Click or press ESC to dismiss</span>
            </div>

          </div>
        </div>
      )}

    </header>
  );
}
