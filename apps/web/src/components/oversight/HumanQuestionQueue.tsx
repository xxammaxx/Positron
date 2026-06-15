// Positron — Human Question Queue Component
// PR 7: Oversight UI Foundation
// Lists open human oversight questions. No execution buttons.

import React from 'react';
import ApprovalRequestCard from './ApprovalRequestCard.jsx';
import type { HumanQuestion } from '../../types.js';

interface HumanQuestionQueueProps {
	questions: HumanQuestion[];
	onRefresh: () => void;
}

export default function HumanQuestionQueue({
	questions,
	onRefresh,
}: HumanQuestionQueueProps): React.ReactElement {
	if (questions.length === 0) {
		return (
			<div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
				<div className="text-4xl mb-3">✅</div>
				<p className="text-lg font-medium text-gray-700">No open questions</p>
				<p className="text-sm text-gray-500 mt-1">
					All human oversight questions have been addressed.
				</p>
				<button
					type="button"
					onClick={onRefresh}
					className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
				>
					Refresh
				</button>
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold">
					Open Questions ({questions.length})
				</h2>
				<button
					type="button"
					onClick={onRefresh}
					className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
				>
					Refresh
				</button>
			</div>

			<div className="space-y-4">
				{questions.map((q) => (
					<ApprovalRequestCard key={q.id} question={q} onRefresh={onRefresh} />
				))}
			</div>
		</div>
	);
}
