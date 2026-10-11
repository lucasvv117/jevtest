'use client';

import { useMemo, useState } from 'react';
import { USE_CASES } from '@/lib/use-cases';
import { validateQuestions, type Questions } from '@/lib/types';
import { SingleTest } from '@/components/SingleTest';
import { BatchTest } from '@/components/BatchTest';

const pretty = (q: Questions) => JSON.stringify(q, null, 2);

export default function Page() {
  const [caseId, setCaseId] = useState(USE_CASES[0].id);
  const useCase = USE_CASES.find((u) => u.id === caseId) ?? USE_CASES[0];
  const [draft, setDraft] = useState(pretty(useCase.questions));
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  const { questions, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(draft);
      const err = validateQuestions(parsed);
      return { questions: (err ? {} : parsed) as Questions, error: err };
    } catch (e) {
      return { questions: {} as Questions, error: `JSON invalide : ${(e as Error).message}` };
    }
  }, [draft]);

  const edited = draft !== pretty(useCase.questions);

  function selectCase(id: string) {
    const next = USE_CASES.find((u) => u.id === id)!;
    setCaseId(id);
    setDraft(pretty(next.questions));
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h1>Banc d’essai Jev</h1>
        <p>Classification par questions typées, via l’API TypeSafe (jev-latest)</p>
      </header>

      <main className="grid">
        <aside className="config">
          <label className="field">
            <span className="field-label">Cas d’usage</span>
            <select value={caseId} onChange={(e) => selectCase(e.target.value)}>
              {USE_CASES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <span className="field-hint">{useCase.description}</span>
          </label>

          <label className="field grow">
            <span className="field-label">
              Questions posées à Jev
              {edited && (
                <button type="button" className="link" onClick={() => setDraft(pretty(useCase.questions))}>
                  Rétablir
                </button>
              )}
            </span>
            <span className="field-hint">
              Modifiable ici pour itérer. Pour l’enregistrer, reportez-le dans lib/use-cases.ts.
            </span>
            <textarea
              className="code"
              spellCheck={false}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={!!error}
            />
          </label>
          {error ? (
            <p className="error" role="alert">{error}</p>
          ) : (
            <p className="muted small">
              {Object.keys(questions).length} question{Object.keys(questions).length > 1 ? 's' : ''} valide
              {Object.keys(questions).length > 1 ? 's' : ''}
              {edited ? ', modifiées' : ''}
            </p>
          )}
        </aside>

        <section className="workspace">
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'single'}
              className={mode === 'single' ? 'tab is-active' : 'tab'}
              onClick={() => setMode('single')}
            >
              Un texte
            </button>
            <button
              role="tab"
              aria-selected={mode === 'batch'}
              className={mode === 'batch' ? 'tab is-active' : 'tab'}
              onClick={() => setMode('batch')}
            >
              Un lot
            </button>
          </div>

          {mode === 'single' ? (
            <SingleTest
              key={caseId}
              questions={questions}
              examples={useCase.examples}
              disabledReason={error ? 'Corrigez les questions avant d’évaluer.' : null}
            />
          ) : (
            <BatchTest
              key={caseId}
              questions={questions}
              disabledReason={error ? 'Corrigez les questions avant d’évaluer.' : null}
            />
          )}
        </section>
      </main>
    </div>
  );
}
