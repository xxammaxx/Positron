import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.js';
import Sidebar from './Sidebar.js';

export default function AppShell(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950">
      {/* Skip to content */}
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>

      {/* Top Bar */}
      <TopBar onToggleSidebar={toggleSidebar} />

      {/* Body: Sidebar + Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && <Sidebar />}

        {/* Main Content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
        >
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
