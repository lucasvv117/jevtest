import { experimental_evaluate as evaluate, type Experimental_EvaluationQuestion } from 'ai';
import { validateQuestions, type EvaluateResponse } from '@/lib/types';

export const maxDuration = 30;

const MODEL = process.env.JEV_MODEL ?? 'typesafe-ai/jev';
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

  const started = performance.now();
  try {
    const result = await evaluate({
      model: MODEL,
      state,
      questions: questions as Record<string, Experimental_EvaluationQuestion>,
      maxRetries: 1,
      providerOptions: {
        // Données juridiques : pas de rétention ni d'entraînement côté fournisseur.
        gateway: { zeroDataRetention: true, disallowPromptTraining: true },
      },
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
    console.error('[jev] evaluate failed:', message);
    const hint = /401|403|authenticat|unauthori|forbidden/i.test(message)
      ? ' Vérifiez que AI Gateway est activé sur le projet Vercel (ou que AI_GATEWAY_API_KEY est défini en local).'
      : '';
    return Response.json({ error: `Échec de l’appel à Jev : ${message}.${hint}` }, { status: 502 });
  }
}
