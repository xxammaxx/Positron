#!/usr/bin/env node

/**
 * Issue Verification Script
 * ==========================
 * Prüft ob alle Akzeptanzkriterien eines Issues oder aller Issues erfuellt sind.
 *
 * Verwendung:
 *   node scripts/verify-issues.mjs <issue-number>
 *   node scripts/verify-issues.mjs all
 *
 * Umgebungsvariablen:
 *   GITHUB_TOKEN   - GitHub Personal Access Token
 *   REPO           - Repository (default: xxammaxx/Positron)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.REPO || 'xxammaxx/Positron';
const BRANCH = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
const COMMIT = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const REPORTS_DIR = join(__dirname, '..', 'reports');

function gh(args) {
	try {
		const result = execSync(`gh ${args} --repo ${REPO} 2>&1`, {
			encoding: 'utf8',
			maxBuffer: 10 * 1024 * 1024,
		});
		return result.trim();
	} catch (e) {
		console.error(`gh command failed: gh ${args}`);
		console.error(e.stderr || e.message);
		return null;
	}
}

function verifyIssue(issueNumber) {
	// Issue-Daten laden
	const issueJson = gh(`issue view ${issueNumber} --json number,title,body,state,labels,closedAt`);
	if (!issueJson) {
		console.error(`❌ Issue #${issueNumber} konnte nicht geladen werden`);
		return null;
	}

	const issue = JSON.parse(issueJson);
	const body = issue.body || '';

	// Akzeptanzkriterien extrahieren (Checkboxen)
	const checkboxRegex = /- \[([ x])\] (.+)/gi;
	const criteria = [];
	let match;
	while ((match = checkboxRegex.exec(body)) !== null) {
		criteria.push({
			checked: match[1] === 'x',
			text: match[2].trim(),
		});
	}

	if (criteria.length === 0) {
		// Fallback: Prüfe auf Known-Phrases im Body
		const knownSections = [
			/(?:acceptance criteria|akzeptanzkriterien)[:\s]*\n([\s\S]*?)(?:\n##|\n---|$)/i,
			/(?:definition of done|dod)[:\s]*\n([\s\S]*?)(?:\n##|\n---|$)/i,
		];

		for (const pattern of knownSections) {
			const sectionMatch = pattern.exec(body);
			if (sectionMatch) {
				const lines = sectionMatch[1]
					.split('\n')
					.map((l) => l.trim())
					.filter((l) => l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l));
				lines.forEach((l) =>
					criteria.push({ checked: false, text: l.replace(/^[-*\d]+\.?\s*/, '').trim() }),
				);
			}
		}
	}

	if (criteria.length === 0) {
		return {
			issue,
			criteria: [],
			result: 'NO_CRITERIA',
			details: 'Issue hat keine definierten Akzeptanzkriterien',
		};
	}

	// Suche nach zugehörigen Commits
	const commitMatches = execSync(`git log --all --oneline --grep="#${issueNumber}"`, {
		encoding: 'utf8',
		maxBuffer: 1024 * 1024,
	}).trim();

	// Prüfe auf to live in src/
	const _srcDir = join(__dirname, '..', 'apps');
	let codeMatches = 0;

	// Extrahiere Keywords aus den Kriterien
	const keywords = criteria.flatMap((c) =>
		c.text
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, '')
			.split(/\s+/)
			.filter(
				(w) =>
					w.length > 3 &&
					![
						'dass',
						'nach',
						'ohne',
						'wird',
						'eine',
						'einen',
						'einer',
						'eines',
						'diese',
						'dieser',
						'dieses',
						'durch',
						'über',
						'unter',
						'davon',
						'daran',
						'darin',
						'dabei',
						'damit',
						'dafür',
						'dagegen',
						'sowie',
						'oder',
						'aber',
						'auch',
						'noch',
						'schon',
						'erst',
						'sehr',
						'alle',
						'zwei',
						'drei',
					].includes(w),
			),
	);

	const uniqueKeywords = [...new Set(keywords)].slice(0, 8);

	for (const kw of uniqueKeywords) {
		try {
			// Cross-platform grep: ripgrep first, then fallback
			let grepResult;
			try {
				grepResult = execSync(`rg -l "${kw}" apps/ packages/ 2>&1`, {
					encoding: 'utf8',
					maxBuffer: 1024 * 1024,
					timeout: 5000,
				}).trim();
			} catch {
				try {
					grepResult = execSync(`grep -rl "${kw}" apps/ packages/ 2>&1`, {
						encoding: 'utf8',
						maxBuffer: 1024 * 1024,
						timeout: 5000,
					}).trim();
				} catch {
					grepResult = '';
				}
			}
			if (grepResult) {
				codeMatches += grepResult.split('\n').length;
			}
		} catch {
			// ignore
		}
	}

	const results = criteria.map((c) => {
		// Vereinfachte Pruefung: Checkbox bereits gecheckt = erfuellt
		if (c.checked) {
			return { text: c.text, status: '✅ ERFUELLT', detail: 'Checkbox im Issue bereits markiert' };
		}
		return { text: c.text, status: '🔍 UNGEprueft', detail: 'Manuelle Pruefung erforderlich' };
	});

	const fulfilled = results.filter((r) => r.status === '✅ ERFUELLT').length;

	return {
		issue,
		criteria: results,
		result: fulfilled === criteria.length ? 'PASS' : 'PARTIAL',
		details: `${fulfilled}/${criteria.length} Kriterien erfuellt`,
		commits: commitMatches || 'Keine Commits gefunden',
		codeMatches,
	};
}

function generateReport(allResults, mode) {
	const report = {
		repository: REPO,
		branch: BRANCH,
		commit: COMMIT,
		timestamp: new Date().toISOString(),
		mode,
		total: allResults.length,
		results: allResults,
		summary: {
			pass: allResults.filter((r) => r.result === 'PASS').length,
			partial: allResults.filter((r) => r.result === 'PARTIAL').length,
			noCriteria: allResults.filter((r) => r.result === 'NO_CRITERIA').length,
			error: allResults.filter((r) => r.result === 'ERROR').length,
		},
	};

	// Bericht speichern
	if (!existsSync(REPORTS_DIR)) {
		mkdirSync(REPORTS_DIR, { recursive: true });
	}

	const filename = join(REPORTS_DIR, `issue-verification-${Date.now()}.json`);
	writeFileSync(filename, JSON.stringify(report, null, 2), 'utf8');

	return report;
}

function printSummary(_report) {}

// --- MAIN ---
const args = process.argv.slice(2);
const mode = args[0] || 'all';
const results = [];

if (mode === 'all') {
	// Alle Issues laden
	const issuesJson = gh(`issue list --state all --limit 1000 --json number --jq '.[].number'`);
	if (!issuesJson) {
		console.error('❌ Konnte Issues nicht laden');
		process.exit(1);
	}

	const issueNumbers = issuesJson.split('\n').map(Number).filter(Boolean);

	for (const num of issueNumbers) {
		const result = verifyIssue(num);
		if (result) {
			results.push(result);
		}
	}
} else if (/^\d+$/.test(mode)) {
	// Einzelnen Issue pruefen
	const result = verifyIssue(Number.parseInt(mode));
	if (result) {
		results.push(result);
	}
} else {
	console.error('Verwendung: node scripts/verify-issues.mjs <issue-number|all>');
	process.exit(1);
}

const report = generateReport(results, mode);
printSummary(report);
