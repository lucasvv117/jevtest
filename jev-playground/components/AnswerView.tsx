'use client';

import type { Answer, Question } from '@/lib/types';

const pct = (p: number) => `${Math.round(p * 100)}%`;

function Bars({
  rows,
  selected,
}: {
  rows: { key: string; label: string; p: number }[];
  selected?: string;
}) {
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.key} className={r.key === selected ? 'bar is-top' : 'bar'}>
          <span className="bar-label" title={r.label}>
            <strong>{r.key}</strong>
            {r.label !== r.key && <span className="bar-desc">{r.label}</span>}
          </span>
          <span className="bar-track" aria-hidden>
            <span className="bar-fill" style={{ width: `${Math.max(r.p * 100, 0.5)}%` }} />
          </span>
          <span className="bar-value">{pct(r.p)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnswerView({
  id,
  question,
  answer,
  confidence,
}: {
  id: string;
  question?: Question;
  answer: Answer;
  confidence?: number;
}) {
  let headline: string;
  let body: React.ReactNode = null;

  if (answer.type === 'choice') {
    const criteria = question?.type === 'choice' ? question.criteria : {};
    const probs = answer.probabilities ?? { [answer.choice]: 1 };
    const rows = Object.keys({ ...criteria, ...probs })
      .map((k) => ({ key: k, label: criteria[k] ?? k, p: probs[k] ?? 0 }))
      .sort((a, b) => b.p - a.p);
    headline = answer.choice;
    body = <Bars rows={rows} selected={answer.choice} />;
  } else if (answer.type === 'score') {
    const levels = question?.type === 'score' ? question.criteria : [];
    const probs = answer.probabilities ?? {};
    const n = Math.max(levels.length, Object.keys(probs).length);
    const rows = Array.from({ length: n }, (_, i) => ({
      key: String(i),
      label: levels[i] ?? `Level ${i}`,
      p: probs[String(i)] ?? 0,
    }));
    const top = rows.reduce((a, b) => (b.p > a.p ? b : a), rows[0]);
    headline = `${answer.score.toFixed(2)} / ${n - 1}`;
    body = (
      <>
        <div className="scale" aria-label={`Score ${answer.score.toFixed(2)} out of ${n - 1}`}>
          <span className="scale-marker" style={{ left: `${(answer.score / Math.max(n - 1, 1)) * 100}%` }} />
        </div>
        <Bars rows={rows} selected={top?.key} />
      </>
    );
  } else {
    const p = answer.probability;
    headline = p >= 0.5 ? `Yes, ${pct(p)}` : `No, ${pct(1 - p)}`;
    body = (
      <div className="boolean">
        <span className="bool-side">No</span>
        <span className="bar-track">
          <span className="bar-fill" style={{ width: `${p * 100}%` }} />
          <span className="bool-mid" aria-hidden />
        </span>
        <span className="bool-side">Yes</span>
        <span className="bar-value">P(yes) = {p.toFixed(2)}</span>
      </div>
    );
  }

  return (
    <section className="answer">
      <header className="answer-head">
        <div>
          <h3>{id}</h3>
          {question && <p className="answer-q">{question.instructions}</p>}
        </div>
        <div className="answer-result">
          <span className="answer-headline">{headline}</span>
          {typeof confidence === 'number' && (
            <span className="answer-conf" title="How concentrated the distribution is (0 = spread out, 1 = certain)">
              confidence {confidence.toFixed(2)}
            </span>
          )}
        </div>
      </header>
      {body}
    </section>
  );
}
