/**
 * Validador automático de pautas de Lectura Fácil.
 *
 * Basado en una selección de pautas de la Norma UNE 153101:2018 EX
 * ("Lectura fácil. Pautas y recomendaciones para la elaboración de documentos")
 * y en los mismos fenómenos lingüísticos que detecta la herramienta ATECA
 * (UPM – Ontology Engineering Group / CEACOG – Plena inclusión):
 * palabras largas o poco frecuentes, conectores complejos, voz pasiva y superlativos.
 *
 * IMPORTANTE: esta comprobación automática NO sustituye a la fase de VALIDACIÓN
 * con personas con dificultades de comprensión lectora que exige la norma.
 */
import { GuidelineCheck } from '../types';

const MAX_WORDS_WARNING = 15;
const MAX_WORDS_ERROR = 20;
const MAX_SYLLABLES = 4;

const COMPLEX_CONNECTORS = [
  'no obstante', 'sin embargo', 'por consiguiente', 'por ende', 'asimismo', 'en consecuencia',
  'a pesar de', 'aun así', 'con todo', 'en cambio', 'por el contrario', 'dado que', 'puesto que',
  'ya que', 'debido a', 'con el fin de', 'a fin de', 'de modo que', 'de manera que', 'así pues',
  'por lo tanto', 'por tanto', 'mediante', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'siempre y cuando',
  'en virtud de', 'conforme a', 'respecto a', 'en relación con', 'aunque', 'salvo que', 'a menos que'
];

// ser/estar (formas frecuentes) + participio regular → voz pasiva perifrástica
const PASSIVE_REGEX =
  /\b(es|son|fue|fueron|era|eran|será|serán|sería|serían|ha sido|han sido|había sido|habían sido|sea|sean)\s+(\w+(ado|ada|ados|adas|ido|ida|idos|idas))\b/gi;

const SUPERLATIVE_REGEX = /\b\w+(ísimo|ísima|ísimos|ísimas)\b/gi;
const ROMAN_REGEX = /\b(?=[MDCLXVI]{2,}\b)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\b/g;
const PERCENT_REGEX = /(\d+\s*%|por\s+ciento|\d+\s*\/\s*\d+)/gi;
const ABBREVIATION_REGEX = /\b(etc|p\. ?ej|ej|aprox|pág|núm|art|Sr|Sra|Dr|Dra|Ud|Uds|Vd|Avda|c\/)\./gi;
const UPPERCASE_REGEX = /\b[A-ZÁÉÍÓÚÑ]{5,}\b/g;
const SPECIAL_SYMBOLS_REGEX = /[&#@\/\\\[\]{}<>«»…]|\.\.\./g;
const PARENTHESIS_REGEX = /\([^)]*\)/g;

function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter(w => /[a-záéíóúüñ0-9]/i.test(w)).length;
}

/** Estimación de sílabas en español por grupos vocálicos (aproximación suficiente para alertas) */
function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!clean) return 0;
  // Separar hiatos con vocal tónica acentuada (í, ú) o dos vocales fuertes seguidas
  const groups = clean
    .replace(/([aeoáéó])([aeoáéó])/g, '$1-$2')
    .replace(/([aeo])([íú])/g, '$1-$2')
    .replace(/([íú])([aeo])/g, '$1-$2')
    .match(/[aeiouáéíóúü]+/g);
  return groups ? groups.length : 1;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?¡¿])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function uniq(list: string[]): string[] {
  return Array.from(new Set(list.map(s => s.trim()).filter(Boolean)));
}

function preview(list: string[], max = 5): string {
  const u = uniq(list);
  return u.slice(0, max).map(w => `"${w}"`).join(', ') + (u.length > max ? ` (+${u.length - max})` : '');
}

