// Positron — Approval Request Card
// PR 7: Oversight UI Foundation
// Displays a single human oversight question with decision controls.
// NO execution buttons — decisions are stored, not acted upon.

import React, { useState } from 'react';
import RiskDecisionPanel from './RiskDecisionPanel.jsx';
import EvidencePreview from './EvidencePreview.jsx';
import type { HumanQuestion } from '../../types.js';

interface ApprovalRequestCardProps {
	question: HumanQuestion;
	onRefresh: () => void;
}

function riskBadge(risk: string): { color: string; label: string } {
	switch (risk) {
		case 'critical':
			return { color: 'bg-red-600 text-white', label: 'CRITICAL' };
		case 'high':
			return { color: 'bg-orange-500 text-white', label: 'HIGH' };
		case 'medium':
			return { color: 'bg-yellow-500 text-black', label: 'MEDIUM' };
		case 'low':
			return { color: 'bg-green-500 text-white', label: 'LOW' };
		default:
			return { color: 'bg-gray-400 text-white', label: risk.toUpperCase() };
	}
}

function statusBadge(status: string): { color: string; label: string } {
	switch (status) {
		case 'open':
			return { color: 'bg-blue-100 text-blue-800', label: 'Open' };
		case 'answered':
			return { color: 'bg-green-100 text-green-800', label: 'Answered' };
		case 'denied':
			return { color: 'bg-red-100 text-red-800', label: 'Denied' };
		case 'expired':
			return { color: 'bg-gray-100 text-gray-800', label: 'Expired' };
		case 'cancelled':
			return { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' };
		default:
			return { color: 'bg-gray-100 text-gray-800', label: status };
	}
}

function formatDate(isoString: string): string {
	try {
		return new Date(isoString).toLocaleString();
	} catch {
		return isoString;
	}
}

export default function ApprovalRequestCard({
	question,
	onRefresh,
}: ApprovalRequestCardProps): React.ReactElement {
	const [expanded, setExpanded] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const risk = riskBadge(question.riskLevel);
	const status = statusBadge(question.status);

	const isOpen = question.status === 'open';

	const handleDecision = async (
		decision: string,
		answerText?: string,
	) => {
		setSubmitting(true);
		setError(null);

		try {
			let res: Response;
			if (decision === 'PAUSE_RUN') {
				res = await fetch(`/api/oversight/questions/${question.id}/pause-run`, {
					method: 'POST',
				});
			} else if (decision === 'ABORT_RUN') {
				res = await fetch(`/api/oversight/questions/${question.id}/abort-run`, {
					method: 'POST',
				});
			} else {
				res = await fetch(`/api/oversight/questions/${question.id}/answer`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ decision, answerText }),
				});
			}

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || body.details?.[0] || `HTTP ${res.status}`);
			}

			onRefresh();
		} catch (err) {
			setError(String(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-sm">
			{/* Header */}
			<div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className={`px-2 py-0.5 rounded text-xs font-bold ${risk.color}`}>
						{risk.label}
					</span>
					<span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
						{status.label}
					</span>
					<span className="text-xs text-gray-400">{question.type}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-gray-400">
						{formatDate(question.createdAt)}
					</span>
				</div>
			</div>

			{/* Body */}
			<div className="px-4 py-3">
				<h3 className="font-semibold text-gray-900 mb-1">{question.title}</h3>
				<p className="text-sm text-gray-600 whitespace-pre-wrap">{question.question}</p>

				{/* Meta details */}
				<div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
					{question.requestedBy && (
						<span className="bg-gray-50 px-2 py-0.5 rounded">
							Requested by: {question.requestedBy}
						</span>
					)}
					{question.proposedAction && (
						<span className="bg-gray-50 px-2 py-0.5 rounded">
							Proposed: {question.proposedAction}
						</span>
					)}
					{question.target && (
						<span className="bg-gray-50 px-2 py-0.5 rounded">
							Target: {question.target}
						</span>
					)}
					{question.runId && (
						<span className="bg-gray-50 px-2 py-0.5 rounded">
							Run: {question.runId}
						</span>
					)}
					{question.issueNumber && (
						<span className="bg-gray-50 px-2 py-0.5 rounded">
							Issue: #{question.issueNumber}
						</span>
					)}
				</div>

				{/* Blocked reasons */}
				{question.blockedReasons && question.blockedReasons.length > 0 && (
					<div className="mt-3">
						<span className="text-xs font-medium text-red-600">Blocked reasons:</span>
						<ul className="list-disc list-inside text-xs text-red-500 mt-1">
							{question.blockedReasons.map((reason, i) => (
								<li key={i}>{reason}</li>
							))}
						</ul>
					</div>
				)}

				{/* Evidence refs (expandable) */}
				{question.evidenceRefs && question.evidenceRefs.length > 0 && (
					<div className="mt-3">
						<button
							type="button"
							onClick={() => setExpanded(!expanded)}
							className="text-xs text-blue-600 hover:text-blue-800 underline"
						>
							{expanded ? 'Hide' : 'Show'} evidence references ({question.evidenceRefs.length})
						</button>
						{expanded && (
							<EvidencePreview evidenceRefs={question.evidenceRefs} />
						)}
					</div>
				)}

				{/* Existing answer */}
				{!isOpen && question.decision && (
					<div className="mt-3 p-3 bg-gray-50 rounded">
						<p className="text-sm">
							<span className="font-medium">
								Decision: {question.decision}
							</span>
							{question.answeredAt && (
								<span className="text-gray-400 ml-2">
									({formatDate(question.answeredAt)})
								</span>
							)}
						</p>
						{question.answerText && (
							<p className="text-sm text-gray-600 mt-1">
								&quot;{question.answerText}&quot;
							</p>
						)}
					</div>
				)}
			</div>

			{/* Decision panel (only for open questions) */}
			{isOpen && (
				<div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
					<RiskDecisionPanel
						question={question}
						onDecision={handleDecision}
						submitting={submitting}
					/>
					{error && (
						<p className="text-red-500 text-sm mt-2">{error}</p>
					)}
				</div>
			)}
		</div>
	);
}
