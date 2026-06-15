// Positron — Blueprint Launcher Page
// PR 9: Blueprint Launcher Foundation + Validation
// Minimal UI for blueprint import, validation, and run-plan creation.
// NO execute buttons. NO runtime execution. NO install/download.
// "Create Run Plan" button exists — but it only generates a draft.

import React, { useState } from 'react';

interface BlueprintValidationResponse {
	blueprint: {
		blueprintId: string;
		filename?: string;
		title?: string;
		sectionKinds: string[];
	};
	validation: {
		status: string;
		warningCount: number;
		criticalCount: number;
		highCount: number;
		missingRequiredSections: string[];
		blockedReasons: string[];
	};
}

interface BlueprintImportResponse {
	blueprintId: string;
	status: string;
	sectionCount: number;
	warningCount: number;
	note: string;
}

interface RunPlanResponse {
	runPlan: {
		runPlanId: string;
		blueprintId: string;
		status: string;
		blockedReasons: string[];
	};
	gateCheck: {
		overall: string;
		blockedReasons: string[];
	};
	humanQuestion: {
		id: string;
		type: string;
		riskLevel: string;
		defaultDecision: string;
		note: string;
	} | null;
	note: string;
}

export default function BlueprintLauncherPage(): React.ReactElement {
	const [markdown, setMarkdown] = useState('');
	const [validation, setValidation] = useState<BlueprintValidationResponse | null>(null);
	const [importResult, setImportResult] = useState<BlueprintImportResponse | null>(null);
	const [runPlan, setRunPlan] = useState<RunPlanResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'input' | 'validation' | 'runplan'>('input');

	const handleValidate = async () => {
		try {
			setLoading(true);
			setError(null);
			setValidation(null);
			setImportResult(null);
			setRunPlan(null);

			const res = await fetch('/api/blueprints/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ markdown, filename: 'blueprint.md' }),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || err.details || `HTTP ${res.status}`);
			}

			const data = await res.json();
			setValidation(data);
			setActiveTab('validation');
		} catch (err) {
			setError(String(err));
		} finally {
			setLoading(false);
		}
	};

	const handleImport = async () => {
		try {
			setLoading(true);
			setError(null);

			const res = await fetch('/api/blueprints/import', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ markdown, filename: 'blueprint.md' }),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || err.details || `HTTP ${res.status}`);
			}

			const data = await res.json();
			setImportResult(data);
		} catch (err) {
			setError(String(err));
		} finally {
			setLoading(false);
		}
	};

	const handleCreateRunPlan = async () => {
		const bpId = importResult?.blueprintId;
		if (!bpId) return;

		try {
			setLoading(true);
			setError(null);

			const res = await fetch(`/api/blueprints/${bpId}/create-run-plan`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || err.details || `HTTP ${res.status}`);
			}

			const data = await res.json();
			setRunPlan(data);
			setActiveTab('runplan');
		} catch (err) {
			setError(String(err));
		} finally {
			setLoading(false);
		}
	};

	const statusBadge = (status: string) => {
		const colors: Record<string, string> = {
			pass: 'bg-green-100 text-green-800',
			partial: 'bg-yellow-100 text-yellow-800',
			fail: 'bg-red-100 text-red-800',
			blocked: 'bg-red-200 text-red-900',
			draft: 'bg-blue-100 text-blue-800',
			waiting_for_human: 'bg-purple-100 text-purple-800',
			ready_for_gate_check: 'bg-teal-100 text-teal-800',
		};
		return (
			<span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
				{status}
			</span>
		);
	};

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h1 className="text-2xl font-bold mb-2">Blueprint Launcher</h1>
			<p className="text-gray-500 mb-2">
				Import a Positron Markdown blueprint to validate it and create a run plan.
			</p>
			<div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-6 text-sm text-yellow-800">
				<strong>Note:</strong> No runtime execution in this version. Blueprint start-run creates
				a run plan and human approval question only. Execution happens through the gated pipeline
				in a future release.
			</div>

			{/* Tab Navigation */}
			<div className="flex gap-2 mb-4 border-b">
				{[
					{ key: 'input' as const, label: 'Input' },
					{ key: 'validation' as const, label: `Validation${validation ? ` (${validation.validation.status})` : ''}` },
					{ key: 'runplan' as const, label: `Run Plan${runPlan ? ` (${runPlan.runPlan.status})` : ''}` },
				].map((tab) => (
					<button
						key={tab.key}
						onClick={() => setActiveTab(tab.key)}
						className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
							activeTab === tab.key
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Error Display */}
			{error && (
				<div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-red-700">
					{error}
				</div>
			)}

			{/* Tab: Input */}
			{activeTab === 'input' && (
				<div>
					<textarea
						className="w-full h-64 p-3 border rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder={`# Project Goal
Describe what this blueprint should accomplish.

## Hard Constraints
- No auto-merge
- No secrets
- Human approval required

## Expected Result Format
Describe the expected output.

## Software Capability Delta
What can the software do now compared to the previous run?`}
						value={markdown}
						onChange={(e) => setMarkdown(e.target.value)}
						disabled={loading}
					/>

					<div className="flex gap-2 mt-3">
						<button
							onClick={handleValidate}
							disabled={loading || !markdown.trim()}
							className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Validating...' : 'Validate'}
						</button>
						<button
							onClick={handleImport}
							disabled={loading || !markdown.trim()}
							className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? 'Importing...' : 'Import'}
						</button>
					</div>

					{importResult && (
						<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
							<p className="text-sm text-blue-800">
								Blueprint imported: <code className="text-xs">{importResult.blueprintId}</code>
							</p>
						</div>
					)}
				</div>
			)}

			{/* Tab: Validation */}
			{activeTab === 'validation' && validation && (
				<div>
					<div className="flex items-center gap-3 mb-4">
						<h2 className="text-lg font-semibold">Validation Result</h2>
						{statusBadge(validation.validation.status)}
					</div>

					<div className="grid grid-cols-3 gap-4 mb-4">
						<div className="bg-gray-50 rounded p-3">
							<div className="text-2xl font-bold">{validation.validation.warningCount}</div>
							<div className="text-xs text-gray-500">Total Warnings</div>
						</div>
						<div className="bg-red-50 rounded p-3">
							<div className="text-2xl font-bold text-red-700">{validation.validation.criticalCount}</div>
							<div className="text-xs text-gray-500">Critical</div>
						</div>
						<div className="bg-yellow-50 rounded p-3">
							<div className="text-2xl font-bold text-yellow-700">{validation.validation.highCount}</div>
							<div className="text-xs text-gray-500">High</div>
						</div>
					</div>

					{validation.validation.missingRequiredSections.length > 0 && (
						<div className="mb-4">
							<h3 className="text-sm font-semibold mb-1 text-yellow-700">Missing Required Sections</h3>
							<ul className="list-disc list-inside text-sm text-gray-600">
								{validation.validation.missingRequiredSections.map((s) => (
									<li key={s}>{s}</li>
								))}
							</ul>
						</div>
					)}

					{validation.validation.blockedReasons.length > 0 && (
						<div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
							<h3 className="text-sm font-semibold mb-1 text-red-700">Blocked Reasons</h3>
							<ul className="list-disc list-inside text-sm text-red-600">
								{validation.validation.blockedReasons.map((r, i) => (
									<li key={i}>{r}</li>
								))}
							</ul>
						</div>
					)}

					{validation.blueprint.sectionKinds.length > 0 && (
						<div className="mb-4">
							<h3 className="text-sm font-semibold mb-1">Detected Sections</h3>
							<div className="flex flex-wrap gap-1">
								{validation.blueprint.sectionKinds.map((k) => (
									<span key={k} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
										{k}
									</span>
								))}
							</div>
						</div>
					)}

					{importResult && (
						<button
							onClick={handleCreateRunPlan}
							disabled={loading}
							className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
						>
							{loading ? 'Creating...' : 'Create Run Plan'}
						</button>
					)}
				</div>
			)}

			{/* Tab: Run Plan */}
			{activeTab === 'runplan' && runPlan && (
				<div>
					<div className="flex items-center gap-3 mb-4">
						<h2 className="text-lg font-semibold">Run Plan</h2>
						{statusBadge(runPlan.runPlan.status)}
					</div>

					<div className="bg-gray-50 rounded p-4 mb-4">
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<span className="text-gray-500">Run Plan ID:</span>{' '}
								<code className="text-xs">{runPlan.runPlan.runPlanId}</code>
							</div>
							<div>
								<span className="text-gray-500">Blueprint ID:</span>{' '}
								<code className="text-xs">{runPlan.runPlan.blueprintId}</code>
							</div>
							<div>
								<span className="text-gray-500">Gate Status:</span>{' '}
								{statusBadge(runPlan.gateCheck.overall)}
							</div>
						</div>
					</div>

					{runPlan.runPlan.blockedReasons.length > 0 && (
						<div className="mb-4 bg-red-50 border border-red-200 rounded p-3">
							<h3 className="text-sm font-semibold mb-1 text-red-700">Blocked Reasons</h3>
							<ul className="list-disc list-inside text-sm text-red-600">
								{runPlan.runPlan.blockedReasons.map((r, i) => (
									<li key={i}>{r}</li>
								))}
							</ul>
						</div>
					)}

					{runPlan.humanQuestion && (
						<div className="mb-4 bg-purple-50 border border-purple-200 rounded p-3">
							<h3 className="text-sm font-semibold mb-1 text-purple-700">
								Human Approval Required
							</h3>
							<div className="text-sm text-gray-600 space-y-1">
								<div>Risk Level: {statusBadge(runPlan.humanQuestion.riskLevel)}</div>
								<div>Default Decision: <code className="text-xs">{runPlan.humanQuestion.defaultDecision}</code></div>
								<div>Type: {runPlan.humanQuestion.type}</div>
							</div>
							<p className="text-xs text-gray-500 mt-2">{runPlan.humanQuestion.note}</p>
						</div>
					)}

					<p className="text-xs text-gray-500 mt-4">{runPlan.note}</p>
				</div>
			)}
		</div>
	);
}
