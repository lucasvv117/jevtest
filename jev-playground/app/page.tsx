'use client';

import { useMemo, useRef, useState } from 'react';
import { USE_CASES } from '@/lib/use-cases';
import { validateQuestions, type Questions } from '@/lib/types';
import { draftError, fromDrafts, toDrafts } from '@/lib/question-draft';
import { SingleTest } from '@/components/SingleTest';
import { BatchTest } from '@/components/BatchTest';
import { QuestionsEditor } from '@/components/QuestionsEditor';
import { Toasts, useToasts } from '@/components/Toasts';

const pretty = (q: Questions) => JSON.stringify(q, null, 2);

export default function Page() {
  const [caseId, setCaseId] = useState(USE_CASES[0].id);
  const useCase = USE_CASES.find((u) => u.id === caseId) ?? USE_CASES[0];
  const [drafts, setDrafts] = useState(() => toDrafts(useCase.questions));
  const [view, setView] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const editorDialog = useRef<HTMLDialogElement>(null);
  const { toasts, show, dismiss } = useToasts();

  const { questions, error } = useMemo(() => {
    const built = fromDrafts(drafts);
    const err = draftError(drafts) ?? validateQuestions(built);
    return { questions: err ? ({} as Questions) : built, error: err };
  }, [drafts]);

  const edited = pretty(fromDrafts(drafts)) !== pretty(useCase.questions);

  function load(q: Questions) {
    setDrafts(toDrafts(q));
    setJsonText(pretty(q));
    setJsonError(null);
  }

  function selectCase(id: string) {
    const next = USE_CASES.find((u) => u.id === id)!;
    setCaseId(id);
    load(next.questions);
  }

  function switchView(next: 'visual' | 'json') {
    if (next === 'json') {
      setJsonText(pretty(fromDrafts(drafts)));
      setJsonError(null);
    }
    setView(next);
  }

  function editJson(text: string) {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      const err = validateQuestions(parsed);
      setJsonError(err);
      if (!err) setDrafts(toDrafts(parsed));
    } catch (e) {
      setJsonError(`Invalid JSON: ${(e as Error).message}`);
    }
  }

  const shownError = view === 'json' ? jsonError : error;
  const editor = (
    <>
      <div className="seg seg-small" role="tablist" aria-label="Editor view">
        {(['visual', 'json'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={view === v ? 'seg-btn is-on' : 'seg-btn'}
            onClick={() => switchView(v)}
          >
            {v === 'visual' ? 'Visual' : 'JSON'}
          </button>
        ))}
      </div>
      {view === 'visual' ? (
        <QuestionsEditor drafts={drafts} onChange={setDrafts} />
      ) : (
        <textarea
          className="code"
          spellCheck={false}
          value={jsonText}
          onChange={(e) => editJson(e.target.value)}
          aria-invalid={!!jsonError}
          aria-label="Questions as JSON"
        />
      )}
      {shownError && (
        <p className="error" role="alert">
          {shownError}
        </p>
      )}
    </>
  );

  const count = Object.keys(questions).length;

  return (
    <div className="shell">
      <header className="topbar">
        <h1>Jev Test Bench</h1>
        <p>Classification with typed questions, via the TypeSafe API (jev-latest)</p>
      </header>

      <main className="grid">
        <aside className="config">
          <label className="field">
            <span className="field-label">Use case</span>
            <select value={caseId} onChange={(e) => selectCase(e.target.value)}>
              {USE_CASES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <span className="field-hint">{useCase.description}</span>
          </label>

          <div className="field">
            <span className="field-label">
              Questions for Jev
              <span className="field-actions">
                {edited && (
                  <button type="button" className="link" onClick={() => load(useCase.questions)}>
                    Reset
                  </button>
                )}
                <button type="button" className="link" onClick={() => editorDialog.current?.showModal()}>
                  Expand
                </button>
              </span>
            </span>
            <details className="explainer">
              <summary>How does Jev work?</summary>
              <p>
                Jev doesn’t write free text. For each question below, it reads your text and returns a{' '}
                <strong>probability for every possible answer</strong>, plus a <strong>confidence</strong> score
                (how concentrated those probabilities are: 0 = hesitant, 1 = certain).
              </p>
              <p>
                Clear questions and well-described options give sharper, more reliable answers. Changes apply
                immediately to your tests; to keep them, copy the JSON into lib/use-cases.ts.
              </p>
            </details>
            {editor}
          </div>
          {!error && (
            <p className="muted small">
              {count} valid question{count > 1 ? 's' : ''}
              {edited ? ', edited' : ''}
            </p>
          )}
        </aside>

        <dialog
          ref={editorDialog}
          className="editor-dialog"
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        >
          <div className="editor-dialog-body">
            <div className="editor-dialog-head">
              <span className="field-label">Questions for Jev</span>
              <button type="button" onClick={() => editorDialog.current?.close()}>
                Close
              </button>
            </div>
            <div className="editor-dialog-scroll">{editor}</div>
          </div>
        </dialog>

        <section className="workspace">
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'single'}
              className={mode === 'single' ? 'tab is-active' : 'tab'}
              onClick={() => setMode('single')}
            >
              Single text
            </button>
            <button
              role="tab"
              aria-selected={mode === 'batch'}
              className={mode === 'batch' ? 'tab is-active' : 'tab'}
              onClick={() => setMode('batch')}
            >
              Batch
            </button>
          </div>

          {mode === 'single' ? (
            <SingleTest
              key={caseId}
              questions={questions}
              examples={useCase.examples}
              disabledReason={error ? 'Fix the questions before running.' : null}
              onSuccess={show}
              view={useCase.view}
            />
          ) : (
            <BatchTest
              key={caseId}
              questions={questions}
              disabledReason={error ? 'Fix the questions before running.' : null}
              onSuccess={show}
            />
          )}
        </section>
      </main>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
