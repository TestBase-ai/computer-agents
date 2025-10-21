/**
 * Agent types supported by Testbase
 * - 'llm': Standard LLM-based agents using OpenAI API
 * - 'computer': Computer-use agents via Codex CLI (local or cloud)
 */
export type AgentType = 'llm' | 'computer';

const CODEX_PREFIX = 'codex-';

export function codexModelNameFor(type: 'computer'): string {
  return `${CODEX_PREFIX}${type}`;
}

export function parseCodexAgentType(
  modelName: string | undefined,
): 'computer' | undefined {
  if (!modelName) {
    return undefined;
  }
  const normalized = modelName.trim().toLowerCase();
  if (normalized.startsWith(CODEX_PREFIX)) {
    const maybeType = normalized.slice(CODEX_PREFIX.length);
    if (maybeType === 'computer') {
      return 'computer';
    }
  }
  // Legacy support: map old agent types to 'computer'
  if (normalized.startsWith('codex-')) {
    return 'computer';
  }
  return undefined;
}

export function isAgentType(value: string | undefined): value is AgentType {
  if (!value) {
    return false;
  }
  return value === 'llm' || value === 'computer';
}
