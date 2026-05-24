import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard.js';
import Repositories from './components/Repositories.js';
import RunDetail from './components/RunDetail.js';
import NotFound from './components/NotFound.js';
import HealthIndicator from './components/HealthIndicator.js';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
  }`;

export default function App(): React.ReactElement {
  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="text-blue-400 text-xl font-bold">
                ⚡ Positron
              </span>
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-md">
                v3.0
              </span>
            </NavLink>
            <div className="flex items-center gap-2">
              <NavLink to="/" end className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/repos" className={navLinkClass}>
                Repositories
              </NavLink>
            </div>
          </div>
          <HealthIndicator />
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/repos" element={<Repositories />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
