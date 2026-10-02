// Pure text-cleaning helpers for CIA World Factbook strings, shared by
// enrichCountries.ts and tested directly without running the live fetch pipeline.

export function getText(obj: unknown): string | undefined {
  if (obj && typeof obj === 'object' && 'text' in (obj as object)) {
    const t = (obj as { text: unknown }).text;
    return typeof t === 'string' ? t : undefined;
  }
  return undefined;
}

export function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return m ? m[0].trim() : text.split('\n')[0].trim();
}

// Decode the handful of HTML entities that appear in factbook JSON strings
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ',
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
  '&agrave;': 'à', '&egrave;': 'è', '&igrave;': 'ì', '&ograve;': 'ò', '&ugrave;': 'ù',
  '&acirc;': 'â', '&ecirc;': 'ê', '&icirc;': 'î', '&ocirc;': 'ô', '&ucirc;': 'û',
  '&atilde;': 'ã', '&ntilde;': 'ñ', '&otilde;': 'õ',
  '&auml;': 'ä', '&euml;': 'ë', '&iuml;': 'ï', '&ouml;': 'ö', '&uuml;': 'ü', '&yuml;': 'ÿ', '&yacute;': 'ý',
  '&ccedil;': 'ç', '&szlig;': 'ß',
};
export function decodeHtml(s: string): string {
  return s.replace(/&[a-z]+;/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? '');
}

export function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ');
}

// Lowercase, decode HTML, strip diacritics + punctuation, collapse spaces
export function norm(name: string): string {
  return decodeHtml(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// highestPoint/lowestPoint are "<name> <elevation>" facts — strip HTML noise and
// drop parenthetical asides / trailing "note -" clauses so only the place name remains.
// Returns undefined for entries with no real named point (e.g. "unnamed elevation ...").
export function cleanNamedPlace(raw: string): string | undefined {
  const s = stripHtmlTags(decodeHtml(raw).replace(/<br\s*\/?>/gi, '; '))
    .split(';')[0]
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || /^unnamed elevation/i.test(s)) return undefined;
  return s;
}

// nationalSymbols often lists multiple symbols separated by ';' and uses parentheses
// for genuine alternate/scientific names, so only HTML noise is stripped here.
export function cleanSymbolText(raw: string): string {
  return stripHtmlTags(decodeHtml(raw)).replace(/\s+/g, ' ').trim();
}
