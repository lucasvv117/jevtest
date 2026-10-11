'use client';

import { useState } from 'react';
import { AnswerView } from './AnswerView';
import { callJev } from '@/lib/client';
import { PRICE_PER_MILLION_INPUT, type EvaluateResponse, type Questions } from '@/lib/types';

export function SingleTest({
  questions,
  examples,
  disabledReason,
}: {
  questions: Questions;
  examples: string[];
  disabledReason: string | null;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await callJev(text, questions));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const blocked = disabledReason ?? (!text.trim() ? 'Saisissez un texte à classer.' : null);

  return (
    <div className="single">
      <label className="field">
        <span className="field-label">Texte à classer</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !blocked && !loading) run();
          }}
          rows={9}
          placeholder="Collez un extrait de décision, un courrier, une requête utilisateur…"
        />
      </label>

      {examples.length > 0 && (
        <div className="examples">
          <span className="muted">Exemples :</span>
          {examples.map((ex, i) => (
            <button key={i} type="button" className="chip" onClick={() => setText(ex)} title={ex}>
              {ex.slice(0, 48)}…
            </button>
          ))}
        </div>
      )}

      <div className="actions">
        <button type="button" className="primary" onClick={run} disabled={!!blocked || loading}>
          {loading ? 'Évaluation…' : 'Évaluer'}
        </button>
        <span className="muted small">{blocked ?? 'Ctrl/⌘ + Entrée'}</span>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <div className="results" aria-live="polite">
          <p className="meta">
            {result.latencyMs} ms · {result.usage.inputTokens ?? '?'} tokens d’entrée ·{' '}
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
            <summary>Réponse brute</summary>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
