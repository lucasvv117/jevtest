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
    return 'Les questions doivent être un objet JSON { identifiant: question }.';
  }
  const entries = Object.entries(q as Record<string, unknown>);
  if (entries.length === 0) return 'Ajoutez au moins une question.';
  for (const [id, raw] of entries) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
      return `Identifiant « ${id} » invalide : lettres, chiffres et _ uniquement.`;
    }
    const v = raw as Partial<Question>;
    if (!v || typeof v !== 'object') return `« ${id} » doit être un objet.`;
    if (typeof v.instructions !== 'string' || !v.instructions.trim()) {
      return `« ${id} » : le champ instructions est vide.`;
    }
    if (v.type === 'choice') {
      const c = (v as ChoiceQuestion).criteria;
      if (!c || typeof c !== 'object' || Array.isArray(c)) {
        return `« ${id} » : criteria doit être un objet { option: description }.`;
      }
      const n = Object.keys(c).length;
      if (n < 2 || n > 255) return `« ${id} » : prévoyez entre 2 et 255 options.`;
    } else if (v.type === 'score') {
      const c = (v as ScoreQuestion).criteria;
      if (!Array.isArray(c) || c.length < 2 || c.length > 10) {
        return `« ${id} » : criteria doit être une liste de 2 à 10 niveaux.`;
      }
    } else if (v.type !== 'boolean') {
      return `« ${id} » : type doit valoir choice, score ou boolean.`;
    }
  }
  return null;
}
