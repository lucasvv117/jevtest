import type { Question, Questions } from './types';

/**
 * Editable model behind the visual questions editor.
 * Each row carries a stable uid so React keys survive renames and reordering.
 */
export type OptionDraft = { uid: string; key: string; description: string };
export type LevelDraft = { uid: string; text: string };
export type QuestionDraft = {
  uid: string;
  id: string;
  type: Question['type'];
  instructions: string;
  options: OptionDraft[];
  levels: LevelDraft[];
  trueText: string;
  falseText: string;
};

let counter = 0;
export const uid = () => `u${++counter}`;

export function toDrafts(questions: Questions): QuestionDraft[] {
  return Object.entries(questions).map(([id, q]) => ({
    uid: uid(),
    id,
    type: q.type,
    instructions: q.instructions,
    options:
      q.type === 'choice'
        ? Object.entries(q.criteria).map(([key, description]) => ({ uid: uid(), key, description }))
        : [],
    levels: q.type === 'score' ? q.criteria.map((text) => ({ uid: uid(), text })) : [],
    trueText: q.type === 'boolean' ? (q.criteria?.true ?? '') : '',
    falseText: q.type === 'boolean' ? (q.criteria?.false ?? '') : '',
  }));
}

export function fromDrafts(drafts: QuestionDraft[]): Questions {
  const out: Questions = {};
  for (const d of drafts) {
    if (d.type === 'choice') {
      out[d.id] = {
        type: 'choice',
        instructions: d.instructions,
        criteria: Object.fromEntries(d.options.map((o) => [o.key, o.description])),
      };
    } else if (d.type === 'score') {
      out[d.id] = { type: 'score', instructions: d.instructions, criteria: d.levels.map((l) => l.text) };
    } else {
      const criteria = {
        ...(d.trueText.trim() && { true: d.trueText }),
        ...(d.falseText.trim() && { false: d.falseText }),
      };
      out[d.id] = {
        type: 'boolean',
        instructions: d.instructions,
        ...(Object.keys(criteria).length > 0 && { criteria }),
      };
    }
  }
  return out;
}

/** Checks that only the drafts can catch (an object can't hold duplicate keys). */
export function draftError(drafts: QuestionDraft[]): string | null {
  const ids = new Set<string>();
  for (const d of drafts) {
    if (ids.has(d.id)) return `Two questions share the name “${d.id}”.`;
    ids.add(d.id);
    if (d.type === 'choice') {
      const keys = new Set<string>();
      for (const o of d.options) {
        if (!o.key.trim()) return `“${d.id}”: every option needs a name.`;
        if (keys.has(o.key)) return `“${d.id}”: two options are named “${o.key}”.`;
        keys.add(o.key);
      }
    }
    if (d.type === 'score' && d.levels.some((l) => !l.text.trim())) {
      return `“${d.id}”: every level needs a description.`;
    }
  }
  return null;
}

export function newDraft(type: Question['type'], existing: QuestionDraft[]): QuestionDraft {
  const base = { choice: 'category', score: 'level', boolean: 'isTrue' }[type];
  let id = base;
  for (let n = 2; existing.some((d) => d.id === id); n++) id = `${base}${n}`;
  return {
    uid: uid(),
    id,
    type,
    instructions: '',
    options:
      type === 'choice'
        ? [
            { uid: uid(), key: 'optionA', description: '' },
            { uid: uid(), key: 'optionB', description: '' },
          ]
        : [],
    levels: type === 'score' ? [{ uid: uid(), text: '' }, { uid: uid(), text: '' }, { uid: uid(), text: '' }] : [],
    trueText: '',
    falseText: '',
  };
}
