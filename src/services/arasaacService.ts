/**
 * Servicio de pictogramas ARASAAC (https://arasaac.org)
 *
 * Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido
 * creados por Sergio Palao para ARASAAC, que los distribuye bajo Licencia
 * Creative Commons BY-NC-SA 4.0. Uso no comercial obligatorio y atribución visible.
 */
import { devLogger } from './loggerService';

const API_BASE = 'https://api.arasaac.org/v1/pictograms';
const STATIC_BASE = 'https://static.arasaac.org/pictograms';
const LOCALE = 'es';

export const ARASAAC_ATTRIBUTION =
  'Pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España).';

interface ArasaacPictogram {
  _id: number;
  keywords?: { keyword: string }[];
}

// Caché en memoria: palabra -> id de pictograma (o null si no existe)
const cache = new Map<string, number | null>();

export function getPictogramImageUrl(id: number, resolution: 300 | 500 | 2500 = 300): string {
  return `${STATIC_BASE}/${id}/${id}_${resolution}.png`;
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<ArasaacPictogram[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null; // 404 = sin resultados
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Busca el pictograma más adecuado para una palabra.
 * 1º "bestsearch" (coincidencia exacta de palabra clave), 2º "search" (búsqueda amplia).
 */
export async function findPictogramId(rawWord: string): Promise<number | null> {
  const word = rawWord.trim().toLowerCase();
  if (!word) return null;
  if (cache.has(word)) return cache.get(word) ?? null;

  const encoded = encodeURIComponent(word);
  let results = await fetchJson(`${API_BASE}/${LOCALE}/bestsearch/${encoded}`);
  if (!results || results.length === 0) {
    results = await fetchJson(`${API_BASE}/${LOCALE}/search/${encoded}`);
  }

  const id = results && results.length > 0 ? results[0]._id : null;
  cache.set(word, id);

  if (id) {
    devLogger.info('ARASAAC', `Pictograma encontrado para "${word}" → #${id}`);
  } else {
    devLogger.warn('ARASAAC', `Sin pictograma para "${word}"`);
  }
  return id;
}

/** Resuelve varias palabras en paralelo (limitando la concurrencia para no saturar la API) */
export async function findPictogramIds(words: string[], concurrency = 6): Promise<Map<string, number | null>> {
  const unique = Array.from(new Set(words.map(w => w.trim().toLowerCase()).filter(Boolean)));
  const result = new Map<string, number | null>();
  let index = 0;

  const worker = async () => {
    while (index < unique.length) {
      const current = unique[index++];
      result.set(current, await findPictogramId(current));
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return result;
}
