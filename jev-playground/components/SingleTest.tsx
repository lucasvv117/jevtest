'use client';

import { useState } from 'react';
import { AnswerView } from './AnswerView';
import { FraAgentDiagram } from './FraAgentDiagram';
import { callJev } from '@/lib/client';
import { callFraAgent, type FraAgentResponse } from '@/lib/fra-agent';
import { PRICE_PER_MILLION_INPUT, type EvaluateResponse, type Questions, type UseCase } from '@/lib/types';
import type { ShowToast } from './Toasts';

export function SingleTest({
  questions,
  examples,
  disabledReason,
  onSuccess,
  view,
}: {
  questions: Questions;
  examples: string[];
  disabledReason: string | null;
  onSuccess: ShowToast;
  view?: UseCase['view'];
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(EvaluateResponse & Partial<FraAgentResponse>) | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const isAgent = view === 'fra-agent';

  async function run() {
    setLoading(true);
    setError(null);
    try {
      if (isAgent) {
        const res = await callFraAgent(text, questions, threshold);
        setResult(res);
        onSuccess(
          res.calls.researcher === null ? 'TypeSafe API call succeeded' : '2 TypeSafe API calls succeeded',
          res.calls.researcher === null
            ? `Main tools evaluated · research not called, researcher skipped · ${res.latencyMs} ms`
            : `Main tools, then researcher tools · ${res.latencyMs} ms · ${res.usage.inputTokens ?? '?'} input tokens`,
        );
      } else {
        const res = await callJev(text, questions);
        setResult(res);
        onSuccess(
          'TypeSafe API call succeeded',
          `${Object.keys(res.answers).length} answers · ${res.latencyMs} ms · ${res.usage.inputTokens ?? '?'} input tokens`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const blocked = disabledReason ?? (!text.trim() ? (isAgent ? 'Enter a user request.' : 'Enter a text to classify.') : null);

  const answerCards =
    result &&
    Object.entries(result.answers).map(([id, answer]) => (
      <AnswerView key={id} id={id} question={questions[id]} answer={answer} confidence={result.confidence[id]} />
    ));

  return (
    <div className="single">
      <label className="field">
        <span className="field-label">{isAgent ? 'User request' : 'Text to classify'}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !blocked && !loading) run();
          }}
          rows={9}
          placeholder={
            isAgent
              ? 'Type what the user asks the FRA agent, e.g. “Quel est le délai de prescription en matière de vices cachés ?”'
              : 'Paste a court decision excerpt, a letter, a user query…'
          }
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

      {isAgent && (
        <FraAgentDiagram
          questions={questions}
          answers={result?.answers}
          threshold={threshold}
          onThresholdChange={setThreshold}
        />
      )}

      {result && (
        <div className="results" aria-live="polite">
          <p className="meta">
            {result.calls &&
              `Call 1 (manager): ${result.calls.main} ms · Call 2 (researcher): ${
                result.calls.researcher === null ? 'skipped, research not called' : `${result.calls.researcher} ms`
              } · `}
            {result.latencyMs} ms · {result.usage.inputTokens ?? '?'} input tokens ·{' '}
            {(((result.usage.inputTokens ?? 0) / 1e6) * PRICE_PER_MILLION_INPUT).toFixed(6)} $
          </p>
          {isAgent ? (
            <details className="raw">
              <summary>Per-tool probabilities</summary>
              <div className="results">{answerCards}</div>
            </details>
          ) : (
            answerCards
          )}
          <details className="raw">
            <summary>Raw response</summary>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
