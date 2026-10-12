'use client';

/** Text extraction from PDFs, entirely in the browser (files never leave the user's machine). */

type PdfJs = typeof import('pdfjs-dist');
let pdfjs: Promise<PdfJs> | null = null;

function loadPdfJs() {
  pdfjs ??= import('pdfjs-dist').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return lib;
  });
  return pdfjs;
}

export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  const lib = await loadPdfJs();
  const task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    let page = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      page += item.str + (item.hasEOL ? '\n' : ' ');
    }
    pages.push(page.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim());
  }
  const numPages = doc.numPages;
  await task.destroy();
  return { text: pages.join('\n\n').trim(), pages: numPages };
}

const MONTHS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';

/** Best-effort metadata from the decision's text: court, date, case number. Purely heuristic. */
export function guessDecisionMeta(text: string) {
  const head = text.slice(0, 4000);
  const court = head.match(
    /(Cour de cassation|Conseil d['’]État|Conseil constitutionnel|Cour d['’]appel(?: administrative)? d[e'’]\s?[A-ZÉÈ][\p{L}-]+(?:[ -][A-ZÉÈ][\p{L}-]+)?|Tribunal (?:judiciaire|administratif|de commerce|correctionnel|de grande instance|d['’]instance) d[e'’]\s?[A-ZÉÈ][\p{L}-]+|Conseil de prud['’]hommes d[e'’]\s?[A-ZÉÈ][\p{L}-]+)/iu,
  )?.[1];
  const date = head.match(new RegExp(`\\b(1er|\\d{1,2})\\s+(${MONTHS})\\s+(\\d{4})\\b`, 'i'))?.[0];
  const number =
    head.match(/\b(\d{2}-\d{2}\.\d{3}|RG\s?\d{2}\/\d{4,6}|\d{2}\/\d{4,6})\b/i)?.[1] ??
    head.match(/\bn°\s?(\d{5,7})\b/i)?.[1];
  return { court, date, number };
}
