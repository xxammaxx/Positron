import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell.js';
import DashboardPage from './components/dashboard/DashboardPage.js';
import RunsPage from './components/runs/RunsPage.js';
import EvidencePage from './components/evidence/EvidencePage.js';
import Repositories from './components/Repositories.js';
import RunDetail from './components/RunDetail.js';
import SettingsPage from './components/settings/SettingsPage.js';
import AdminPage from './components/admin/AdminPage.js';
import NotFound from './components/NotFound.js';

export default function App(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:id" element={<RunDetail />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/repos" element={<Repositories />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
