// Positron — GitHub Sync Types

import type { EvidenceItem, SafeLlmRunMetadata } from '@positron/shared';

export type { EvidenceItem, SafeLlmRunMetadata };

export interface SyncEvidenceInput {
	evidence?: EvidenceItem[];
	llmMetadata?: SafeLlmRunMetadata[];
}
