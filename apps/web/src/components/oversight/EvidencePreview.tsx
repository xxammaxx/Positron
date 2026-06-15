// Positron — Evidence Preview Component
// PR 7: Oversight UI Foundation
// Displays evidence references for a human oversight question.

import React from 'react';

interface EvidencePreviewProps {
	evidenceRefs: string[];
}

export default function EvidencePreview({
	evidenceRefs,
}: EvidencePreviewProps): React.ReactElement {
	return (
		<div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
			<p className="font-medium text-gray-700 mb-1">Evidence References:</p>
			<ul className="list-disc list-inside text-gray-600 space-y-0.5">
				{evidenceRefs.map((ref, i) => (
					<li key={i}>{ref}</li>
				))}
			</ul>
		</div>
	);
}
