// Positron — Oversight Page
// PR 7: Oversight UI Foundation + Human Question Queue
// Read-only display of human oversight questions. No execution buttons.

import React, { useEffect, useState } from 'react';
import HumanQuestionQueue from '../components/oversight/HumanQuestionQueue.jsx';
import type { HumanQuestion } from '../types.js';

export default function OversightPage(): React.ReactElement {
	const [questions, setQuestions] = useState<HumanQuestion[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchQuestions = async () => {
		try {
			setLoading(true);
			const res = await fetch('/api/oversight/questions?status=open');
			if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
			const data = await res.json();
			setQuestions(data.questions ?? []);
			setError(null);
		} catch (err) {
			setError(String(err));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchQuestions();
		// Poll every 10 seconds
		const interval = setInterval(fetchQuestions, 10000);
		return () => clearInterval(interval);
	}, []);

	if (loading) {
		return (
			<div className="max-w-4xl mx-auto p-6">
				<h1 className="text-2xl font-bold mb-4">Human Oversight</h1>
				<p className="text-gray-500">Loading questions...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-4xl mx-auto p-6">
				<h1 className="text-2xl font-bold mb-4">Human Oversight</h1>
				<div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h1 className="text-2xl font-bold mb-2">Human Oversight</h1>
			<p className="text-gray-500 mb-6">
				Review and respond to questions that require human judgment.
				Decisions are stored for audit — no actions are executed automatically.
			</p>

			<HumanQuestionQueue
				questions={questions}
				onRefresh={fetchQuestions}
			/>
		</div>
	);
}
