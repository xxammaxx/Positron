import React from 'react';

interface StatusCardProps {
	/** The main numeric or text value */
	value: string | number;
	/** Label describing the metric */
	label: string;
	/** Status variant */
	variant?: 'pass' | 'partial' | 'fail' | 'active' | 'blocked' | 'neutral';
	/** Optional subtitle/trend */
	subtitle?: string;
	/** Optional icon */
	icon?: React.ReactNode;
}

const variantBorderMap: Record<string, string> = {
	pass: 'border-l-emerald-400 bg-emerald-500/10',
	partial: 'border-l-amber-400 bg-amber-500/10',
	fail: 'border-l-red-400 bg-red-500/10',
	active: 'border-l-sky-400 bg-sky-500/10',
	blocked: 'border-l-orange-400 bg-orange-500/10',
	neutral: 'border-l-white/20 bg-white/5',
};

const variantColorMap: Record<string, string> = {
	pass: 'text-emerald-300',
	partial: 'text-amber-300',
	fail: 'text-red-300',
	active: 'text-sky-300',
	blocked: 'text-orange-300',
	neutral: 'text-body',
};

export default function StatusCard({
	value,
	label,
	variant = 'neutral',
	subtitle,
	icon,
}: StatusCardProps): React.ReactElement {
	const borderClass = variantBorderMap[variant] ?? variantBorderMap.neutral;
	const valueColor = variantColorMap[variant] ?? variantColorMap.neutral;

	return (
		<div className={`card group border-l-4 ${borderClass}`}>
			<div className="flex items-start justify-between gap-3 mb-4">
				<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">{label}</p>
				{icon && (
					<span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-body transition-transform duration-200 group-hover:-translate-y-0.5">
						{icon}
					</span>
				)}
			</div>
			<p className={`text-3xl font-semibold tracking-tight md:text-4xl ${valueColor}`}>{value}</p>
			{subtitle && <p className="mt-2 text-xs text-muted">{subtitle}</p>}
		</div>
	);
}
