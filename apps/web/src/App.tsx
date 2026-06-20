import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import DashboardPage from './components/dashboard/DashboardPage.jsx';
import RunsPage from './components/runs/RunsPage.jsx';
import EvidencePage from './components/evidence/EvidencePage.jsx';
import Repositories from './components/Repositories.jsx';
import RunDetail from './components/RunDetail.jsx';
import SettingsPage from './components/settings/SettingsPage.jsx';
import AdminPage from './components/admin/AdminPage.jsx';
import NotFound from './components/NotFound.jsx';

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
