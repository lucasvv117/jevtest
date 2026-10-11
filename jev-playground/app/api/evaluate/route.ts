import { typeSafeAi } from '@ai-sdk/typesafe-ai';
import { experimental_decide as decide, type Experimental_DecisionQuestion } from 'ai';
import { validateQuestions, type EvaluateResponse } from '@/lib/types';

export const maxDuration = 30;

// Appel direct à l'API TypeSafe (clé TYPESAFE_AI_API_KEY, console.typesafe.ai/keys).
const MODEL = process.env.JEV_MODEL ?? 'jev-latest';
// ~32k tokens max pour le state côté Jev : on coupe large côté caractères.
const MAX_STATE_CHARS = 100_000;

export async function POST(request: Request) {
  let body: { state?: unknown; questions?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Corps de requête JSON invalide.' }, { status: 400 });
  }

  const { state, questions } = body;
  if (typeof state !== 'string' || !state.trim()) {
    return Response.json({ error: 'Le texte à évaluer est vide.' }, { status: 400 });
  }
  if (state.length > MAX_STATE_CHARS) {
    return Response.json(
      { error: `Texte trop long (${state.length} caractères, max ${MAX_STATE_CHARS}).` },
      { status: 400 },
    );
  }
  const invalid = validateQuestions(questions);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  if (!process.env.TYPESAFE_AI_API_KEY) {
    return Response.json(
      { error: 'TYPESAFE_AI_API_KEY manquante : ajoutez-la dans les variables d’environnement.' },
      { status: 500 },
    );
  }

  const started = performance.now();
  try {
    const result = await decide({
      model: typeSafeAi.decisionModel(MODEL),
      state,
      questions: questions as Record<string, Experimental_DecisionQuestion>,
      maxRetries: 1,
    });

    const confidence =
      ((result.providerMetadata?.typesafe as Record<string, unknown> | undefined)?.confidence as
        | Record<string, number>
        | undefined) ?? {};

    const payload: EvaluateResponse = {
      answers: result.answers as EvaluateResponse['answers'],
      confidence,
      usage: { inputTokens: result.usage.inputTokens, totalTokens: result.usage.totalTokens },
      latencyMs: Math.round(performance.now() - started),
    };
    return Response.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[jev] decide failed:', message);
    const hint = /401|403|authenticat|unauthori|forbidden/i.test(message)
      ? ' Vérifiez TYPESAFE_AI_API_KEY (console.typesafe.ai/keys).'
      : /402|credit|balance|payment/i.test(message)
        ? ' Vérifiez les crédits du compte TypeSafe.'
        : '';
    return Response.json({ error: `Échec de l’appel à Jev : ${message}.${hint}` }, { status: 502 });
  }
}
