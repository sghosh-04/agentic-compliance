import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AIChat from './pages/AIChat';
import UploadDocuments from './pages/UploadDocuments';
import Regulations from './pages/Regulations';
import Obligations from './pages/Obligations';
import ComplianceTasks from './pages/ComplianceTasks';
import GapAnalysis from './pages/GapAnalysis';
import Evidence from './pages/Evidence';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import RegulatoryFeed from './pages/RegulatoryFeed';
import { apiFetch } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);

  // Authenticate user on load if token exists in storage
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    apiFetch('/auth/me')
      .then((profile) => {
        setIsAuthenticated(true);
        setUser(profile);
        localStorage.setItem('username', profile.username);
        localStorage.setItem('role', profile.role);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
      });
  }, []);

  const handleLoginSuccess = (profile) => {
    setIsAuthenticated(true);
    setUser(profile);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render other pages dynamically
  const renderOtherPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setPage={setCurrentPage} />;
      case 'upload':
        return <UploadDocuments />;
      case 'regulations':
        return <Regulations />;
      case 'obligations':
        return <Obligations />;
      case 'tasks':
        return <ComplianceTasks />;
      case 'gap':
        return <GapAnalysis />;
      case 'evidence':
        return <Evidence />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SettingsPage />;
      case 'feed':
        return <RegulatoryFeed />;
      default:
        return <Dashboard setPage={setCurrentPage} />;
    }
  };

  return (
    <>
      {/* Animated Background */}
      <div className="animated-bg-container">
        <div className="animated-bg-blob blob-1"></div>
        <div className="animated-bg-blob blob-2"></div>
        <div className="animated-bg-blob blob-3"></div>
      </div>

      <div className="flex h-screen overflow-hidden font-sans text-slate-800 relative z-10">
        {/* Sidebar Segment */}
        <Sidebar 
          currentPage={currentPage} 
          setPage={setCurrentPage} 
          onLogout={handleLogout}
          username={user?.username || 'officer'}
          role={user?.role || 'Compliance_Officer'}
        />

        {/* Primary Workspace Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Navbar currentPage={currentPage} setPage={setCurrentPage} />
          
          {/* Main Content Workspace */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {/* Persistently mounted AI Chat - continues processing in background when navigating */}
            <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${currentPage === 'chat' ? 'flex' : 'hidden'}`}>
              <AIChat />
            </div>

            {/* Other Pages */}
            {currentPage !== 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {renderOtherPage()}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
