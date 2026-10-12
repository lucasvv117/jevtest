'use client';

import { useMemo, useRef, useState } from 'react';
import { AnswerView } from './AnswerView';
import type { ShowToast } from './Toasts';
import { callJev, runPool } from '@/lib/client';
import { extractPdfText, guessDecisionMeta } from '@/lib/pdf';
import { PRICE_PER_MILLION_INPUT, type Answer, type EvaluateResponse, type Question, type Questions } from '@/lib/types';

const CONCURRENCY = 3;
// Stays under the API route's MAX_STATE_CHARS (100k) once the question is prepended.
const MAX_STATE_CHARS = 99_000;

type Status = 'extracting' | 'ready' | 'evaluating' | 'done' | 'error';
type Doc = {
  id: number;
  name: string;
  size: number;
  status: Status;
  text?: string;
  pages?: number;
  meta?: ReturnType<typeof guessDecisionMeta>;
  res?: EvaluateResponse;
  error?: string;
};

function buildState(query: string, doc: Doc) {
  const head = `Question de l'utilisateur :\n${query.trim()}\n\n---\n\nDécision de justice (${doc.name}) :\n`;
  const text = doc.text ?? '';
  const room = MAX_STATE_CHARS - head.length;
  return { state: head + text.slice(0, room), truncated: text.length > room };
}

/** The question that drives the gauge: `relevance` if present, else the first score, else the first yes/no. */
function headlineId(questions: Questions) {
  const ids = Object.keys(questions);
  if (questions.relevance) return 'relevance';
  return ids.find((id) => questions[id].type === 'score') ?? ids.find((id) => questions[id].type === 'boolean');
}

/** 0–1 value of an answer: normalized score, or P(yes). */
function normalized(question: Question | undefined, answer: Answer | undefined) {
  if (!answer) return null;
  if (answer.type === 'boolean') return answer.probability;
  if (answer.type === 'score') {
    const n = question?.type === 'score' ? question.criteria.length : Object.keys(answer.probabilities ?? {}).length;
    return answer.score / Math.max(n - 1, 1);
  }
  return null;
}

function tierLabel(question: Question | undefined, answer: Answer | undefined) {
  if (answer?.type === 'score' && question?.type === 'score') {
    const level = question.criteria[Math.round(answer.score)] ?? '';
    return level.split(':')[0].trim();
  }
  if (answer?.type === 'boolean') return answer.probability >= 0.5 ? 'Yes' : 'No';
  return '';
}

const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

function Gauge({ value, tone, loading }: { value: number | null; tone: string; loading: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className={`gauge ${tone}${loading ? ' is-loading' : ''}`}>
      <svg viewBox="0 0 84 84" aria-hidden>
        <circle cx="42" cy="42" r={r} className="gauge-track" />
        <circle
          cx="42"
          cy="42"
          r={r}
          className="gauge-fill"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (loading ? 0.28 : (value ?? 0)))}
        />
      </svg>
      <span className="gauge-value">{loading ? '…' : value === null ? '–' : `${Math.round(value * 100)}`}</span>
      {!loading && value !== null && <span className="gauge-unit">/100</span>}
    </div>
  );
}

