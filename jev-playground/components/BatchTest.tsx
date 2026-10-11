'use client';

import { useMemo, useRef, useState } from 'react';
import { callJev, runPool } from '@/lib/client';
import { PRICE_PER_MILLION_INPUT, type EvaluateResponse, type Questions } from '@/lib/types';

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
}: {
  questions: Questions;
  disabledReason: string | null;
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
      ? 'Collez au moins une ligne.'
      : tooMany
        ? `Maximum ${MAX_ROWS} lignes par lot (${parsed.length} collées).`
        : null);

  async function run() {
    const initial = parsed.map((r) => ({ ...r }));
    setRows(initial);
    setDone(0);
    setRunning(true);
    abort.current = new AbortController();
    const signal = abort.current.signal;
    await runPool(
      initial,
      CONCURRENCY,
      async (row, i) => {
        try {
          const res = await callJev(row.text, questions, signal);
          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, res } : r)));
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
    const header = ['texte', 'attendu', ...qids.flatMap((q) => [q, `${q}_p`, `${q}_confiance`]), 'latence_ms', 'erreur'];
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
    a.download = `jev-lot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmt = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)} %`);

  return (
    <div className="batch">
      <label className="field">
        <span className="field-label">Lignes à classer</span>
        <span className="field-hint">
          Une ligne par texte. Pour mesurer la précision, collez deux colonnes depuis un tableur : texte, puis
          libellé attendu (séparés par une tabulation).
        </span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          placeholder={'Texte 1\tdecision\nTexte 2\tcourrier'}
        />
      </label>

      <div className="batch-controls">
        <label className="check">
          <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
          Ignorer la première ligne (en-têtes)
        </label>
        {choiceIds.length > 0 && (
          <label className="inline">
            Comparer le libellé attendu à
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
            Arrêter ({done}/{rows.length})
          </button>
        ) : (
          <button type="button" className="primary" onClick={run} disabled={!!blocked}>
            Évaluer {parsed.length > 0 ? `${parsed.length} ligne${parsed.length > 1 ? 's' : ''}` : 'le lot'}
          </button>
        )}
        {rows.length > 0 && !running && (
          <button type="button" onClick={exportCsv}>
            Exporter en CSV
          </button>
        )}
        <span className="muted small">{blocked}</span>
      </div>

      {rows.length > 0 && (
        <>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{fmt(stats.accuracy)}</span>
              <span className="stat-label">précision sur {ref || '–'} ({stats.labeled} lignes annotées)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{fmt(stats.coverage)}</span>
              <span className="stat-label">classées automatiquement au seuil {threshold.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-value">{fmt(stats.autoAccuracy)}</span>
              <span className="stat-label">précision sur ces lignes-là</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.p50 ?? '–'} ms</span>
              <span className="stat-label">latence médiane (p95 : {stats.p95 ?? '–'} ms)</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.cost < 0.0001 ? "< 0.0001" : stats.cost.toFixed(4)} $</span>
              <span className="stat-label">
                coût du lot ({stats.ok} OK{stats.errors ? `, ${stats.errors} en erreur` : ''})
              </span>
            </div>
          </div>

          <label className="threshold">
            Seuil de probabilité pour classer sans revue humaine : <strong>{threshold.toFixed(2)}</strong>
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
                  <th>Texte</th>
                  {ref && <th>{ref}</th>}
                  <th>p</th>
                  <th>Attendu</th>
                  <th>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const t = topOf(r.res, ref);
                  const status = r.error
                    ? { cls: 'bad', label: 'Erreur' }
                    : !r.res
                      ? { cls: 'pending', label: running ? '…' : 'Non traité' }
                      : t && t.p < threshold
                        ? { cls: 'warn', label: 'À revoir' }
                        : !r.expected
                          ? { cls: '', label: '' }
                          : t?.choice === r.expected
                            ? { cls: 'good', label: 'Correct' }
                            : { cls: 'bad', label: 'Faux' };
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