export function validateEasyRead(lines: string[]): GuidelineCheck[] {
  const fullText = lines.join('\n');
  const sentences = lines.flatMap(splitSentences);
  const checks: GuidelineCheck[] = [];

  // 1. Longitud de las frases (UNE 153101 EX: frases cortas, una idea por frase)
  const longSentences = sentences.filter(s => countWords(s) > MAX_WORDS_WARNING);
  const veryLong = sentences.filter(s => countWords(s) > MAX_WORDS_ERROR);
  checks.push({
    id: 'sentence-length',
    rule: `Frases cortas (máx. ${MAX_WORDS_WARNING} palabras recomendado)`,
    severity: veryLong.length > 0 ? 'error' : longSentences.length > 0 ? 'warning' : 'ok',
    detail:
      longSentences.length === 0
        ? `Todas las frases (${sentences.length}) son cortas.`
        : `${longSentences.length} frase(s) demasiado larga(s). Ej.: "${longSentences[0].slice(0, 80)}..."`
  });

  // 2. Una sola idea por frase (exceso de comas / subordinadas)
  const multiIdea = sentences.filter(s => (s.match(/,/g) || []).length >= 2 || (s.match(/\bque\b/gi) || []).length >= 2);
  checks.push({
    id: 'one-idea',
    rule: 'Una sola idea por frase (evitar subordinadas encadenadas)',
    severity: multiIdea.length > 0 ? 'warning' : 'ok',
    detail: multiIdea.length === 0 ? 'Cada frase expresa una idea.' : `${multiIdea.length} frase(s) con varias ideas o subordinadas.`
  });

  // 3. Conectores complejos (criterio ATECA)
  const lower = fullText.toLowerCase();
  const foundConnectors = COMPLEX_CONNECTORS.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(lower));
  checks.push({
    id: 'connectors',
    rule: 'Sin conectores complejos (no obstante, sin embargo, por consiguiente...)',
    severity: foundConnectors.length > 0 ? 'error' : 'ok',
    detail: foundConnectors.length === 0 ? 'No se han detectado conectores complejos.' : `Detectados: ${preview(foundConnectors)}`
  });

  // 4. Voz pasiva (criterio ATECA / UNE: usar voz activa)
  const passives = Array.from(fullText.matchAll(PASSIVE_REGEX)).map(m => m[0]);
  checks.push({
    id: 'passive',
    rule: 'Voz activa (evitar la voz pasiva)',
    severity: passives.length > 0 ? 'error' : 'ok',
    detail: passives.length === 0 ? 'No se ha detectado voz pasiva.' : `Posible voz pasiva: ${preview(passives)}`
  });

  // 5. Superlativos (criterio ATECA)
  const superlatives = fullText.match(SUPERLATIVE_REGEX) || [];
  checks.push({
    id: 'superlatives',
    rule: 'Sin superlativos terminados en -ísimo/-ísima',
    severity: superlatives.length > 0 ? 'warning' : 'ok',
    detail: superlatives.length === 0 ? 'Sin superlativos.' : `Detectados: ${preview(superlatives)}`
  });

  // 6. Palabras largas / difíciles (criterio ATECA)
  const words = fullText.match(/[a-záéíóúüñ]+/gi) || [];
  const longWords = words.filter(w => countSyllables(w) > MAX_SYLLABLES);
  checks.push({
    id: 'long-words',
    rule: `Palabras cortas y frecuentes (máx. ${MAX_SYLLABLES} sílabas)`,
    severity: longWords.length > 3 ? 'warning' : 'ok',
    detail: longWords.length === 0 ? 'Sin palabras excesivamente largas.' : `Palabras largas: ${preview(longWords)}`
  });

  // 7. Números romanos, porcentajes y fracciones (UNE: usar cifras sencillas)
  const romans = (fullText.match(ROMAN_REGEX) || []).filter(Boolean);
  const percents = fullText.match(PERCENT_REGEX) || [];
  checks.push({
    id: 'numbers',
    rule: 'Números en cifras sencillas (sin romanos, porcentajes ni fracciones)',
    severity: romans.length + percents.length > 0 ? 'warning' : 'ok',
    detail: romans.length + percents.length === 0 ? 'Números correctos.' : `Revisar: ${preview([...romans, ...percents])}`
  });

  // 8. Abreviaturas, siglas en mayúsculas y símbolos
  const abbreviations = fullText.match(ABBREVIATION_REGEX) || [];
  const uppercase = fullText.match(UPPERCASE_REGEX) || [];
  const symbols = fullText.match(SPECIAL_SYMBOLS_REGEX) || [];
  const parentheses = fullText.match(PARENTHESIS_REGEX) || [];
  const formatIssues = [...abbreviations, ...uppercase, ...symbols, ...parentheses];
  checks.push({
    id: 'format',
    rule: 'Sin abreviaturas, MAYÚSCULAS sostenidas, paréntesis, símbolos ni puntos suspensivos',
    severity: formatIssues.length > 0 ? 'warning' : 'ok',
    detail: formatIssues.length === 0 ? 'Formato correcto.' : `Revisar: ${preview(formatIssues)}`
  });

  return checks;
}

export function summarizeChecks(checks: GuidelineCheck[]): { passed: number; total: number; score: number } {
  const total = checks.length;
  const passed = checks.filter(c => c.severity === 'ok').length;
  const warnings = checks.filter(c => c.severity === 'warning').length;
  const score = total === 0 ? 100 : Math.round(((passed + warnings * 0.5) / total) * 100);
  return { passed, total, score };
}
