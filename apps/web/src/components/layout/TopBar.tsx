import type React from 'react';
import { NavLink } from 'react-router-dom';
import HealthIndicator from '../HealthIndicator.js';
import ThemeToggle from '../ThemeToggle.js';

interface TopBarProps {
	onToggleSidebar?: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps): React.ReactElement {
	return (
		<header className="h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0">
			{/* Left: Toggle + Logo */}
			<div className="flex items-center gap-3">
				{onToggleSidebar && (
					<button
						onClick={onToggleSidebar}
						className="btn-ghost p-1.5 lg:hidden"
						aria-label="Toggle sidebar"
					>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
							<path
								fillRule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				)}
				<NavLink to="/" className="flex items-center gap-2.5 no-underline">
					<span className="text-blue-400 text-lg font-bold tracking-tight">Positron</span>
					<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-600/30 text-blue-300 rounded-md border border-blue-700/30">
						v0.1
					</span>
				</NavLink>
			</div>

			{/* Right: Theme Toggle + Health */}
			<div className="flex items-center gap-2">
				<ThemeToggle />
				<HealthIndicator />
			</div>
		</header>
	);
}
