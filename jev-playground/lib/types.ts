export type ChoiceQuestion = {
  type: 'choice';
  instructions: string;
  /** clé de l'option -> description */
  criteria: Record<string, string>;
};

export type ScoreQuestion = {
  type: 'score';
  instructions: string;
  /** niveaux du plus faible au plus fort (2 à 10) */
  criteria: string[];
};

export type BooleanQuestion = {
  type: 'boolean';
  instructions: string;
  criteria?: { true?: string; false?: string };
};

export type Question = ChoiceQuestion | ScoreQuestion | BooleanQuestion;
export type Questions = Record<string, Question>;

export type UseCase = {
  id: string;
  name: string;
  description: string;
  questions: Questions;
  /** exemples de textes pour tester rapidement */
  examples: string[];
  /** rendu spécifique des résultats (sinon : une carte par question) */
  view?: 'fra-agent' | 'decision-relevance';
};

export type ChoiceAnswer = { type: 'choice'; choice: string; probabilities?: Record<string, number> };
export type ScoreAnswer = { type: 'score'; score: number; probabilities?: Record<string, number> };
export type BooleanAnswer = { type: 'boolean'; probability: number };
export type Answer = ChoiceAnswer | ScoreAnswer | BooleanAnswer;

export type EvaluateResponse = {
  answers: Record<string, Answer>;
  confidence: Record<string, number>;
  usage: { inputTokens?: number; totalTokens?: number };
  latencyMs: number;
};

/** Tarif Jev (affiché sur AI Gateway, à confirmer en direct chez TypeSafe) : 0,042 $ / 1M tokens d'entrée, sortie gratuite. */
export const PRICE_PER_MILLION_INPUT = 0.042;

/** Validation légère, partagée client/serveur. Renvoie un message d'erreur ou null. */
export function validateQuestions(q: unknown): string | null {
  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    return 'Questions must be a JSON object { name: question }.';
  }
  const entries = Object.entries(q as Record<string, unknown>);
  if (entries.length === 0) return 'Add at least one question.';
  for (const [id, raw] of entries) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
      return `Invalid name “${id}”: letters, numbers and _ only (cannot start with a number).`;
    }
    const v = raw as Partial<Question>;
    if (!v || typeof v !== 'object') return `“${id}” must be an object.`;
    if (typeof v.instructions !== 'string' || !v.instructions.trim()) {
      return `“${id}”: the question asked to Jev is empty.`;
    }
    if (v.type === 'choice') {
      const c = (v as ChoiceQuestion).criteria;
      if (!c || typeof c !== 'object' || Array.isArray(c)) {
        return `“${id}”: criteria must be an object { option: description }.`;
      }
      const n = Object.keys(c).length;
      if (n < 2 || n > 255) return `“${id}”: use between 2 and 255 options.`;
    } else if (v.type === 'score') {
      const c = (v as ScoreQuestion).criteria;
      if (!Array.isArray(c) || c.length < 2 || c.length > 10) {
        return `“${id}”: use between 2 and 10 levels.`;
      }
    } else if (v.type !== 'boolean') {
      return `“${id}”: type must be choice, score or boolean.`;
    }
  }
  return null;
}
