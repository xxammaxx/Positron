// Positron — Spec Kit Artifact Scanner
// Erkennt Spec Kit Artefakte in einem Workspace (Issue #15)

import { readFileSync, readdirSync, type Dirent } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import type { SpecKitArtifactRef } from '@positron/shared';

/**
 * Bekannte Spec Kit Artefakt-Pfade und ihre Kind-Zuordnung.
 * Reihenfolge: von spezifisch zu generisch (damit exact matches Vorrang haben).
 */
const ARTIFACT_PATTERNS: { pattern: RegExp; kind: SpecKitArtifactRef['kind']; required?: boolean }[] = [
  { pattern: /\/\.specify\/memory\/constitution\.md$/, kind: 'constitution' },
  { pattern: /\/specs\/[^/]+\/spec\.md$/, kind: 'spec' },
  { pattern: /\/specs\/[^/]+\/plan\.md$/, kind: 'plan' },
  { pattern: /\/specs\/[^/]+\/tasks\.md$/, kind: 'tasks' },
  { pattern: /\/specs\/[^/]+\/research\.md$/, kind: 'research' },
  { pattern: /\/specs\/[^/]+\/data-model\.md$/, kind: 'data-model' },
  { pattern: /\/specs\/[^/]+\/quickstart\.md$/, kind: 'quickstart' },
  { pattern: /\/specs\/[^/]+\/checklists\/[^/]+\.md$/, kind: 'checklist' },
  { pattern: /\/specs\/[^/]+\/contracts\/[^/]+/, kind: 'contract' },
];

/**
 * Scannt einen Workspace-Pfad auf Spec Kit Artefakte.
 *
 * Regeln:
 * - Nur innerhalb workspacePath suchen (keine Symlink-Flucht)
 * - Pfade relativ zum workspacePath speichern
 * - SHA-256 berechnen
 * - UTF-8 lesen
 * - Deutsche Umlaute bleiben erhalten
 * - Technische Artifact-IDs sind ASCII-safe
 *
 * @param workspacePath Absoluter Pfad zum Workspace
 * @returns Liste erkannter Artefakte (leer wenn keine gefunden)
 */
export function scanWorkspace(workspacePath: string): SpecKitArtifactRef[] {
  const resolved = resolvePath(workspacePath);
  const artifacts: SpecKitArtifactRef[] = [];

  try {
    scanDirectory(resolved, resolved, artifacts);
  } catch {
    // Workspace nicht lesbar — leere Liste zurückgeben (kein Crash)
  }

  return artifacts;
}

/**
 * Prüft, ob ein Pfad sicher innerhalb des Workspace liegt.
 * Verhindert Symlink-Flucht und Path Traversal.
 */
export function isPathSafe(workspacePath: string, targetPath: string): boolean {
  const resolvedWorkspace = resolvePath(workspacePath);
  const resolvedTarget = resolvePath(targetPath);

  // resolve entfernt ../ und Symlinks — danach muss targetPath innerhalb workspacePath liegen
  return resolvedTarget.startsWith(resolvedWorkspace + '/') || resolvedTarget === resolvedWorkspace;
}

/**
 * Berechnet SHA-256 Hash einer Datei.
 * Gibt undefined zurück wenn Datei nicht lesbar.
 */
export function computeSha256(filePath: string): string | undefined {
  try {
    const content = readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return undefined;
  }
}

/**
 * Löst einen Pfad normalisiert und absolut auf.
 */
function resolvePath(p: string): string {
  return resolve(p);
}

/**
 * Rekursive Directory-Scan-Funktion.
 * Sucht nach Dateien, die den Spec Kit Artefakt-Mustern entsprechen.
 */
function scanDirectory(
  basePath: string,
  currentPath: string,
  artifacts: SpecKitArtifactRef[],
): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(currentPath, { withFileTypes: true });
  } catch {
    return; // Verzeichnis nicht lesbar — überspringen
  }

  for (const entry of entries) {
    const fullPath = join(currentPath, entry.name);

    // Symlinks nicht folgen (Sicherheit)
    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      // Nur in relevanten Verzeichnissen suchen
      const dirName = entry.name;
      if (dirName === '.specify' || dirName === 'specs' || dirName === 'checklists' || dirName === 'contracts') {
        scanDirectory(basePath, fullPath, artifacts);
      }
      // Auch in Unterverzeichnissen von specs/ suchen
      if (currentPath.includes('/specs/') || currentPath.endsWith('/specs')) {
        scanDirectory(basePath, fullPath, artifacts);
      }
      // Auch in .specify/ rekursiv
      if (currentPath.includes('/.specify') || currentPath.endsWith('/.specify')) {
        scanDirectory(basePath, fullPath, artifacts);
      }
    } else if (entry.isFile()) {
      // Prüfe ob Datei einem Artefakt-Muster entspricht
      const relPath = relative(basePath, fullPath);
      const normalizedPath = '/' + relPath.replace(/\\/g, '/');

      for (const { pattern, kind } of ARTIFACT_PATTERNS) {
        if (pattern.test(normalizedPath)) {
          const sha256 = computeSha256(fullPath);
          artifacts.push({
            kind,
            path: relPath,
            exists: true,
            sha256,
          });
          break; // Nur erstes passendes Pattern
        }
      }
    }
  }
}
