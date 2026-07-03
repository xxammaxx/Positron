/**
 * Markdown Utility Functions for Evidence Portfolio
 *
 * Low-level operations for reading, parsing, and updating Markdown files
 * with auto-generated marker blocks. No external dependencies — pure
 * string and regex operations.
 */

import { MARKER_PREFIX, MARKER_SUFFIX, type PortfolioSection } from './types.js';

/**
 * Create a start marker for a named section.
 */
export function makeStartMarker(section: PortfolioSection): string {
	return `${MARKER_PREFIX} ${section} -->`;
}

/**
 * Create an end marker for a named section.
 */
export function makeEndMarker(section: PortfolioSection): string {
	return `${MARKER_SUFFIX} ${section} -->`;
}

/**
 * Represents a section bounded by auto-generated markers.
 */
export interface MarkerBlock {
	/** Section name */
	section: PortfolioSection;
	/** Line index where start marker appears (0-based) */
	startLine: number;
	/** Line index where end marker appears (0-based) */
	endLine: number;
	/** Content lines between markers */
	content: string[];
	/** Full start marker string found in file */
	startMarker: string;
	/** Full end marker string found in file */
	endMarker: string;
}

/**
 * Find all marker-delimited blocks in a file's lines.
 */
export function findMarkerBlocks(lines: string[]): MarkerBlock[] {
	const blocks: MarkerBlock[] = [];
	const markerRegex = new RegExp(`^\\s*${escapeRegex(MARKER_PREFIX)}\\s+(\\S+)\\s*-->\\s*$`);
	const endRegex = new RegExp(`^\\s*${escapeRegex(MARKER_SUFFIX)}\\s+(\\S+)\\s*-->\\s*$`);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		const startMatch = markerRegex.exec(line.trim());
		if (startMatch) {
			const section = startMatch[1] as PortfolioSection;
			const startIdx = i;

			// Find matching end marker
			let found = false;
			for (let j = i + 1; j < lines.length; j++) {
				const endLine = lines[j];
				if (endLine === undefined) continue;
				const endMatch = endRegex.exec(endLine.trim());
				if (endMatch && endMatch[1] === section) {
					const startMarkerLine = lines[startIdx];
					const endMarkerLine = lines[j];
					if (startMarkerLine === undefined || endMarkerLine === undefined) continue;
					blocks.push({
						section,
						startLine: startIdx,
						endLine: j,
						content: lines.slice(startIdx + 1, j),
						startMarker: startMarkerLine,
						endMarker: endMarkerLine,
					});
					found = true;
					i = j; // skip past this block
					break;
				}
			}
			if (!found) {
				// Start marker without end marker — record as malformed
				const startMarkerLine = lines[startIdx];
				if (startMarkerLine === undefined) continue;
				blocks.push({
					section,
					startLine: startIdx,
					endLine: -1, // signal: no end marker found
					content: [],
					startMarker: startMarkerLine,
					endMarker: '',
				});
			}
		}
	}

	return blocks;
}

/**
 * Check if a section block exists and is well-formed.
 */
export function hasWellFormedBlock(blocks: MarkerBlock[], section: PortfolioSection): boolean {
	const block = blocks.find((b) => b.section === section);
	return block !== undefined && block.endLine >= 0;
}

/**
 * Insert new content lines into a marker block.
 * New lines are appended before the end marker.
 * Returns the full file as lines, or null if block not found.
 */
export function insertIntoBlock(
	lines: string[],
	section: PortfolioSection,
	newLines: string[],
): string[] | null {
	const blocks = findMarkerBlocks(lines);
	const block = blocks.find((b) => b.section === section);

	if (!block || block.endLine < 0) {
		return null; // block not found or malformed
	}

	const result: string[] = [];
	// Everything before end marker
	for (let i = 0; i < block.endLine; i++) {
		const li = lines[i];
		if (li !== undefined) result.push(li);
	}
	// New content
	for (const nl of newLines) {
		result.push(nl);
	}
	// End marker and everything after
	for (let i = block.endLine; i < lines.length; i++) {
		const li = lines[i];
		if (li !== undefined) result.push(li);
	}

	return result;
}

/**
 * Extract existing table rows from a content block.
 * Assumes simple pipe-delimited tables: | col1 | col2 | ...
 * Only matches lines that start and end with `|`.
 */
export function extractTableRows(content: string[]): string[] {
	return content.filter((line) => {
		const trimmed = line.trim();
		return trimmed.startsWith('|') && trimmed.endsWith('|');
	});
}

/**
 * Check if a specific table row already exists in the content.
 * Compares first column (up to first `|` after the opening one).
 */
export function rowExists(existingRows: string[], newRow: string): boolean {
	const normalizedNew = newRow.trim().toLowerCase();

	// Extract first column value for meaningful dedup
	const newFirstCol = extractFirstColumn(normalizedNew);

	for (const row of existingRows) {
		const normalized = row.trim().toLowerCase();
		if (normalized === normalizedNew) return true;

		// Also check by first column if it's meaningful
		const existingFirstCol = extractFirstColumn(normalized);
		if (newFirstCol && existingFirstCol && newFirstCol === existingFirstCol) {
			return true;
		}
	}

	return false;
}

/**
 * Extract the first table column value (between first two | characters).
 */
function extractFirstColumn(row: string): string {
	const match = /^\|([^|]*)\|/.exec(row.trim());
	return match?.[1]?.trim() ?? '';
}

/**
 * De-duplicate new rows against existing rows.
 * Returns only rows that don't already exist.
 */
export function deduplicateRows(existingRows: string[], newRows: string[]): string[] {
	const result: string[] = [];
	for (const row of newRows) {
		if (!rowExists(existingRows, row)) {
			result.push(row);
		}
	}
	return result;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a Markdown table row from cells.
 */
export function tableRow(cells: string[]): string {
	return `| ${cells.join(' | ')} |`;
}

/**
 * Build header separator line for a table with N columns.
 */
export function tableSeparator(columns: number): string {
	return `|${' --- |'.repeat(columns)}`;
}

/**
 * Read a file and return lines, splitting on newlines (handles CRLF).
 */
export function readLines(content: string): string[] {
	return content.split(/\r?\n/);
}

/**
 * Join lines back with platform-native newline.
 */
export function joinLines(lines: string[]): string {
	return lines.join('\r\n') + '\r\n';
}

/**
 * Validate that a file path is within the given workspace root.
 */
export function isPathWithinWorkspace(filePath: string, workspaceRoot: string): boolean {
	const resolvedFile = normalizePath(filePath);
	const resolvedRoot = normalizePath(workspaceRoot);
	return resolvedFile.startsWith(resolvedRoot);
}

function normalizePath(p: string): string {
	return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}
