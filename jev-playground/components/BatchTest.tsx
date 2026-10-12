'use client';

import { useMemo, useRef, useState } from 'react';
import { callJev, runPool } from '@/lib/client';
import { callFraAgent } from '@/lib/fra-agent';
import { PRICE_PER_MILLION_INPUT, type EvaluateResponse, type Questions, type UseCase } from '@/lib/types';
import type { ShowToast } from './Toasts';

const MAX_ROWS = 300;
const CONCURRENCY = 4;

type Row = { text: string; expected?: string; res?: EvaluateResponse; error?: string };

function parse(input: string, hasHeader: boolean): Row[] {
  const lines = input.split(/\r?\n/).filter((l) => l.trim());
  return (hasHeader ? lines.slice(1) : lines).map((line) => {
    const [text, expected] = line.split('\t');
    return { text: text.trim(), expected: expected?.trim() || undefined };
  });
}

function topOf(res: EvaluateResponse | undefined, qid: string) {
  const a = res?.answers[qid];
  if (!a || a.type !== 'choice') return null;
  return { choice: a.choice, p: a.probabilities?.[a.choice] ?? 1, conf: res!.confidence[qid] };
}

function csvCell(v: unknown) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function BatchTest({
  questions,
  disabledReason,
  onSuccess,
  view,
}: {
  questions: Questions;
  disabledReason: string | null;
  onSuccess: ShowToast;
  view?: UseCase['view'];
}) {
  const choiceIds = Object.keys(questions).filter((k) => questions[k].type === 'choice');
  const [input, setInput] = useState('');
  const [hasHeader, setHasHeader] = useState(false);
  const [refId, setRefId] = useState(choiceIds[0] ?? '');
  const [threshold, setThreshold] = useState(0.7);
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const ref = choiceIds.includes(refId) ? refId : choiceIds[0] ?? '';
  const parsed = useMemo(() => parse(input, hasHeader), [input, hasHeader]);
  const tooMany = parsed.length > MAX_ROWS;
  const blocked =
    disabledReason ??
    (parsed.length === 0
      ? 'Paste at least one line.'
      : tooMany
        ? `At most ${MAX_ROWS} lines per batch (${parsed.length} pasted).`
        : null);

  async function run() {
    const initial = parsed.map((r) => ({ ...r }));
    setRows(initial);
    setDone(0);
    setRunning(true);
    abort.current = new AbortController();
    const signal = abort.current.signal;
    let succeeded = 0;
    await runPool(
      initial,
      CONCURRENCY,
      async (row, i) => {
        try {
          // Agent view: researcher tools are only evaluated when `research` is called (default 0.5 threshold).
          const res =
            view === 'fra-agent'
              ? await callFraAgent(row.text, questions, 0.5, signal)
              : await callJev(row.text, questions, signal);
          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, res } : r)));
          succeeded++;
        } catch (e) {
          if (signal.aborted) return;
          const error = e instanceof Error ? e.message : String(e);
          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, error } : r)));
        }
        setDone((d) => d + 1);
      },
      signal,
    );
    setRunning(false);
    // One toast per batch rather than one per row.
    if (succeeded > 0) {
      onSuccess('TypeSafe API calls succeeded', `${succeeded} of ${initial.length} rows classified`);
    }
  }

  const stats = useMemo(() => {
    const ok = rows.filter((r) => r.res);
    const labeled = ok.filter((r) => r.expected && topOf(r.res, ref));
    const correct = labeled.filter((r) => topOf(r.res, ref)!.choice === r.expected);
    const auto = labeled.filter((r) => topOf(r.res, ref)!.p >= threshold);
    const autoCorrect = auto.filter((r) => topOf(r.res, ref)!.choice === r.expected);
    const lat = ok.map((r) => r.res!.latencyMs).sort((a, b) => a - b);
    const tokens = ok.reduce((s, r) => s + (r.res!.usage.inputTokens ?? 0), 0);
    return {
      ok: ok.length,
      errors: rows.filter((r) => r.error).length,
      labeled: labeled.length,
      accuracy: labeled.length ? correct.length / labeled.length : null,
      coverage: labeled.length ? auto.length / labeled.length : null,
      autoAccuracy: auto.length ? autoCorrect.length / auto.length : null,
      p50: lat.length ? lat[Math.floor(lat.length * 0.5)] : null,
      p95: lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] : null,
      cost: (tokens / 1e6) * PRICE_PER_MILLION_INPUT,
    };
  }, [rows, ref, threshold]);

  function exportCsv() {
    const qids = Object.keys(questions);
    const header = ['text', 'expected', ...qids.flatMap((q) => [q, `${q}_p`, `${q}_confidence`]), 'latency_ms', 'error'];
    const lines = rows.map((r) => {
      const cells: unknown[] = [r.text, r.expected];
      for (const q of qids) {
        const a = r.res?.answers[q];
        if (!a) cells.push('', '', '');
        else if (a.type === 'choice') cells.push(a.choice, a.probabilities?.[a.choice], r.res!.confidence[q]);
        else if (a.type === 'score') cells.push(a.score, '', r.res!.confidence[q]);
        else cells.push(a.probability >= 0.5, a.probability, '');
      }
      cells.push(r.res?.latencyMs, r.error);
      return cells.map(csvCell).join(';');
    });
    const blob = new Blob(['\uFEFF' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jev-batch-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmt = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);

  return (
    <div className="batch">
      <label className="field">
        <span className="field-label">Lines to classify</span>
        <span className="field-hint">
          One line per text. To measure accuracy, paste two columns from a spreadsheet: the text, then the
          expected label (separated by a tab).
        </span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          placeholder={'Text 1\tdecision\nText 2\tletter'}
        />
      </label>

      <div className="batch-controls">
        <label className="check">
          <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
          Skip the first line (headers)
        </label>
        {choiceIds.length > 0 && (
          <label className="inline">
            Compare the expected label with
            <select value={ref} onChange={(e) => setRefId(e.target.value)}>
              {choiceIds.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="actions">
        {running ? (
          <button type="button" onClick={() => abort.current?.abort()}>
            Stop ({done}/{rows.length})
          </button>
        ) : (
          <button type="button" className="primary" onClick={run} disabled={!!blocked}>
            Run {parsed.length > 0 ? `${parsed.length} line${parsed.length > 1 ? 's' : ''}` : 'batch'}
          </button>
        )}
        {rows.length > 0 && !running && (
          <button type="button" onClick={exportCsv}>
            Export CSV
          </button>
        )}
        <span className="muted small">{blocked}</span>
      </div>

      {rows.length > 0 && (
        <>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{fmt(stats.accuracy)}</span>
              <span className="stat-label">accuracy on {ref || '–'} ({stats.labeled} labeled lines)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{fmt(stats.coverage)}</span>
              <span className="stat-label">auto-classified at threshold {threshold.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-value">{fmt(stats.autoAccuracy)}</span>
              <span className="stat-label">accuracy on those lines</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.p50 ?? '–'} ms</span>
              <span className="stat-label">median latency (p95: {stats.p95 ?? '–'} ms)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.cost < 0.0001 ? "< 0.0001" : stats.cost.toFixed(4)} $</span>
              <span className="stat-label">
                batch cost ({stats.ok} OK{stats.errors ? `, ${stats.errors} failed` : ''})
              </span>
            </div>
          </div>

          <label className="threshold">
            Probability threshold to classify without human review: <strong>{threshold.toFixed(2)}</strong>
            <input
              type="range"
              min={0.3}
              max={0.99}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Text</th>
                  {ref && <th>{ref}</th>}
                  <th>p</th>
                  <th>Expected</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const t = topOf(r.res, ref);
                  const status = r.error
                    ? { cls: 'bad', label: 'Error' }
                    : !r.res
                      ? { cls: 'pending', label: running ? '…' : 'Not run' }
                      : t && t.p < threshold
                        ? { cls: 'warn', label: 'Review' }
                        : !r.expected
                          ? { cls: '', label: '' }
                          : t?.choice === r.expected
                            ? { cls: 'good', label: 'Correct' }
                            : { cls: 'bad', label: 'Wrong' };
                  return (
                    <tr key={i}>
                      <td className="num">{i + 1}</td>
                      <td className="text-cell" title={r.error ?? r.text}>
                        {r.text}
                      </td>
                      {ref && <td>{t?.choice ?? ''}</td>}
                      <td className="num">{t ? t.p.toFixed(2) : ''}</td>
                      <td>{r.expected ?? ''}</td>
                      <td>
                        {status.label && <span className={`tag ${status.cls}`}>{status.label}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
