import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FileText, 
  ShieldAlert, 
  CheckSquare, 
  GitCompare, 
  FolderLock, 
  FileDown, 
  BarChart2, 
  Settings, 
  MessageSquare, 
  LogOut, 
  Swords, 
  Scale, 
  Rss, 
  GitCompareArrows, 
  PanelLeftClose, 
  PanelLeftOpen 
} from 'lucide-react';

export default function Sidebar({ currentPage, setPage, onLogout, username, role }) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard',   label: 'Dashboard',           icon: LayoutDashboard },
    { id: 'chat',        label: 'AI Compliance Chat',  icon: MessageSquare },
    { id: 'upload',      label: 'Upload Regulations',  icon: UploadCloud },
    { id: 'regulations', label: 'Regulations Catalog', icon: FileText },
    { id: 'obligations', label: 'Obligations Matrix',  icon: ShieldAlert },
    { id: 'tasks',       label: 'Compliance Tasks',    icon: CheckSquare },
    { id: 'gap',         label: 'Gap Analysis',        icon: GitCompare },
    { id: 'evidence',    label: 'Evidence Repository', icon: FolderLock },
    { id: 'reports',     label: 'Report Builder',      icon: FileDown },
    { id: 'feed',        label: 'Regulatory Feed',     icon: Rss },
    { id: 'settings',    label: 'Settings & Config',   icon: Settings },
  ];

  return (
    <aside
      className={`glass-sidebar h-[calc(100vh-32px)] my-4 ml-4 rounded-[32px] flex flex-col justify-between shrink-0 relative z-20 overflow-hidden transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className={`shrink-0 ${collapsed ? 'p-3 pt-5' : 'p-6 pb-2'}`}>
        <div className={`flex items-center mb-4 mt-2 ${collapsed ? 'justify-center' : 'gap-4 px-2'}`}>
          <div className="glass-icon-btn p-3 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-slate-800" fill="currentColor" fillOpacity={0.2} />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-extrabold text-[17px] leading-tight tracking-[0.1em] text-slate-800">AEGISCOMPLY</h1>
              <p className="text-[10px] text-orange-600 uppercase tracking-widest font-bold">Compliance Hub</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation list */}
      <div className={`flex-1 overflow-y-auto py-2 space-y-1.5 custom-scrollbar ${collapsed ? 'px-2' : 'px-6'}`}>
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-left transition-all duration-200 ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'glass-pill-active text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  isActive
                    ? 'bg-white text-orange-600 border border-slate-200 shadow-sm'
                    : 'glass-icon-btn text-slate-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className={`pt-3 space-y-3 shrink-0 ${collapsed ? 'p-3' : 'p-6'}`}>
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-full glass-pill-inactive flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-slate-800 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-sm">Hide Sidebar</span>
            </>
          )}
        </button>

        {/* User profile */}
        {!collapsed && (
          <button className="w-full glass-pill-inactive flex items-center justify-between p-2 pr-4 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white shadow-md relative shrink-0">
                {username.slice(0, 2).toUpperCase()}
                <div className="absolute w-3 h-3 bg-emerald-500 border-2 border-white rounded-full bottom-0 right-0 transform translate-x-1/4 translate-y-1/4"></div>
              </div>
              <div className="text-left min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate">{username}</p>
                <p className="text-[10px] text-slate-500 truncate">{role.replace('_', ' ')}</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-slate-800 shrink-0"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        )}

        {/* Collapsed Avatar */}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white text-xs shadow-md relative" title={username}>
              {username.slice(0, 2).toUpperCase()}
              <div className="absolute w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full bottom-0 right-0 transform translate-x-1/4 translate-y-1/4"></div>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={onLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full glass-pill-inactive flex items-center gap-3 px-4 py-2.5 text-rose-500 group ${collapsed ? 'justify-center px-2' : 'justify-center'}`}
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
          {!collapsed && <span className="font-semibold text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
