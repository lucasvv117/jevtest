'use client';

import { newDraft, uid, type QuestionDraft } from '@/lib/question-draft';
import type { Question } from '@/lib/types';

const TYPES: { type: Question['type']; label: string; icon: string; blurb: string; how: string }[] = [
  {
    type: 'choice',
    label: 'Choice',
    icon: '◉',
    blurb: 'Pick one option from a list.',
    how: 'Jev reads the text, gives each option a probability (they add up to 100%) and returns the most likely one. Describe each option precisely: Jev compares the text to these descriptions, not to the option names.',
  },
  {
    type: 'score',
    label: 'Score',
    icon: '▁▃▅',
    blurb: 'Place the text on an ordered scale.',
    how: 'Jev gives each level a probability, then returns a score: the probability-weighted average of the level numbers (0 = first level). List levels from lowest to highest, 2 to 10 of them.',
  },
  {
    type: 'boolean',
    label: 'Yes / No',
    icon: '✓✗',
    blurb: 'Answer a yes-or-no question.',
    how: 'Jev returns the probability that the answer is “yes”. Above 50% reads as yes. Optionally describe what counts as yes and as no to remove ambiguity.',
  },
];
const typeInfo = (t: Question['type']) => TYPES.find((x) => x.type === t)!;

export function QuestionsEditor({
  drafts,
  onChange,
}: {
  drafts: QuestionDraft[];
  onChange: (next: QuestionDraft[]) => void;
}) {
  const update = (u: string, patch: Partial<QuestionDraft>) =>
    onChange(drafts.map((d) => (d.uid === u ? { ...d, ...patch } : d)));

  function setType(d: QuestionDraft, type: Question['type']) {
    const seed = newDraft(type, drafts);
    update(d.uid, {
      type,
      options: d.options.length ? d.options : seed.options,
      levels: d.levels.length ? d.levels : seed.levels,
    });
  }

  return (
    <div className="qe">
      {drafts.length === 0 && <p className="qe-empty">No questions yet. Add one below to get started.</p>}

      {drafts.map((d, qi) => {
        const info = typeInfo(d.type);
        return (
          <article key={d.uid} className="qcard">
            <header className="qcard-head">
              <span className="qcard-num">{qi + 1}</span>
              <label className="qcard-id">
                <span className="sr-only">Variable name</span>
                <input
                  type="text"
                  value={d.id}
                  spellCheck={false}
                  onChange={(e) => update(d.uid, { id: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })}
                  aria-invalid={!/^[A-Za-z_][A-Za-z0-9_]*$/.test(d.id)}
                />
              </label>
              <button
                type="button"
                className="icon-btn"
                title="Delete this question"
                aria-label={`Delete question ${d.id}`}
                onClick={() => onChange(drafts.filter((x) => x.uid !== d.uid))}
              >
                ✕
              </button>
            </header>
            <p className="qcard-hint">
              Variable name: the key you will find in the API answer (letters, numbers, _).
            </p>

            <div className="seg" role="radiogroup" aria-label="Question type">
              {TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  role="radio"
                  aria-checked={d.type === t.type}
                  className={d.type === t.type ? 'seg-btn is-on' : 'seg-btn'}
                  onClick={() => setType(d, t.type)}
                  title={t.blurb}
                >
                  <span className="seg-icon" aria-hidden>
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>

            <label className="qfield">
              <span className="qfield-label">Question asked to Jev</span>
              <textarea
                rows={2}
                value={d.instructions}
                placeholder="e.g. What type of legal document is this?"
                onChange={(e) => update(d.uid, { instructions: e.target.value })}
                aria-invalid={!d.instructions.trim()}
              />
            </label>

            {d.type === 'choice' && (
              <div className="qfield">
                <span className="qfield-label">
                  Options <span className="muted">({d.options.length}, 2 to 255)</span>
                </span>
                <ul className="rows">
                  {d.options.map((o) => (
                    <li key={o.uid} className="row">
                      <input
                        type="text"
                        className="row-key"
                        value={o.key}
                        placeholder="name"
                        spellCheck={false}
                        aria-label="Option name"
                        aria-invalid={!o.key.trim()}
                        onChange={(e) =>
                          update(d.uid, {
                            options: d.options.map((x) => (x.uid === o.uid ? { ...x, key: e.target.value } : x)),
                          })
                        }
                      />
                      <input
                        type="text"
                        className="row-desc"
                        value={o.description}
                        placeholder="What does this option cover?"
                        aria-label="Option description"
                        onChange={(e) =>
                          update(d.uid, {
                            options: d.options.map((x) =>
                              x.uid === o.uid ? { ...x, description: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Remove option ${o.key}`}
                        disabled={d.options.length <= 2}
                        onClick={() => update(d.uid, { options: d.options.filter((x) => x.uid !== o.uid) })}
                      >
                        −
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="add-row"
                  disabled={d.options.length >= 255}
                  onClick={() =>
                    update(d.uid, {
                      options: [...d.options, { uid: uid(), key: `option${d.options.length + 1}`, description: '' }],
                    })
                  }
                >
                  + Add option
                </button>
              </div>
            )}

            {d.type === 'score' && (
              <div className="qfield">
                <span className="qfield-label">
                  Levels, lowest to highest <span className="muted">({d.levels.length}, 2 to 10)</span>
                </span>
                <ol className="rows">
                  {d.levels.map((l, li) => (
                    <li key={l.uid} className="row">
                      <span className="row-level">{li}</span>
                      <input
                        type="text"
                        className="row-desc"
                        value={l.text}
                        placeholder={li === 0 ? 'Lowest level' : li === d.levels.length - 1 ? 'Highest level' : 'Level'}
                        aria-label={`Level ${li}`}
                        aria-invalid={!l.text.trim()}
                        onChange={(e) =>
                          update(d.uid, {
                            levels: d.levels.map((x) => (x.uid === l.uid ? { ...x, text: e.target.value } : x)),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Move level ${li} up`}
                        disabled={li === 0}
                        onClick={() => {
                          const next = [...d.levels];
                          [next[li - 1], next[li]] = [next[li], next[li - 1]];
                          update(d.uid, { levels: next });
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Remove level ${li}`}
                        disabled={d.levels.length <= 2}
                        onClick={() => update(d.uid, { levels: d.levels.filter((x) => x.uid !== l.uid) })}
                      >
                        −
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="add-row"
                  disabled={d.levels.length >= 10}
                  onClick={() => update(d.uid, { levels: [...d.levels, { uid: uid(), text: '' }] })}
                >
                  + Add level
                </button>
              </div>
            )}

            {d.type === 'boolean' && (
              <div className="qfield">
                <span className="qfield-label">
                  What counts as yes / no <span className="muted">(optional)</span>
                </span>
                <div className="row">
                  <span className="row-tag yes">Yes</span>
                  <input
                    type="text"
                    className="row-desc"
                    value={d.trueText}
                    placeholder="e.g. A deadline or hearing date is mentioned."
                    aria-label="Description of yes"
                    onChange={(e) => update(d.uid, { trueText: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="row-tag no">No</span>
                  <input
                    type="text"
                    className="row-desc"
                    value={d.falseText}
                    placeholder="e.g. No deadline to meet."
                    aria-label="Description of no"
                    onChange={(e) => update(d.uid, { falseText: e.target.value })}
                  />
                </div>
              </div>
            )}

            <p className="how">
              <strong>How Jev decides:</strong> {info.how}
            </p>
          </article>
        );
      })}

      <div className="qe-add">
        <span className="qfield-label">Add a question</span>
        <div className="qe-add-grid">
          {TYPES.map((t) => (
            <button key={t.type} type="button" className="add-type" onClick={() => onChange([...drafts, newDraft(t.type, drafts)])}>
              <span className="seg-icon" aria-hidden>
                {t.icon}
              </span>
              <strong>{t.label}</strong>
              <span className="muted">{t.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
