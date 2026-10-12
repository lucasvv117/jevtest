import { callJev } from './client';
import type { Answer, EvaluateResponse, Questions } from './types';

/** Tools only reachable through `research`: the FRA Researcher runs them when the manager delegates. */
export const FRA_RESEARCHER_TOOLS = [
  'search_legislation',
  'search_decisions',
  'lookup_legislation',
  'lookup_decision',
  'read_decision',
  'search_tax_treatise',
  'search_tax_commentary',
  'search_enterprise_documents',
  'search_enterprise_decisions',
] as const;
const isResearcherTool = (id: string) => (FRA_RESEARCHER_TOOLS as readonly string[]).includes(id);

export type Verdict = { used: boolean; label: string };

/** Yes/No: used if P(yes) ≥ 0.5. Score: used if score / (levels − 1) ≥ threshold. */
export function verdictFor(questions: Questions, answer: Answer | undefined, id: string, threshold: number): Verdict | null {
  if (!answer) return null;
  if (answer.type === 'boolean') {
    const p = answer.probability;
    return { used: p >= 0.5, label: p >= 0.5 ? `Yes ${Math.round(p * 100)}%` : `No ${Math.round((1 - p) * 100)}%` };
  }
  if (answer.type === 'score') {
    const q = questions[id];
    const levels = q?.type === 'score' ? q.criteria.length : Object.keys(answer.probabilities ?? {}).length;
    const norm = answer.score / Math.max(levels - 1, 1);
    return { used: norm >= threshold, label: norm.toFixed(2) };
  }
  return null;
}

export type FraAgentResponse = EvaluateResponse & {
  /** Latency of each TypeSafe call; `researcher` is null when the second call was skipped. */
  calls: { main: number; researcher: number | null };
  researchUsed: boolean;
};

const pick = (questions: Questions, keep: (id: string) => boolean) =>
  Object.fromEntries(Object.entries(questions).filter(([id]) => keep(id))) as Questions;

/**
 * Two-step evaluation mirroring the agent: the manager's bundles and tools first, then — only if
 * Jev says `research` is called — the FRA Researcher's tools. Without a `research` question, both run.
 */
export async function callFraAgent(
  state: string,
  questions: Questions,
  threshold: number,
  signal?: AbortSignal,
): Promise<FraAgentResponse> {
  const main = pick(questions, (id) => !isResearcherTool(id));
  const researcher = pick(questions, isResearcherTool);

  const first = await callJev(state, main, signal);
  const researchUsed = questions.research
    ? (verdictFor(questions, first.answers.research, 'research', threshold)?.used ?? false)
    : true;
  if (!researchUsed || Object.keys(researcher).length === 0) {
    return { ...first, calls: { main: first.latencyMs, researcher: null }, researchUsed };
  }

  const second = await callJev(state, researcher, signal);
  const sum = (a?: number, b?: number) => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0));
  return {
    answers: { ...first.answers, ...second.answers },
    confidence: { ...first.confidence, ...second.confidence },
    usage: {
      inputTokens: sum(first.usage.inputTokens, second.usage.inputTokens),
      totalTokens: sum(first.usage.totalTokens, second.usage.totalTokens),
    },
    latencyMs: first.latencyMs + second.latencyMs,
    calls: { main: first.latencyMs, researcher: second.latencyMs },
    researchUsed,
  };
}
