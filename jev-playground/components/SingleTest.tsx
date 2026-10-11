'use client';

import { useState } from 'react';
import { AnswerView } from './AnswerView';
import { callJev } from '@/lib/client';
import { PRICE_PER_MILLION_INPUT, type EvaluateResponse, type Questions } from '@/lib/types';
import type { ShowToast } from './Toasts';

export function SingleTest({
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
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await callJev(text, questions);
      setResult(res);
      onSuccess(
        'TypeSafe API call succeeded',
        `${Object.keys(res.answers).length} answers · ${res.latencyMs} ms · ${res.usage.inputTokens ?? '?'} input tokens`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const blocked = disabledReason ?? (!text.trim() ? 'Enter a text to classify.' : null);

  return (
    <div className="single">
      <label className="field">
        <span className="field-label">Text to classify</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !blocked && !loading) run();
          }}
          rows={9}
          placeholder="Paste a court decision excerpt, a letter, a user query…"
        />
      </label>

      {examples.length > 0 && (
        <div className="examples">
          <span className="muted">Examples:</span>
          {examples.map((ex, i) => (
            <button key={i} type="button" className="chip" onClick={() => setText(ex)} title={ex}>
              {ex.slice(0, 48)}…
            </button>
          ))}
        </div>
      )}

      <div className="actions">
        <button type="button" className="primary" onClick={run} disabled={!!blocked || loading}>
          {loading ? 'Running…' : 'Run'}
        </button>
        <span className="muted small">{blocked ?? 'Ctrl/⌘ + Enter'}</span>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <div className="results" aria-live="polite">
          <p className="meta">
            {result.latencyMs} ms · {result.usage.inputTokens ?? '?'} input tokens ·{' '}
            {(((result.usage.inputTokens ?? 0) / 1e6) * PRICE_PER_MILLION_INPUT).toFixed(6)} $
          </p>
          {Object.entries(result.answers).map(([id, answer]) => (
            <AnswerView
              key={id}
              id={id}
              question={questions[id]}
              answer={answer}
              confidence={result.confidence[id]}
            />
          ))}
          <details className="raw">
            <summary>Raw response</summary>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
