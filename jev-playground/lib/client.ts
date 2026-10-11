import type { EvaluateResponse, Questions } from './types';

export async function callJev(state: string, questions: Questions, signal?: AbortSignal) {
  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, questions }),
    signal,
  });
  const data = await res.json().catch(() => ({ error: `Unreadable response (HTTP ${res.status}).` }));
  if (!res.ok) throw new Error(data.error ?? `HTTP error ${res.status}.`);
  return data as EvaluateResponse;
}

/** Exécute fn sur chaque élément avec au plus `limit` appels en parallèle. */
export async function runPool<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal,
) {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
