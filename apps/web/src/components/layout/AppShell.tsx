import type React from 'react';
import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell(): React.ReactElement {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const toggleSidebar = useCallback(() => {
		setSidebarOpen((prev) => !prev);
	}, []);

	const closeSidebar = useCallback(() => {
		setSidebarOpen(false);
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
				{/* Sidebar — handles mobile overlay + desktop sidebar internally */}
				<Sidebar open={sidebarOpen} onClose={closeSidebar} />

				{/* Main Content */}
				<main id="main-content" className="flex-1 overflow-y-auto min-w-0">
					<div className="p-4 sm:p-6">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