export function DecisionRelevance({
  questions,
  examples,
  disabledReason,
  onSuccess,
}: {
  questions: Questions;
  examples: string[];
  disabledReason: string | null;
  onSuccess: ShowToast;
}) {
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [threshold, setThreshold] = useState(0.6);
  const [sort, setSort] = useState<'relevance' | 'upload'>('relevance');
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const nextId = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const patch = (id: number, p: Partial<Doc>) => setDocs((all) => all.map((d) => (d.id === id ? { ...d, ...p } : d)));

  function addFiles(files: FileList | File[]) {
    const pdfs = [...files].filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    for (const file of pdfs) {
      const id = ++nextId.current;
      setDocs((all) => [...all, { id, name: file.name, size: file.size, status: 'extracting' }]);
      extractPdfText(file)
        .then(({ text, pages }) =>
          text.length < 50
            ? patch(id, { status: 'error', pages, error: 'No text found in this PDF (scanned document?).' })
            : patch(id, { status: 'ready', text, pages, meta: guessDecisionMeta(text) }),
        )
        .catch((e) => patch(id, { status: 'error', error: `Could not read this PDF: ${(e as Error).message}` }));
    }
  }

  const evaluable = docs.filter((d) => d.text && d.status !== 'extracting');
  const blocked =
    disabledReason ??
    (!query.trim()
      ? 'Enter the user question.'
      : evaluable.length === 0
        ? 'Add at least one court decision (PDF).'
        : null);

  async function run() {
    setRunning(true);
    const targets = evaluable;
    for (const d of targets) patch(d.id, { status: 'evaluating', res: undefined, error: undefined });
    let ok = 0;
    let tokens = 0;
    await runPool(targets, CONCURRENCY, async (doc) => {
      try {
        const res = await callJev(buildState(query, doc).state, questions);
        ok++;
        tokens += res.usage.inputTokens ?? 0;
        patch(doc.id, { status: 'done', res });
      } catch (e) {
        patch(doc.id, { status: 'error', error: (e as Error).message });
      }
    });
    setRunning(false);
    if (ok > 0) {
      onSuccess(
        'TypeSafe API calls succeeded',
        `${ok} of ${targets.length} decision${targets.length > 1 ? 's' : ''} evaluated · ${tokens.toLocaleString('en')} input tokens`,
      );
    }
  }

  const hid = headlineId(questions);
  const scored = useMemo(
    () =>
      docs.map((d) => ({
        doc: d,
        value: hid ? normalized(questions[hid], d.res?.answers[hid]) : null,
      })),
    [docs, hid, questions],
  );
  const ordered =
    sort === 'relevance'
      ? [...scored].sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.doc.id - b.doc.id)
      : scored;
  const evaluated = scored.filter((s) => s.value !== null);
  const relevantCount = evaluated.filter((s) => s.value! >= threshold).length;
  const avg = evaluated.length ? evaluated.reduce((t, s) => t + s.value!, 0) / evaluated.length : null;
  const cost =
    (docs.reduce((t, d) => t + (d.res?.usage.inputTokens ?? 0), 0) / 1e6) * PRICE_PER_MILLION_INPUT;
  const otherIds = Object.keys(questions).filter((id) => id !== hid);

  return (
    <div className="dr">
      <label className="field">
        <span className="field-label">User question</span>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          placeholder="e.g. “Un salarié peut-il être licencié pour faute grave pour des propos tenus sur les réseaux sociaux ?”"
        />
      </label>
      {examples.length > 0 && (
        <div className="examples">
          <span className="muted">Examples:</span>
          {examples.map((ex, i) => (
            <button key={i} type="button" className="chip" onClick={() => setQuery(ex)} title={ex}>
              {ex.slice(0, 48)}…
            </button>
          ))}
        </div>
      )}

      <div
        className={dragging ? 'dropzone is-over' : 'dropzone'}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      >
        <svg className="dropzone-icon" viewBox="0 0 24 24" aria-hidden>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M12 17v-6M9.5 13.5 12 11l2.5 2.5" />
        </svg>
        <div>
          <span>
            <strong>Drop court decisions here</strong> or <span className="dropzone-link">browse</span>
          </span>
          <span className="dropzone-hint">PDF only · text is extracted in your browser, files are never uploaded</span>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="actions">
        <button type="button" className="primary" onClick={run} disabled={!!blocked || running}>
          {running
            ? 'Evaluating…'
            : `Evaluate ${evaluable.length > 0 ? `${evaluable.length} ` : ''}decision${evaluable.length > 1 ? 's' : ''}`}
        </button>
        {docs.length > 0 && !running && (
          <button type="button" onClick={() => setDocs([])}>
            Clear all
          </button>
        )}
        <span className="muted small">{blocked}</span>
      </div>

      {evaluated.length > 0 && (
        <div className="dr-summary">
          <div className="dr-kpi">
            <span className="dr-kpi-value">
              <span className="good-text">{relevantCount}</span>
              <span className="muted"> / {evaluated.length}</span>
            </span>
            <span className="dr-kpi-label">relevant decisions</span>
          </div>
          <div className="dr-kpi">
            <span className="dr-kpi-value">{avg === null ? '–' : Math.round(avg * 100)}</span>
            <span className="dr-kpi-label">average relevance /100</span>
          </div>
          <div className="dr-kpi">
            <span className="dr-kpi-value">{cost < 0.0001 ? '< 0.0001' : cost.toFixed(4)} $</span>
            <span className="dr-kpi-label">Jev cost</span>
          </div>
          <label className="dr-threshold">
            <span>
              Relevant from <strong>{Math.round(threshold * 100)}</strong>/100
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <div className="seg seg-small" role="tablist" aria-label="Sort decisions">
            {(['relevance', 'upload'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={sort === s}
                className={sort === s ? 'seg-btn is-on' : 'seg-btn'}
                onClick={() => setSort(s)}
              >
                {s === 'relevance' ? 'By relevance' : 'Upload order'}
              </button>
            ))}
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <ol className="dr-list">
          {ordered.map(({ doc, value }, i) => {
            const hq = hid ? questions[hid] : undefined;
            const ha = hid ? doc.res?.answers[hid] : undefined;
            const tone =
              doc.status === 'error' ? 'bad' : value === null ? 'neutral' : value >= threshold ? 'good' : value >= threshold - 0.25 ? 'warn' : 'bad';
            const { truncated } = doc.text ? buildState(query, doc) : { truncated: false };
            const excerpt = doc.text?.replace(/\s+/g, ' ').slice(0, 420);
            return (
              <li key={doc.id} className={`dcard tone-${tone}`}>
                <div className="dcard-rank" aria-label={`Rank ${i + 1}`}>
                  {sort === 'relevance' && value !== null ? i + 1 : '·'}
                </div>
                <div className="dcard-main">
                  <div className="dcard-head">
                    <svg className="dcard-icon" viewBox="0 0 24 24" aria-hidden>
                      <path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0zM8 21h8" />
                    </svg>
                    <h3 title={doc.name}>{doc.name}</h3>
                    {!running && (
                      <button
                        type="button"
                        className="icon-btn dcard-remove"
                        aria-label={`Remove ${doc.name}`}
                        onClick={() => setDocs((all) => all.filter((d) => d.id !== doc.id))}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {doc.meta && (doc.meta.court || doc.meta.date || doc.meta.number) && (
                    <div className="dcard-meta">
                      {doc.meta.court && <span className="meta-chip">{doc.meta.court}</span>}
                      {doc.meta.date && <span className="meta-chip">{doc.meta.date}</span>}
                      {doc.meta.number && <span className="meta-chip mono">{doc.meta.number}</span>}
                    </div>
                  )}
                  {doc.status === 'extracting' ? (
                    <div className="skeleton-lines" aria-label="Reading PDF">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : doc.error ? (
                    <p className="dcard-error">{doc.error}</p>
                  ) : (
                    <p className="dcard-excerpt">{excerpt}…</p>
                  )}
                  <div className="dcard-foot">
                    <span>{fmtSize(doc.size)}</span>
                    {doc.pages !== undefined && <span>{doc.pages} page{doc.pages > 1 ? 's' : ''}</span>}
                    {doc.text && <span>{doc.text.length.toLocaleString('en')} characters</span>}
                    {truncated && <span className="warn-text">truncated to fit Jev’s limit</span>}
                    {doc.res && <span>{doc.res.latencyMs} ms</span>}
                  </div>
                  {doc.res && otherIds.length > 0 && (
                    <div className="dcard-signals">
                      {otherIds.map((id) => {
                        const a = doc.res!.answers[id];
                        const v = normalized(questions[id], a);
                        if (v === null) return null;
                        const yes = a?.type === 'boolean' ? a.probability >= 0.5 : v >= threshold;
                        return (
                          <span key={id} className={yes ? 'signal yes' : 'signal no'} title={questions[id]?.instructions}>
                            <span className="signal-name">{id}</span>
                            <span className="signal-bar">
                              <span style={{ width: `${v * 100}%` }} />
                            </span>
                            <strong>{a?.type === 'boolean' ? `${yes ? 'Yes' : 'No'} ${Math.round((yes ? v : 1 - v) * 100)}%` : Math.round(v * 100)}</strong>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {doc.res && (
                    <details className="raw dcard-details">
                      <summary>Jev details</summary>
                      <div className="results">
                        {Object.entries(doc.res.answers).map(([id, answer]) => (
                          <AnswerView key={id} id={id} question={questions[id]} answer={answer} confidence={doc.res!.confidence[id]} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <div className="dcard-score">
                  <Gauge value={value} tone={tone} loading={doc.status === 'evaluating'} />
                  <span className="dcard-tier">
                    {doc.status === 'evaluating'
                      ? 'Jev is reading…'
                      : doc.status === 'extracting'
                        ? 'Reading PDF…'
                        : value === null
                          ? doc.status === 'error'
                            ? 'Not evaluated'
                            : 'Ready'
                          : tierLabel(hq, ha)}
                  </span>
                  {value !== null && (
                    <span className={`dcard-verdict ${value >= threshold ? 'good' : 'bad'}`}>
                      {value >= threshold ? 'Relevant' : 'Not relevant'}
                    </span>
                  )}
                  {hid && doc.res?.confidence[hid] !== undefined && (
                    <span className="dcard-conf">confidence {doc.res.confidence[hid].toFixed(2)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
