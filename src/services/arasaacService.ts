/**
 * Servicio de pictogramas ARASAAC (https://arasaac.org) + Búsqueda de sinónimos,
 * descomposición en múltiples pictogramas, búsqueda de imágenes explicativas (Wikipedia/Wikimedia)
 * y diccionario personalizable para profesores/usuarios.
 *
 * Los símbolos pictográficos utilizados son propiedad del Gobierno de Aragón y han sido
 * creados por Sergio Palao para ARASAAC, que los distribuye bajo Licencia
 * Creative Commons BY-NC-SA 4.0. Uso no comercial obligatorio y atribución visible.
 */
import { devLogger } from './loggerService';
import { CustomPictogramEntry, SubPictogramItem } from '../types';

const API_BASE = 'https://api.arasaac.org/v1/pictograms';
const STATIC_BASE = 'https://static.arasaac.org/pictograms';
const LOCALE = 'es';
const CUSTOM_PICTO_STORAGE_KEY = 'a11y_custom_pictograms_v1';

export const ARASAAC_ATTRIBUTION =
  'Pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia: CC (BY-NC-SA). Propiedad: Gobierno de Aragón (España).';

interface ArasaacPictogram {
  _id: number;
  keywords?: { keyword: string }[];
}

export interface ArasaacSearchCandidate {
  id: number;
  keyword: string;
  imageUrl: string;
}

export interface ExplanatoryImageResult {
  imageUrl: string;
  description?: string;
  sourceTitle?: string;
}

// Caché en memoria: palabra -> id de pictograma (o null si no existe)
const cache = new Map<string, number | null>();
// Caché en memoria para imágenes explicativas web
const webImageCache = new Map<string, ExplanatoryImageResult | null>();

/**
 * Diccionario local de respaldo para conceptos abstractos, históricos, sociales o científicos
 * por si ARASAAC no tiene un pictograma único directo.
 */
export const CONCEPT_FALLBACK_DICTIONARY: Record<
  string,
  {
    synonyms: string[];
    compoundKeywords: string[];
    explanation: string;
    preferWebImage?: boolean;
  }
