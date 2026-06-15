// Positron — Risk Decision Panel
// PR 7: Oversight UI Foundation
// Decision controls for human oversight questions.
// NO execute/install/run/merge/push buttons — decisions are stored only.

import React, { useState } from 'react';
import type { HumanQuestion } from '../../types.js';

interface RiskDecisionPanelProps {
	question: HumanQuestion;
	onDecision: (decision: string, answerText?: string) => void;
	submitting: boolean;
}

const DECISION_LABELS: Record<string, string> = {
	ALLOW: 'Allow',
	DENY: 'Deny',
	ASK_MORE: 'Ask for More Info',
	REQUIRE_DRY_RUN: 'Require Dry Run',
	REQUIRE_BACKUP: 'Require Backup',
	REQUIRE_REVIEW: 'Require Review',
	PAUSE_RUN: 'Pause Run',
	ABORT_RUN: 'Abort Run',
};

const DECISION_COLORS: Record<string, string> = {
	ALLOW: 'bg-green-600 hover:bg-green-700 text-white',
	DENY: 'bg-red-600 hover:bg-red-700 text-white',
	ASK_MORE: 'bg-yellow-500 hover:bg-yellow-600 text-black',
	REQUIRE_DRY_RUN: 'bg-blue-500 hover:bg-blue-600 text-white',
	REQUIRE_BACKUP: 'bg-purple-500 hover:bg-purple-600 text-white',
	REQUIRE_REVIEW: 'bg-indigo-500 hover:bg-indigo-600 text-white',
	PAUSE_RUN: 'bg-orange-500 hover:bg-orange-600 text-white',
	ABORT_RUN: 'bg-red-700 hover:bg-red-800 text-white',
};

export default function RiskDecisionPanel({
	question,
	onDecision,
	submitting,
}: RiskDecisionPanelProps): React.ReactElement {
	const [answerText, setAnswerText] = useState('');

	// ALLOW not default for critical
	const isCritical = question.riskLevel === 'critical';
	const allowDisabled = isCritical || !question.allowedDecisions.includes('ALLOW');
	const allowReason = isCritical
		? 'ALLOW disabled: critical risk level'
		: !question.allowedDecisions.includes('ALLOW')
			? 'ALLOW not in allowed decisions'
			: undefined;

	return (
		<div>
			<p className="text-sm font-medium text-gray-700 mb-2">Decision</p>

			<div className="flex flex-wrap gap-2 mb-3">
				{question.allowedDecisions.map((decision) => {
					const isAllow = decision === 'ALLOW';
					const disabled = isAllow ? allowDisabled : false;

					return (
						<button
							key={decision}
							type="button"
							disabled={submitting || disabled}
							title={
								disabled && allowReason
									? allowReason
									: DECISION_LABELS[decision] ?? decision
							}
							onClick={() => onDecision(decision, answerText || undefined)}
							className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
								DECISION_COLORS[decision] ?? 'bg-gray-500 hover:bg-gray-600 text-white'
							} ${
								submitting || disabled
									? 'opacity-50 cursor-not-allowed'
									: 'cursor-pointer'
							}`}
						>
							{DECISION_LABELS[decision] ?? decision}
						</button>
					);
				})}

		{/* Explicit PAUSE_RUN and ABORT_RUN buttons (only when in allowedDecisions for safety) */}
		{question.allowedDecisions.includes('PAUSE_RUN') && (
			<button
				type="button"
				disabled={submitting}
				onClick={() => onDecision('PAUSE_RUN')}
				className="px-3 py-1.5 rounded text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white cursor-pointer disabled:opacity-50"
			>
				Pause Run
			</button>
		)}
		{question.allowedDecisions.includes('ABORT_RUN') && (
			<button
				type="button"
				disabled={submitting}
				onClick={() => onDecision('ABORT_RUN')}
				className="px-3 py-1.5 rounded text-sm font-medium bg-red-700 hover:bg-red-800 text-white cursor-pointer disabled:opacity-50"
			>
				Abort Run
			</button>
		)}
			</div>

			{/* Answer text input */}
			<div className="mb-2">
				<label className="text-xs text-gray-500 block mb-1">
					Optional comment (will be redacted if it contains secrets)
				</label>
				<textarea
					value={answerText}
					onChange={(e) => setAnswerText(e.target.value)}
					disabled={submitting}
					rows={2}
					className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
					placeholder="Enter optional context for your decision..."
				/>
			</div>

			{/* Safety notice for critical */}
			{isCritical && (
				<p className="text-xs text-red-600 mt-1">
					Critical risk — ALLOW is disabled. Default is DENY.
				</p>
			)}

			{/* Default decision notice */}
			<p className="text-xs text-gray-400 mt-1">
				Default decision: {DECISION_LABELS[question.defaultDecision] ?? question.defaultDecision}
				{question.expiresAt && (
					<> — Expires: {new Date(question.expiresAt).toLocaleString()}</>
				)}
			</p>
		</div>
	);
}
