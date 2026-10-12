'use client';

import type { Answer, Questions } from '@/lib/types';

/**
 * "FRA Agent" architecture figure, ported as-is from agent_inventory.html (#arch-fra).
 * Same coordinates, colors and fonts; tool boxes are framed green / red from Jev's answers.
 */

type ToolNode = {
  tool: string;
  x: number;
  y: number;
  w: number;
  lines: string[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  fontSize: number;
};

const SHARED = { fill: '#13151f', stroke: '#16a34a44', strokeWidth: 1, text: '#4ade80', w: 124 };
const FRA = { fill: '#13151f', stroke: '#3b82f633', strokeWidth: 1, text: '#60a5fa', w: 168, fontSize: 9.5 };

const TOOLS: ToolNode[] = [
  { tool: 'load_documents', x: 12, y: 176, lines: ['load_documents'], ...SHARED, fontSize: 9.5 },
  { tool: 'search_in_documents', x: 12, y: 218, lines: ['search_in_documents'], ...SHARED, fontSize: 9.5 },
  { tool: 'get_turn_answer', x: 144, y: 176, lines: ['get_turn_answer'], ...SHARED, fontSize: 9.5 },
  { tool: 'propose_follow_ups', x: 276, y: 176, lines: ['propose_follow_ups'], ...SHARED, fontSize: 9.5 },
  { tool: 'research', x: 408, y: 176, lines: ['research'], ...SHARED, stroke: '#7c3aed66', text: '#a78bfa', fontSize: 9.5 },
  {
    tool: 'search_synchronized_documents',
    x: 540,
    y: 176,
    lines: ['search_synchronized_', 'documents'],
    ...SHARED,
    fontSize: 8.5,
  },
  {
    tool: 'search_knowledge_bases_and_matters',
    x: 672,
    y: 176,
    lines: ['search_knowledge_bases_', 'and_matters'],
    ...SHARED,
    fontSize: 8.5,
  },
  {
    tool: 'load_knowledge_bases_and_matters_documents',
    x: 672,
    y: 218,
    lines: ['load_knowledge_bases_', 'and_matters_documents'],
    ...SHARED,
    fontSize: 8.5,
  },
  {
    tool: 'draft_document',
    x: 804,
    y: 176,
    lines: ['draft_document'],
    ...SHARED,
    fill: '#3b076433',
    stroke: '#7c3aed',
    strokeWidth: 1.2,
    text: '#a78bfa',
    fontSize: 9.5,
  },
  { tool: 'search_legislation', x: 20, y: 380, lines: ['search_legislation'], ...FRA },
  { tool: 'search_decisions', x: 203, y: 380, lines: ['search_decisions'], ...FRA },
  { tool: 'lookup_legislation', x: 386, y: 380, lines: ['lookup_legislation'], ...FRA },
  { tool: 'lookup_decision', x: 569, y: 380, lines: ['lookup_decision'], ...FRA },
  { tool: 'read_decision', x: 752, y: 380, lines: ['read_decision'], ...FRA },
  { tool: 'search_tax_treatise', x: 111, y: 422, lines: ['search_tax_treatise'], ...FRA },
  { tool: 'search_tax_commentary', x: 294, y: 422, lines: ['search_tax_commentary'], ...FRA },
  { tool: 'search_enterprise_documents', x: 477, y: 422, lines: ['search_enterprise_documents'], ...FRA },
  { tool: 'search_enterprise_decisions', x: 660, y: 422, lines: ['search_enterprise_decisions'], ...FRA },
];
export const FRA_TOOL_NAMES = TOOLS.map((t) => t.tool);

const TOOL_H = 34;
const GREEN = '#4ade80';
const RED = '#f87171';

/** Bundles = the manager's main tool groups; `id` is the matching Jev question. */
const BUNDLES = [
  { id: 'documents', x: 12, name: 'Documents', cond: 'if uploaded docs' },
  { id: 'history', x: 144, name: 'History', cond: 'always' },
  { id: 'follow_up', x: 276, name: 'FollowUp', cond: 'always' },
  { id: 'legal_search', x: 408, name: 'LegalSearch', cond: 'always' },
  { id: 'synchronized_documents', x: 540, name: 'SynchronizedDocuments', cond: 'if storage_ids', fontSize: 9 },
  { id: 'knowledge_bases_and_matters', x: 672, name: 'KB & Matters', cond: 'if searchable groups' },
  { id: 'drafting', x: 804, name: 'Drafting', cond: 'if editable doc or flag' },
];
export const FRA_BUNDLE_IDS = BUNDLES.map((b) => b.id);
const BUNDLE_W = 124;
const BUNDLE_H = 42;
const BUNDLE_Y = 116;

export type Verdict = { used: boolean; label: string };

/** Yes/No: used if P(yes) ≥ 0.5. Score: used if score / (levels − 1) ≥ threshold. */
export function verdictFor(questions: Questions, answer: Answer | undefined, tool: string, threshold: number): Verdict | null {
  if (!answer) return null;
  if (answer.type === 'boolean') {
    const p = answer.probability;
    return { used: p >= 0.5, label: p >= 0.5 ? `Yes ${Math.round(p * 100)}%` : `No ${Math.round((1 - p) * 100)}%` };
  }
  if (answer.type === 'score') {
    const q = questions[tool];
    const levels = q?.type === 'score' ? q.criteria.length : Object.keys(answer.probabilities ?? {}).length;
    const norm = answer.score / Math.max(levels - 1, 1);
    return { used: norm >= threshold, label: norm.toFixed(2) };
  }
  return null;
}

/** Verdict pill anchored on the box's top-right corner, so the original layout stays untouched. */
function Badge({ x, y, w, label, color }: { x: number; y: number; w: number; label: string; color: string }) {
  const bw = Math.max(30, label.length * 5.4 + 10);
  return (
    <g>
      <rect x={x + w - bw + 4} y={y - 8} width={bw} height={14} rx="7" fill="#13151f" stroke={color} strokeWidth="1" />
      <text x={x + w - bw / 2 + 4} y={y + 2.5} textAnchor="middle" fill={color} fontSize="8.5" fontWeight="700">
        {label}
      </text>
    </g>
  );
}

export function FraAgentDiagram({
  questions,
  answers,
  threshold,
  onThresholdChange,
}: {
  questions: Questions;
  answers?: Record<string, Answer>;
  threshold: number;
  onThresholdChange: (t: number) => void;
}) {
  const verdicts = Object.fromEntries(
    [...FRA_BUNDLE_IDS, ...FRA_TOOL_NAMES].map((id) => [id, verdictFor(questions, answers?.[id], id, threshold)]),
  );
  const count = (ids: string[]) => {
    const judged = ids.map((id) => verdicts[id]).filter(Boolean) as Verdict[];
    return { used: judged.filter((v) => v.used).length, total: judged.length };
  };
  const bundles = count(FRA_BUNDLE_IDS);
  const tools = count(FRA_TOOL_NAMES);
  const hasScore = [...FRA_BUNDLE_IDS, ...FRA_TOOL_NAMES].some((id) => questions[id]?.type === 'score');

  return (
    <div className="fra-card">
      <div className="fra-card-body">
        <div className="fra-head">
          <span className="fra-title">FRA Agent</span>
          {bundles.total + tools.total > 0 ? (
            <span className="fra-summary">
              According to Jev: <strong>{bundles.used}</strong> / {bundles.total} bundles ·{' '}
              <strong>{tools.used}</strong> / {tools.total} tools used
            </span>
          ) : (
            <span className="fra-summary">Run Jev on a user request to see which tools it would call.</span>
          )}
        </div>
        {hasScore && (
          <label className="fra-threshold">
            Score threshold (green at or above): <strong>{threshold.toFixed(2)}</strong>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
            />
          </label>
        )}
        <svg
          viewBox="0 0 940 540"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="FRA Agent architecture with Jev's tool predictions"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            fontFamily: "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif",
          }}
        >
          <defs>
            <marker id="fra-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#2e3147" />
            </marker>
            <marker id="fra-arrow-purple" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#6d28d9" />
            </marker>
          </defs>

          {/* connectors */}
          {BUNDLES.map((b) => (
            <g key={b.name}>
              <line x1="470" y1="74" x2={b.x + 62} y2="116" stroke="#2e3147" strokeWidth="1.5" markerEnd="url(#fra-arrow)" />
              <line x1={b.x + 62} y1="158" x2={b.x + 62} y2="176" stroke="#2e3147" strokeWidth="1" markerEnd="url(#fra-arrow)" />
            </g>
          ))}
          <line x1="74" y1="210" x2="74" y2="218" stroke="#2e3147" strokeWidth="1" />
          <line x1="734" y1="210" x2="734" y2="218" stroke="#2e3147" strokeWidth="1" />
          <line
            x1="470"
            y1="210"
            x2="470"
            y2="300"
            stroke="#6d28d9"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            markerEnd="url(#fra-arrow-purple)"
          />
          <text x="478" y="262" fill="#6b7280" fontSize="9" fontStyle="italic">
            delegates to
          </text>
          {[104, 287, 470, 653, 836].map((x2) => (
            <line key={x2} x1="470" y1="346" x2={x2} y2="380" stroke="#2e3147" strokeWidth="1" markerEnd="url(#fra-arrow)" />
          ))}

          {/* manager */}
          <rect x="200" y="12" width="540" height="62" rx="8" fill="#1e3a5f44" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="470" y="33" textAnchor="middle" fill="#60a5fa" fontSize="13" fontWeight="600">
            FRA Manager
          </text>
          <text x="470" y="50" textAnchor="middle" fill="#6b7280" fontSize="9.5">
            gemini-3.7-flash (Vertex, eu) · fallback claude-sonnet-4-6 · forced follow-up middleware
          </text>
          <text x="470" y="64" textAnchor="middle" fill="#6b7280" fontSize="9.5">
            variants: claude-sonnet-4-6 · mistral-medium-3-5 · gpt-5.6-luna · gpt-5.6-terra
          </text>

          {/* bundles, framed by Jev's verdict */}
          {BUNDLES.map((b) => {
            const v = verdicts[b.id];
            const color = v ? (v.used ? GREEN : RED) : null;
            return (
              <g key={b.name}>
                <title>{v ? `${b.name}: ${v.used ? 'used' : 'not used'} (${v.label})` : b.name}</title>
                <rect
                  x={b.x}
                  y={BUNDLE_Y}
                  width={BUNDLE_W}
                  height={BUNDLE_H}
                  rx="6"
                  fill="#14532d33"
                  stroke={color ?? '#16a34a'}
                  strokeWidth={color ? 2 : 1.1}
                />
                <text x={b.x + 62} y="133" textAnchor="middle" fill="#86efac" fontSize={b.fontSize ?? 9.5} fontWeight="600">
                  {b.name}
                </text>
                <text x={b.x + 62} y="149" textAnchor="middle" fill="#6b7280" fontSize="8" fontStyle="italic">
                  {b.cond}
                </text>
                {v && color && <Badge x={b.x} y={BUNDLE_Y} w={BUNDLE_W} label={v.label} color={color} />}
              </g>
            );
          })}
          <text x="866" y="226" textAnchor="middle" fill="#6b7280" fontSize="8.5" fontStyle="italic">
            delegates to the Drafting Agent ↗
          </text>

          {/* researcher sub-agent */}
          <rect x="355" y="300" width="230" height="46" rx="8" fill="#3b076433" stroke="#7c3aed" strokeWidth="1.5" />
          <text x="470" y="319" textAnchor="middle" fill="#a78bfa" fontSize="12.5" fontWeight="600">
            FRA Researcher
          </text>
          <text x="470" y="336" textAnchor="middle" fill="#6b7280" fontSize="9">
            gemini-3.5-flash-lite (high) · fallback gpt-5.6-luna
          </text>
          <text x="20" y="478" fill="#6b7280" fontSize="8.5" fontStyle="italic">
            RestrictedToolsMiddleware narrows this set per active filter (enterprise · fiscal doctrine ·
            jurisdiction/code); the default scope excludes the two enterprise tools
          </text>

          {/* tools, framed by Jev's verdict */}
          {TOOLS.map((t) => {
            const v = verdicts[t.tool];
            const color = v ? (v.used ? GREEN : RED) : null;
            const cx = t.x + t.w / 2;
            return (
              <g key={t.tool}>
                <title>{v ? `${t.tool}: ${v.used ? 'used' : 'not used'} (${v.label})` : t.tool}</title>
                <rect
                  x={t.x}
                  y={t.y}
                  width={t.w}
                  height={TOOL_H}
                  rx="5"
                  fill={t.fill}
                  stroke={color ?? t.stroke}
                  strokeWidth={color ? 2 : t.strokeWidth}
                />
                {t.lines.length === 1 ? (
                  <text x={cx} y={t.y + 22} textAnchor="middle" fill={t.text} fontSize={t.fontSize} fontFamily="'JetBrains Mono',monospace">
                    {t.lines[0]}
                  </text>
                ) : (
                  t.lines.map((line, i) => (
                    <text
                      key={i}
                      x={cx}
                      y={t.y + 15 + i * 12}
                      textAnchor="middle"
                      fill={t.text}
                      fontSize={t.fontSize}
                      fontFamily="'JetBrains Mono',monospace"
                    >
                      {line}
                    </text>
                  ))
                )}
                {v && color && <Badge x={t.x} y={t.y} w={t.w} label={v.label} color={color} />}
              </g>
            );
          })}

          {/* legend */}
          <rect x="22" y="506" width="12" height="12" rx="2" fill="#1e3a5f44" stroke="#3b82f6" strokeWidth="1" />
          <text x="40" y="517" fill="#6b7280" fontSize="9">top-level agent</text>
          <rect x="152" y="506" width="12" height="12" rx="2" fill="#3b076433" stroke="#7c3aed" strokeWidth="1.5" />
          <text x="170" y="517" fill="#6b7280" fontSize="9">sub-agent</text>
          <rect x="262" y="506" width="12" height="12" rx="2" fill="#14532d33" stroke="#16a34a" strokeWidth="1" />
          <text x="280" y="517" fill="#6b7280" fontSize="9">bundle</text>
          <rect x="352" y="506" width="12" height="12" rx="2" fill="#13151f" stroke="#16a34a44" strokeWidth="1" />
          <text x="370" y="517" fill="#6b7280" fontSize="9">shared tool</text>
          <rect x="462" y="506" width="12" height="12" rx="2" fill="#13151f" stroke="#3b82f633" strokeWidth="1" />
          <text x="480" y="517" fill="#6b7280" fontSize="9">fra tool</text>
          <line x1="562" y1="512" x2="574" y2="512" stroke="#6d28d9" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="580" y="517" fill="#6b7280" fontSize="9">delegates</text>
          <text x="672" y="517" fill="#6b7280" fontSize="9" fontStyle="italic">
            italics under a bundle = activation condition
          </text>
          <rect x="22" y="524" width="12" height="12" rx="2" fill="#13151f" stroke={GREEN} strokeWidth="2" />
          <text x="40" y="534" fill="#6b7280" fontSize="9">used (Jev)</text>
          <rect x="152" y="524" width="12" height="12" rx="2" fill="#13151f" stroke={RED} strokeWidth="2" />
          <text x="170" y="534" fill="#6b7280" fontSize="9">not used (Jev)</text>
        </svg>
      </div>
    </div>
  );
}