> = {
  socialismo: {
    synonyms: ['igualdad', 'compartir', 'comunidad'],
    compoundKeywords: ['compartir', 'igualdad', 'trabajador'],
    explanation: 'Sistema que busca repartir entre todos y proteger a los trabajadores',
    preferWebImage: true
  },
  socialista: {
    synonyms: ['igualdad', 'compartir', 'comunidad'],
    compoundKeywords: ['compartir', 'igualdad', 'grupo'],
    explanation: 'Persona o idea que defiende compartir e igualdad social',
    preferWebImage: true
  },
  capitalismo: {
    synonyms: ['dinero', 'mercado', 'empresa'],
    compoundKeywords: ['dinero', 'empresa', 'comprar'],
    explanation: 'Sistema económico basado en empresas privadas y mercado',
    preferWebImage: true
  },
  comunismo: {
    synonyms: ['comunidad', 'compartir', 'estado'],
    compoundKeywords: ['compartir', 'trabajo', 'estado'],
    explanation: 'Sistema donde los bienes son comunes para toda la sociedad',
    preferWebImage: true
  },
  democracia: {
    synonyms: ['votar', 'elecciones', 'pueblo'],
    compoundKeywords: ['votar', 'persona', 'ley'],
    explanation: 'Sistema donde todas las personas votan para elegir a sus representantes',
    preferWebImage: true
  },
  dictadura: {
    synonyms: ['mandar', 'prohibir', 'poder'],
    compoundKeywords: ['mandar', 'una', 'persona'],
    explanation: 'Gobierno donde una sola persona manda sin elecciones libres',
    preferWebImage: true
  },
  constitución: {
    synonyms: ['ley', 'norma', 'derecho'],
    compoundKeywords: ['libro', 'ley', 'país'],
    explanation: 'Libro con las leyes más importantes de un país'
  },
  constitucion: {
    synonyms: ['ley', 'norma', 'derecho'],
    compoundKeywords: ['libro', 'ley', 'país'],
    explanation: 'Libro con las leyes más importantes de un país'
  },
  revolución: {
    synonyms: ['cambio', 'protesta', 'historia'],
    compoundKeywords: ['cambiar', 'pueblo', 'historia'],
    explanation: 'Cambio grande y rápido en la sociedad o el gobierno',
    preferWebImage: true
  },
  fotosíntesis: {
    synonyms: ['planta', 'sol', 'hoja'],
    compoundKeywords: ['planta', 'sol', 'agua'],
    explanation: 'Proceso por el que las plantas se alimentan con luz del sol y agua',
    preferWebImage: true
  },
  ecosistema: {
    synonyms: ['naturaleza', 'bosque', 'animales'],
    compoundKeywords: ['animal', 'planta', 'naturaleza'],
    explanation: 'Conjunto de seres vivos y el lugar natural donde viven',
    preferWebImage: true
  },
  biodiversidad: {
    synonyms: ['naturaleza', 'animales', 'plantas'],
    compoundKeywords: ['animal', 'planta', 'planeta'],
    explanation: 'Variedad de animales y plantas que viven en la Tierra'
  },
  sostenibilidad: {
    synonyms: ['cuidar', 'naturaleza', 'reciclar'],
    compoundKeywords: ['cuidar', 'planeta', 'futuro'],
    explanation: 'Cuidar el planeta para no agotar sus recursos'
  },
  empatía: {
    synonyms: ['comprender', 'ayudar', 'sentir'],
    compoundKeywords: ['pensar', 'sentimiento', 'amigo'],
    explanation: 'Ponerse en el lugar de otra persona y entender cómo se siente'
  },
  solidaridad: {
    synonyms: ['ayudar', 'compartir', 'apoyar'],
    compoundKeywords: ['ayudar', 'compartir', 'persona'],
    explanation: 'Ayudar y apoyar a otras personas cuando lo necesitan'
  },
  inflación: {
    synonyms: ['caro', 'subir', 'precio'],
    compoundKeywords: ['subir', 'precio', 'dinero'],
    explanation: 'Cuando suben los precios de las cosas que compramos'
  },
  impuesto: {
    synonyms: ['pagar', 'dinero', 'estado'],
    compoundKeywords: ['pagar', 'dinero', 'gobierno'],
    explanation: 'Dinero que se aporta para pagar hospitales, colegios y calles'
  },
  impuestos: {
    synonyms: ['pagar', 'dinero', 'estado'],
    compoundKeywords: ['pagar', 'dinero', 'gobierno'],
    explanation: 'Dinero que se aporta para pagar hospitales, colegios y calles'
  },
  feudalismo: {
    synonyms: ['castillo', 'rey', 'campesino'],
    compoundKeywords: ['rey', 'castillo', 'campesino'],
    explanation: 'Sistema de la Edad Media con reyes, nobles en castillos y campesinos',
    preferWebImage: true
  },
  ilustración: {
    synonyms: ['conocimiento', 'libro', 'ciencia'],
    compoundKeywords: ['pensar', 'ciencia', 'libro'],
    explanation: 'Época histórica que defendió la razón, la ciencia y la educación'
  },
  globalización: {
    synonyms: ['mundo', 'conectar', 'país'],
    compoundKeywords: ['mundo', 'comunicar', 'comercio'],
    explanation: 'Conexión de todos los países del mundo en comercio y comunicación'
  }
};

export function normalizeWordKey(rawWord: string): string {
  return rawWord
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?¡¿"'()[\]{}]/g, '');
}

export function getPictogramImageUrl(id: number, resolution: 300 | 500 | 2500 = 300): string {
  return `${STATIC_BASE}/${id}/${id}_${resolution}.png`;
}

/**
 * Gestión del diccionario personalizado de profesores / usuarios en localStorage
 */
export function getAllCustomPictograms(): Record<string, CustomPictogramEntry> {
  try {
    const raw = localStorage.getItem(CUSTOM_PICTO_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getCustomPictogram(rawWord: string): CustomPictogramEntry | null {
  const key = normalizeWordKey(rawWord);
  if (!key) return null;
  const all = getAllCustomPictograms();
  return all[key] || null;
}

export function saveCustomPictogram(entry: CustomPictogramEntry): void {
  const key = normalizeWordKey(entry.word);
  if (!key) return;
  try {
    const all = getAllCustomPictograms();
    all[key] = {
      ...entry,
      word: key,
      updatedAt: Date.now()
    };
    localStorage.setItem(CUSTOM_PICTO_STORAGE_KEY, JSON.stringify(all));
    devLogger.success('CustomPicto', `Guardado pictograma/imagen personalizada para "${key}"`);
  } catch (err) {
    devLogger.error('CustomPicto', 'No se pudo guardar en localStorage (posible límite de espacio)', err);
  }
}

export function removeCustomPictogram(rawWord: string): void {
  const key = normalizeWordKey(rawWord);
  if (!key) return;
  try {
    const all = getAllCustomPictograms();
    if (all[key]) {
      delete all[key];
      localStorage.setItem(CUSTOM_PICTO_STORAGE_KEY, JSON.stringify(all));
      devLogger.info('CustomPicto', `Eliminado pictograma personalizado de "${key}"`);
    }
  } catch {
    // ignore
  }
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Genera variantes morfológicas simples (singular, masculino, raíz sin sufijos abstractos)
 * para aumentar la probabilidad de encontrar un pictograma en ARASAAC.
 */
export function getMorphologicalVariants(rawWord: string): string[] {
  const w = normalizeWordKey(rawWord);
  if (!w || w.length < 3) return [];
  const variants = new Set<string>();

  // Plurales en -es / -s
  if (w.endsWith('ciones')) {
    variants.add(w.slice(0, -6) + 'ción');
    variants.add(w.slice(0, -6) + 'r');
  }
  if (w.endsWith('ción')) {
    variants.add(w.slice(0, -4) + 'r');
    variants.add(w.slice(0, -3) + 'r');
  }
  if (w.endsWith('miento')) {
    variants.add(w.slice(0, -6) + 'r');
    variants.add(w.slice(0, -5) + 'r');
  }
  if (w.endsWith('mente') && w.length > 7) {
    const adj = w.slice(0, -5);
    variants.add(adj);
    if (adj.endsWith('a')) variants.add(adj.slice(0, -1) + 'o');
  }
  if (w.endsWith('ces')) {
    variants.add(w.slice(0, -3) + 'z');
  }
  if (w.endsWith('es') && w.length > 4) {
    variants.add(w.slice(0, -2));
  }
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    const sing = w.slice(0, -1);
    variants.add(sing);
    if (sing.endsWith('a')) variants.add(sing.slice(0, -1) + 'o');
  }
  if (w.endsWith('a') && w.length > 3) {
    variants.add(w.slice(0, -1) + 'o');
  }

  variants.delete(w);
  return Array.from(variants);
}

/**
 * Busca el pictograma más adecuado para una palabra en ARASAAC.
 * 1º "bestsearch" (coincidencia exacta de palabra clave), 2º "search" (búsqueda amplia).
 */
export async function findPictogramId(rawWord: string): Promise<number | null> {
  const word = normalizeWordKey(rawWord);
  if (!word) return null;
  if (cache.has(word)) return cache.get(word) ?? null;

  const encoded = encodeURIComponent(word);
  let results = (await fetchJson(`${API_BASE}/${LOCALE}/bestsearch/${encoded}`)) as ArasaacPictogram[] | null;
  if (!Array.isArray(results) || results.length === 0) {
    results = (await fetchJson(`${API_BASE}/${LOCALE}/search/${encoded}`)) as ArasaacPictogram[] | null;
  }

  const id = Array.isArray(results) && results.length > 0 ? results[0]._id : null;
  cache.set(word, id);

  if (id) {
    devLogger.info('ARASAAC', `Pictograma encontrado para "${word}" → #${id}`);
  } else {
    devLogger.warn('ARASAAC', `Sin pictograma directo para "${word}"`);
  }
  return id;
}

/**
 * Busca múltiples candidatos de pictogramas en ARASAAC para que el profesor o usuario
 * pueda elegir visualmente entre varios resultados.
 */
export async function searchPictogramsByTerm(rawQuery: string, limit = 12): Promise<ArasaacSearchCandidate[]> {
  const query = normalizeWordKey(rawQuery);
  if (!query) return [];

  const encoded = encodeURIComponent(query);
  const best = (await fetchJson(`${API_BASE}/${LOCALE}/bestsearch/${encoded}`)) as ArasaacPictogram[] | null;
  const broad = (await fetchJson(`${API_BASE}/${LOCALE}/search/${encoded}`)) as ArasaacPictogram[] | null;

  const combined: ArasaacPictogram[] = [
    ...(Array.isArray(best) ? best : []),
    ...(Array.isArray(broad) ? broad : [])
  ];

  const seen = new Set<number>();
  const out: ArasaacSearchCandidate[] = [];

  for (const item of combined) {
    if (!item || typeof item._id !== 'number' || seen.has(item._id)) continue;
    seen.add(item._id);
    const firstKw = item.keywords?.[0]?.keyword || query;
    out.push({
      id: item._id,
      keyword: firstKw,
      imageUrl: getPictogramImageUrl(item._id, 300)
    });
    if (out.length >= limit) break;
  }

  return out;
}

/** Resuelve varias palabras en paralelo (limitando la concurrencia para no saturar la API) */
export async function findPictogramIds(words: string[], concurrency = 6): Promise<Map<string, number | null>> {
  const unique = Array.from(new Set(words.map(w => normalizeWordKey(w)).filter(Boolean)));
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

/**
 * Resuelve una lista de palabras simples en una secuencia de SubPictogramItem[]
 * para explicar un concepto complejo mediante 2 o 3 pictogramas combinados.
 */
export async function resolveCompoundPictograms(keywords: string[]): Promise<SubPictogramItem[]> {
  const cleanList = keywords.map(k => normalizeWordKey(k)).filter(Boolean).slice(0, 4);
  if (cleanList.length === 0) return [];

  const map = await findPictogramIds(cleanList);
  const items: SubPictogramItem[] = [];

  for (const kw of cleanList) {
    const id = map.get(kw) ?? null;
    if (id) {
      items.push({
        keyword: kw,
        pictogramId: id,
        imageUrl: getPictogramImageUrl(id, 300)
      });
    }
  }
  return items.slice(0, 3);
}

/**
 * Busca una imagen explicativa real/ilustrativa para conceptos concretos, históricos o abstractos
 * (como "socialismo", "fotosíntesis", "democracia", etc.) usando Wikipedia en español y Wikimedia Commons.
 */
export async function findExplanatoryImage(rawTerm: string): Promise<ExplanatoryImageResult | null> {
  const term = normalizeWordKey(rawTerm);
  if (!term || term.length < 3) return null;
  if (webImageCache.has(term)) return webImageCache.get(term) ?? null;

  // 1. Intento directo en Wikipedia ES REST Summary API
  const encodedTitle = encodeURIComponent(term.charAt(0).toUpperCase() + term.slice(1));
  const summaryData = await fetchJson(
    `https://es.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`,
    5000
  );

  if (summaryData?.thumbnail?.source) {
    const res: ExplanatoryImageResult = {
      imageUrl: summaryData.thumbnail.source,
      description: summaryData.extract ? String(summaryData.extract).slice(0, 140) : undefined,
      sourceTitle: summaryData.title || term
    };
    webImageCache.set(term, res);
    devLogger.info('WebImage', `Imagen explicativa de Wikipedia encontrada para "${term}"`);
    return res;
  }

  // 2. Búsqueda por generador en Wikipedia ES Action API (con origin=* para CORS)
  const wpSearchUrl = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    term
  )}&gsrlimit=4&prop=pageimages|extracts&exintro=1&explaintext=1&exchars=140&piprop=thumbnail&pithumbsize=400&format=json&origin=*`;
  const wpData = await fetchJson(wpSearchUrl, 5500);
  const wpPages = wpData?.query?.pages ? Object.values(wpData.query.pages) as any[] : [];
  for (const page of wpPages) {
    if (page?.thumbnail?.source) {
      const res: ExplanatoryImageResult = {
        imageUrl: page.thumbnail.source,
        description: page.extract ? String(page.extract).slice(0, 140) : undefined,
        sourceTitle: page.title || term
      };
      webImageCache.set(term, res);
      devLogger.info('WebImage', `Imagen explicativa por búsqueda en Wikipedia para "${term}" (${page.title})`);
      return res;
    }
  }

  // 3. Búsqueda en Wikimedia Commons (ilustraciones, símbolos, diagramas)
  const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    term
  )}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`;
  const commonsData = await fetchJson(commonsUrl, 5500);
  const commonsPages = commonsData?.query?.pages ? Object.values(commonsData.query.pages) as any[] : [];
  for (const page of commonsPages) {
    const info = page?.imageinfo?.[0];
    const candidateUrl: string | undefined = info?.thumburl || info?.url;
    if (
      candidateUrl &&
      /\.(png|jpg|jpeg|svg|webp)$/i.test(candidateUrl) &&
      !candidateUrl.toLowerCase().includes('icon')
    ) {
      const res: ExplanatoryImageResult = {
        imageUrl: candidateUrl,
        sourceTitle: String(page.title || term).replace(/^File:/i, '')
      };
      webImageCache.set(term, res);
      devLogger.info('WebImage', `Imagen explicativa de Wikimedia Commons para "${term}"`);
      return res;
    }
  }

  webImageCache.set(term, null);
  return null;
}
