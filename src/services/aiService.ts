import { EasyReadStep, AacOption, PictogramResult, PictogramPhrase, PictogramToken } from '../types';
import { devLogger } from './loggerService';
import {
  findPictogramIds,
  getPictogramImageUrl,
  getCustomPictogram,
  CONCEPT_FALLBACK_DICTIONARY,
  normalizeWordKey,
  getMorphologicalVariants,
  resolveCompoundPictograms,
  findExplanatoryImage
} from './arasaacService';

/**
 * Pautas de redacción de la Norma UNE 153101:2018 EX (Lectura fácil) y de los
 * fenómenos que detecta la herramienta ATECA (UPM/CEACOG). Se inyectan en el
 * systemInstruction de los modos cognitivos (texto y pictogramas).
 */
export const UNE_153101_GUIDELINES = `Cumple OBLIGATORIAMENTE las pautas de la Norma UNE 153101:2018 EX de Lectura Fácil y los criterios de la herramienta ATECA:
ORTOTIPOGRAFÍA Y VOCABULARIO
- Usa palabras cortas, sencillas y de uso frecuente. Evita palabras de más de 4 sílabas siempre que exista una alternativa.
- Evita tecnicismos, extranjerismos y palabras abstractas. Si una palabra difícil es imprescindible, explícala en la frase siguiente.
- Usa siempre la misma palabra para referirte a la misma cosa (no uses sinónimos).
- No uses abreviaturas, siglas sin explicar, MAYÚSCULAS sostenidas, paréntesis, corchetes, puntos suspensivos ni símbolos como &, %, /, #.
- No uses superlativos terminados en -ísimo o -ísima (di "muy grande", no "grandísimo").
- No uses metáforas, ironías, refranes, frases hechas ni sentido figurado.
NÚMEROS Y FECHAS
- Escribe los números con cifras (3, no "tres"). No uses números romanos, porcentajes ni fracciones: di "la mitad", "3 de cada 10".
- Escribe las fechas completas: "lunes 3 de marzo de 2025". Las horas así: "a las 5 de la tarde".
GRAMÁTICA
- Usa la voz activa. NUNCA uses la voz pasiva ("el médico revisa la receta", no "la receta es revisada").
- Usa el presente de indicativo y el imperativo. Evita el subjuntivo, el condicional y los tiempos compuestos.
- Usa el orden sujeto + verbo + complementos.
- Usa frases afirmativas. Evita las negaciones y nunca uses dobles negaciones.
- No uses conectores complejos (no obstante, sin embargo, por consiguiente, asimismo, mediante, cuyo, aunque, ya que). Usa conectores simples: y, pero, porque, entonces, después.
- Dirígete al lector directamente (tú o usted) de forma coherente.
ORACIONES Y ESTRUCTURA
- Frases cortas: máximo 15 palabras. Una sola idea por frase.
- No encadenes oraciones subordinadas.
- Ordena la información de forma lógica y cronológica, de lo más importante a lo menos importante.`;

/** Pautas adicionales para comunicación con pictogramas (estilo ARASAAC / SAAC) */
const PICTOGRAM_GUIDELINES = `Además, el resultado se mostrará con pictogramas ARASAAC (sistema de Comunicación Aumentativa y Alternativa):
- Cada frase tiene MÁXIMO 6 palabras con contenido y sigue el orden: QUIÉN + ACCIÓN + QUÉ/DÓNDE/CUÁNDO.
- Para cada frase, indica en "keywords" las palabras con significado que deben llevar pictograma (sustantivos, verbos, adjetivos, adverbios de tiempo y lugar). Omite artículos y preposiciones.
- En "word" escribe la palabra tal y como aparece en la frase.
- En "keyword" escribe el LEMA más simple y concreto en español para buscarlo en ARASAAC: verbos en INFINITIVO ("lavar", no "lava"), sustantivos en SINGULAR ("camisa", no "camisas"), adjetivos en masculino singular.
- En "synonyms" incluye una lista de 2 o 3 sinónimos muy sencillos y visuales en español (en singular o infinitivo) por si la palabra principal no tiene pictograma directo en ARASAAC (ej. para "dialogar": ["hablar", "conversar"]).
- En "fallbackKeywords" incluye SIEMPRE de 2 a 3 palabras básicas y muy concretas que juntas expliquen la palabra con varios pictogramas si no existe un único pictograma (ej. para "socialismo": ["compartir", "igualdad", "trabajador"]; para "democracia": ["votar", "pueblo", "ley"]; para "desayunar": ["comer", "mañana"]).
- En "needsWebImage" pon true si es un concepto concreto histórico, político, científico, geográfico o cultural complejo (como "socialismo", "fotosíntesis", "feudalismo", "revolución") que conviene acompañar de una imagen explicativa y de varios pictogramas; pon false para palabras cotidianas.
- En "conceptExplanation" escribe una explicación muy breve (máximo 8 palabras) solo cuando la palabra sea abstracta o compleja.`;

// Lista de modelos por orden de velocidad y disponibilidad comprobada
export const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash'
];

export class AiService {
  private currentApiKey: string = '';
  private currentProfileDirective: string = '';

  constructor(apiKey?: string) {
    this.updateApiKey(apiKey || (import.meta.env.DEV ? import.meta.env.VITE_GEMINI_API_KEY || '' : ''));
  }

  public updateProfileDirective(directive: string, profileTitle?: string) {
    this.currentProfileDirective = directive.trim();
    if (profileTitle) {
      devLogger.info('AiService', `Directriz de IA ajustada al perfil: ${profileTitle}`);
    }
  }

  public updateApiKey(key: string) {
    this.currentApiKey = key.trim();
    if (this.currentApiKey) {
      devLogger.info('AiService', `Clave API configurada (${this.currentApiKey.slice(0, 6)}...${this.currentApiKey.slice(-4)})`);
    } else {
      devLogger.warn('AiService', 'Sin clave API configurada');
    }
  }

  public hasApiKey(): boolean {
    return Boolean(this.currentApiKey && this.currentApiKey.length > 5);
  }

  public async testConnection(): Promise<string> {
    devLogger.api('PingTest', 'Probando conexión con servidores de Google Gemini...');
    const res = await this.callGeminiWithFallback({
      systemInstruction: 'Responde brevemente.',
      parts: [{ text: 'Responde solo: CONEXION_OK' }],
      jsonMode: false
    });
    return res;
  }

  /**
   * Llamada multimodal rápida con fallback automático de modelos y control de timeout
   * Evita bloqueos si un modelo experimenta alta demanda (HTTP 503) o no está disponible (HTTP 404)
   */
  private async callGeminiWithFallback(params: {
    systemInstruction: string;
    parts: any[];
    jsonMode?: boolean;
  }): Promise<string> {
    if (!this.hasApiKey()) {
      const msg = 'Clave API de Gemini no configurada. Por favor introduce tu VITE_GEMINI_API_KEY en Ajustes (botón arriba a la derecha o tecla S).';
      devLogger.error('AiService', msg);
      throw new Error(msg);
    }

    let lastError: any = null;
    const hasImage = params.parts.some(p => p.inlineData);
    devLogger.api('GeminiAPI', `Iniciando petición multimodal (Imagen: ${hasImage ? 'SÍ' : 'NO'}, JSON: ${Boolean(params.jsonMode)})`);

    for (const modelName of GEMINI_MODELS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000); // Máximo 14s por intento
      const startTime = performance.now();

      try {
        devLogger.api('GeminiAPI', `Enviando solicitud al modelo: ${modelName}...`);

        // Los modelos Gemini 3.6 Flash y 3.5 Flash-Lite ya no admiten parámetros de muestreo
        // como "temperature" (guía oficial de Google), así que no se envían.
        // El límite de salida es amplio porque estos modelos también "piensan" antes de responder.
        const generationConfig: Record<string, any> = {
          maxOutputTokens: 4096,
        };

        if (params.jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        // La clave va en una cabecera y no en la dirección, para que no quede en historiales ni registros.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.currentApiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: params.systemInstruction }]
            },
            contents: [
              {
                role: 'user',
                parts: params.parts
              }
            ],
            generationConfig
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const elapsed = Math.round(performance.now() - startTime);
        const data = await response.json();

        if (!response.ok) {
          const errCode = data?.error?.code || response.status;
          const errMsg = data?.error?.message || `HTTP ${response.status}`;
          devLogger.warn('GeminiAPI', `Modelo ${modelName} falló en ${elapsed}ms [${errCode}]: ${errMsg}. Saltando al siguiente modelo...`, data?.error);
          lastError = new Error(errMsg);
          if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid')) {
            throw lastError;
          }
          continue;
        }

        const text = data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text || '')
          .join('')
          .trim();

        if (text) {
          devLogger.success('GeminiAPI', `Respuesta recibida de ${modelName} en ${elapsed}ms`, text.slice(0, 300));
          return text;
        } else {
          devLogger.warn('GeminiAPI', `Modelo ${modelName} devolvió respuesta vacía en ${elapsed}ms`, data);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        const elapsed = Math.round(performance.now() - startTime);
        lastError = err;
        if (err?.message?.includes('API key not valid') || err?.message?.includes('API_KEY_INVALID')) {
          devLogger.error('GeminiAPI', `Clave API rechazada por Google (${elapsed}ms)`, err?.message);
          throw new Error('La Clave API de Gemini introducida no es válida. Verifícala en Ajustes.');
        }
        devLogger.warn('GeminiAPI', `Excepción/Timeout en ${modelName} tras ${elapsed}ms: ${err?.message || err}`);
      }
    }

    const finalMsg = this.formatErrorMessage(lastError || 'No se pudo conectar con los servidores de Gemini.');
    devLogger.error('GeminiAPI', `Todos los modelos fallaron: ${finalMsg}`);
    throw new Error(finalMsg);
  }

  /**
   * 1. MODO VISUAL: Ojos Digitales
   * Analiza imagen del entorno con posiciones de agujas del reloj y distancias
   */
  async describeVisualScene(base64Image: string, userQuestion?: string): Promise<string> {
    const systemInstruction =
      "Eres un asistente visual para una persona ciega. Sé directo, conciso y describe las posiciones usando las agujas del reloj y distancias aproximadas. Prioriza peligros u obstáculos, textos visibles y objetos cercanos. No uses introducciones como 'En esta imagen veo...'.";

    const promptText = userQuestion && userQuestion.trim().length > 0
      ? `Pregunta del usuario ciego: "${userQuestion.trim()}". Responde atendiendo a la imagen y a su pregunta de forma directa.`
      : "Describe el entorno inmediato, advierte de obstáculos y objetos clave usando las posiciones del reloj.";

    const parts = [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      },
      {
        text: promptText
      }
    ];

    return await this.callGeminiWithFallback({
      systemInstruction,
      parts,
      jsonMode: false
    });
  }

  /**
   * Instrucción extra cuando el alumno pulsa «Más fácil» u «Otra versión».
   */
  private buildRefinementBlock(
    refinement?: 'simpler' | 'alternative',
    previousVersion?: string
  ): string {
    const previous = previousVersion
      ? `VERSIÓN ANTERIOR (no la repitas):\n${previousVersion}\n`
      : '';
    if (refinement === 'simpler') {
      return `\nIMPORTANTE: el alumno ha pulsado «Más fácil» porque NO ha entendido la versión anterior. Haz una versión MÁS SENCILLA que la anterior: frases todavía más cortas (8 palabras como máximo), una sola idea por frase, solo palabras muy frecuentes y un ejemplo de la vida diaria cuando haya una idea abstracta.\n${previous}`;
    }
    if (refinement === 'alternative') {
      return `\nIMPORTANTE: el alumno ha pulsado «Necesito otra versión». Explica lo mismo con OTRAS palabras y OTROS ejemplos, con el mismo nivel de dificultad. No repitas las frases de la versión anterior.\n${previous}`;
    }
    return '';
  }

  /**
   * 2. MODO COGNITIVO: Lectura Fácil y Rutinas
   * Transforma textos o documentos complejos en pasos numerados con emoji y lenguaje literal
   */
  async simplifyToEasyRead(params: {
    text?: string;
    base64Image?: string;
    /** 'simpler': el alumno pidió una versión más fácil; 'alternative': pidió otra versión. */
    refinement?: 'simpler' | 'alternative';
    /** Versión anterior que el alumno no entendió, para no repetirla. */
    previousVersion?: string;
  }): Promise<{ summary: string; steps: EasyReadStep[] }> {
    const profileBlock = this.currentProfileDirective
      ? `\nADAPTACIÓN ESPECÍFICA AL PERFIL DEL USUARIO:\n${this.currentProfileDirective}\n`
      : '';

    const refinementBlock = this.buildRefinementBlock(params.refinement, params.previousVersion);

    const systemInstruction =
      `Adapta cualquier texto o instrucción a formato de Lectura Fácil. Usa frases cortas, una sola idea por línea, lenguaje 100% literal (sin metáforas ni ironías) y divide las tareas en pasos numerados muy sencillos con un emoji representativo al inicio de cada paso.
${profileBlock}${refinementBlock}
${UNE_153101_GUIDELINES}

Responde estrictamente con un objeto JSON válido con esta estructura:
{
  "summary": "Resumen en una frase muy sencilla y clara",
  "steps": [
    {
      "stepNumber": 1,
      "emoji": "📄",
      "instruction": "Texto del paso 1"
    }
  ]
}`;

    const parts: any[] = [];

    if (params.base64Image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: params.base64Image
        }
      });
      parts.push({
        text: 'Analiza el documento o imagen adjunta y conviértelo a formato de Lectura Fácil con pasos secuenciales numerados.'
      });
    }

    if (params.text) {
      parts.push({
        text: `Convierte la siguiente información o tarea a formato de Lectura Fácil: "${params.text}"`
      });
    }

    if (parts.length === 0) {
      throw new Error('Debes proporcionar un texto o una foto para simplificar.');
    }

    const rawText = await this.callGeminiWithFallback({
      systemInstruction,
      parts,
      jsonMode: true
    });

    let parsed: any = null;
    try {
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsed = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1));
      } else {
        parsed = JSON.parse(cleanJson);
      }
    } catch {
      parsed = this.extractStepsFromText(rawText);
    }

    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    const steps: EasyReadStep[] = rawSteps.map((s: any, idx: number) => ({
      id: `step-${idx + 1}-${Date.now()}`,
      stepNumber: Number(s.stepNumber) || idx + 1,
      emoji: s.emoji || '➡️',
      instruction: s.instruction || s.text || String(s),
      completed: false
    }));

    return {
      summary: parsed?.summary || 'Instrucciones simplificadas en pasos fáciles:',
      steps: steps.length > 0 ? steps : [
        {
          id: 'step-1',
          stepNumber: 1,
          emoji: '✅',
          instruction: rawText.slice(0, 200) || 'Revisar la información completada.',
          completed: false
        }
      ]
    };
  }

  /**
   * 2b. MODO COGNITIVO – PICTOGRAMAS (ARASAAC + Sinónimos + Varios Pictogramas + Imagen Explicativa)
   * Convierte el texto/documento en frases muy cortas y las representa con pictogramas ARASAAC.
   * Si una palabra no tiene pictograma directo:
   * 1) Comprueba si el profesor/usuario ha definido un pictograma o imagen personalizada.
   * 2) Busca posibles sinónimos sencillos que sí tengan pictograma en ARASAAC.
   * 3) Si sigue sin encontrarse o es un concepto complejo (ej. "socialismo"), lo explica con
   *    2-3 pictogramas combinados y busca una imagen explicativa en Wikipedia/Wikimedia Commons.
   */
  async generatePictograms(params: {
    text?: string;
    base64Image?: string;
    refinement?: 'simpler' | 'alternative';
    previousVersion?: string;
  }): Promise<PictogramResult> {
    const profileBlock = this.currentProfileDirective
      ? `\nADAPTACIÓN ESPECÍFICA AL PERFIL DEL USUARIO:\n${this.currentProfileDirective}\n`
      : '';
    const refinementBlock = this.buildRefinementBlock(params.refinement, params.previousVersion);

    const systemInstruction =
      `Eres un especialista en accesibilidad cognitiva y Comunicación Aumentativa y Alternativa (CAA). Adapta el texto o documento a frases de Lectura Fácil que se representarán con pictogramas.
${profileBlock}${refinementBlock}
${UNE_153101_GUIDELINES}

${PICTOGRAM_GUIDELINES}

Responde estrictamente con un objeto JSON válido con esta estructura:
{
  "title": "Título muy corto del contenido",
  "phrases": [
    {
      "stepNumber": 1,
      "text": "Yo separo la ropa blanca.",
      "keywords": [
        {
          "word": "Yo",
          "keyword": "yo",
          "synonyms": ["persona", "individuo"],
          "fallbackKeywords": ["persona", "señalar"],
          "needsWebImage": false
        },
        {
          "word": "separo",
          "keyword": "separar",
          "synonyms": ["dividir", "apartar", "clasificar"],
          "fallbackKeywords": ["dividir", "dos"],
          "needsWebImage": false
        },
        {
          "word": "socialismo",
          "keyword": "socialismo",
          "synonyms": ["igualdad", "compartir", "comunidad"],
          "fallbackKeywords": ["compartir", "igualdad", "trabajador"],
          "needsWebImage": true,
          "conceptExplanation": "Sistema que busca compartir y dar igualdad a los trabajadores"
        }
      ]
    }
  ]
}`;

    const parts: any[] = [];
    if (params.base64Image) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: params.base64Image } });
      parts.push({ text: 'Lee el documento o imagen adjunta y conviértelo en una secuencia de frases con pictogramas.' });
    }
    if (params.text) {
      parts.push({ text: `Convierte esta información o tarea en frases con pictogramas: "${params.text}"` });
    }
    if (parts.length === 0) {
      throw new Error('Debes proporcionar un texto o una foto para crear los pictogramas.');
    }

    const rawText = await this.callGeminiWithFallback({
      systemInstruction,
      parts,
      jsonMode: true
    });

    let parsed: any = null;
    try {
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      parsed = JSON.parse(firstBrace !== -1 && lastBrace !== -1 ? cleanJson.substring(firstBrace, lastBrace + 1) : cleanJson);
    } catch (err) {
      devLogger.error('Pictogramas', 'La IA no devolvió un JSON válido', rawText.slice(0, 300));
      throw new Error('No se pudo interpretar la respuesta de la IA para crear los pictogramas. Inténtalo de nuevo.');
    }

    const rawPhrases: any[] = Array.isArray(parsed?.phrases) ? parsed.phrases : [];
    if (rawPhrases.length === 0) {
      throw new Error('La IA no generó ninguna frase para pictografiar.');
    }

    interface NormalizedKeywordSpec {
      word: string;
      keyword: string;
      synonyms: string[];
      fallbackKeywords: string[];
      needsWebImage: boolean;
      conceptExplanation?: string;
    }

    // Normalizar palabras clave y enriquecer con el diccionario local de conceptos si aplica
    const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'y', 'o', 'que', 'se', 'lo']);
    const normalized = rawPhrases.map((p: any, idx: number) => {
      const text: string = String(p.text || p.instruction || '').trim();
      let keywords: NormalizedKeywordSpec[] = Array.isArray(p.keywords)
        ? p.keywords
            .map((k: any) => {
              const rawW = typeof k === 'string' ? k : String(k.word || k.keyword || '');
              const rawKw = typeof k === 'string' ? k : String(k.keyword || k.word || '');
              const dictEntry =
                CONCEPT_FALLBACK_DICTIONARY[normalizeWordKey(rawW)] ||
                CONCEPT_FALLBACK_DICTIONARY[normalizeWordKey(rawKw)];

              const aiSyns = Array.isArray(k?.synonyms)
                ? k.synonyms.map((s: any) => normalizeWordKey(String(s))).filter(Boolean)
                : [];
              const dictSyns = dictEntry?.synonyms || [];
              const morphSyns = [
                ...getMorphologicalVariants(rawKw),
                ...getMorphologicalVariants(rawW)
              ];
              const synonyms = Array.from(new Set([...aiSyns, ...dictSyns, ...morphSyns]));

              const aiFallbacks = Array.isArray(k?.fallbackKeywords)
                ? k.fallbackKeywords.map((f: any) => normalizeWordKey(String(f))).filter(Boolean)
                : [];
              const dictFallbacks = dictEntry?.compoundKeywords || [];
              const fallbackKeywords = Array.from(new Set([...dictFallbacks, ...aiFallbacks])).slice(0, 3);

              const needsWebImage = Boolean(k?.needsWebImage || dictEntry?.preferWebImage);
              const conceptExplanation =
                (typeof k?.conceptExplanation === 'string' && k.conceptExplanation.trim()) ||
                dictEntry?.explanation ||
                undefined;

              return {
                word: rawW,
                keyword: rawKw,
                synonyms,
                fallbackKeywords,
                needsWebImage,
                conceptExplanation
              };
            })
            .filter((k: NormalizedKeywordSpec) => k.keyword.trim())
        : [];

      if (keywords.length === 0) {
        keywords = text
          .replace(/[.,;:!?¡¿]/g, '')
          .split(/\s+/)
          .filter(w => w && !STOPWORDS.has(w.toLowerCase()))
          .map(w => {
            const dictEntry = CONCEPT_FALLBACK_DICTIONARY[normalizeWordKey(w)];
            return {
              word: w,
              keyword: w.toLowerCase(),
              synonyms: [
                ...(dictEntry?.synonyms || []),
                ...getMorphologicalVariants(w)
              ],
              fallbackKeywords: dictEntry?.compoundKeywords || [],
              needsWebImage: Boolean(dictEntry?.preferWebImage),
              conceptExplanation: dictEntry?.explanation
            };
          });
      }
      return { stepNumber: Number(p.stepNumber) || idx + 1, text, keywords };
    });

    // 1. Resolver palabras principales y literales en ARASAAC
    const primaryWords = normalized.flatMap(p =>
      p.keywords.flatMap(k => [normalizeWordKey(k.keyword), normalizeWordKey(k.word)])
    );
    devLogger.api('ARASAAC', `Buscando ${new Set(primaryWords).size} términos principales en api.arasaac.org...`);
    const primaryMap = await findPictogramIds(primaryWords);

    // 2. Identificar qué tokens NO tienen pictograma directo o requieren descomposición/imagen web
    const missingSynonymsToSearch: string[] = [];
    const compoundWordsToSearch: string[] = [];

    for (const phrase of normalized) {
      for (const k of phrase.keywords) {
        const kwNorm = normalizeWordKey(k.keyword);
        const wNorm = normalizeWordKey(k.word);
        const hasCustom = Boolean(getCustomPictogram(wNorm) || getCustomPictogram(kwNorm));
        if (hasCustom) continue;

        const directId = primaryMap.get(kwNorm) ?? primaryMap.get(wNorm) ?? null;
        if (!directId || k.needsWebImage) {
          missingSynonymsToSearch.push(...k.synonyms);
          compoundWordsToSearch.push(...k.fallbackKeywords);
        }
      }
    }

    // Buscar en lote todos los sinónimos y palabras de explicación multipictograma
    const extraSearchList = Array.from(new Set([...missingSynonymsToSearch, ...compoundWordsToSearch]));
    const extraMap =
      extraSearchList.length > 0
        ? await findPictogramIds(extraSearchList)
        : new Map<string, number | null>();

    // Función auxiliar para obtener ID desde cualquiera de los mapas
    const getPictoId = (term: string): number | null => {
      const t = normalizeWordKey(term);
      return primaryMap.get(t) ?? extraMap.get(t) ?? null;
    };

    // 3. Construir cada token aplicando la cascada:
    //    Personalizado (Docente/Usuario) -> Directo ARASAAC -> Sinónimo ARASAAC -> Multipictograma + Imagen Explicativa Web
    const phrases: PictogramPhrase[] = [];

    for (let idx = 0; idx < normalized.length; idx++) {
      const p = normalized[idx];
      const resolvedTokens: PictogramToken[] = [];

      for (const k of p.keywords) {
        const kwNorm = normalizeWordKey(k.keyword);
        const wNorm = normalizeWordKey(k.word);

        // A) ¿Tiene pictograma/imagen personalizada guardada por el profesor o usuario?
        const customEntry = getCustomPictogram(wNorm) || getCustomPictogram(kwNorm);
        if (customEntry) {
          resolvedTokens.push({
            word: k.word,
            keyword: k.keyword,
            synonyms: k.synonyms,
            fallbackKeywords: k.fallbackKeywords,
            pictogramId: customEntry.pictogramId ?? null,
            imageUrl: customEntry.imageUrl ?? null,
            imageSource: 'custom',
            resolvedKeyword: customEntry.resolvedKeyword,
            compoundPictograms: customEntry.compoundPictograms,
            conceptExplanation: customEntry.conceptExplanation || k.conceptExplanation
          });
          continue;
        }

        // Preparar combinación de varios pictogramas (fallbackKeywords) por si hace falta explicar el concepto
        const compoundPictograms = k.fallbackKeywords
          .map(fk => {
            const fId = getPictoId(fk);
            return fId
              ? {
                  keyword: fk,
                  pictogramId: fId,
                  imageUrl: getPictogramImageUrl(fId, 300)
                }
              : null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .slice(0, 3);

        // B) ¿Tiene pictograma directo en ARASAAC y NO está marcado como concepto abstracto/histórico que prefiera imagen web?
        const directId = getPictoId(kwNorm) ?? getPictoId(wNorm);
        if (directId && !k.needsWebImage) {
          resolvedTokens.push({
            word: k.word,
            keyword: k.keyword,
            synonyms: k.synonyms,
            fallbackKeywords: k.fallbackKeywords,
            pictogramId: directId,
            imageUrl: getPictogramImageUrl(directId, 300),
            imageSource: 'arasaac',
            compoundPictograms: compoundPictograms.length >= 2 ? compoundPictograms : undefined,
            conceptExplanation: k.conceptExplanation
          });
          continue;
        }

        // Si es un concepto concreto/histórico/abstracto como "socialismo" (needsWebImage = true) y además tiene pictograma directo
        if (directId && k.needsWebImage) {
          const webImg = (await findExplanatoryImage(k.word)) || (await findExplanatoryImage(k.keyword));
          resolvedTokens.push({
            word: k.word,
            keyword: k.keyword,
            synonyms: k.synonyms,
            fallbackKeywords: k.fallbackKeywords,
            pictogramId: directId,
            imageUrl: webImg ? webImg.imageUrl : getPictogramImageUrl(directId, 300),
            imageSource: webImg ? 'wikimedia' : 'arasaac',
            compoundPictograms: compoundPictograms.length > 0 ? compoundPictograms : undefined,
            conceptExplanation: k.conceptExplanation || webImg?.description
          });
          continue;
        }

        // C) No hay pictograma directo: si es un concepto concreto/abstracto (ej. "socialismo") buscamos imagen explicativa + varios pictogramas
        if (k.needsWebImage) {
          const webImg = (await findExplanatoryImage(k.word)) || (await findExplanatoryImage(k.keyword));
          if (webImg) {
            resolvedTokens.push({
              word: k.word,
              keyword: k.keyword,
              synonyms: k.synonyms,
              fallbackKeywords: k.fallbackKeywords,
              pictogramId: null,
              imageUrl: webImg.imageUrl,
              imageSource: 'wikimedia',
              compoundPictograms: compoundPictograms.length > 0 ? compoundPictograms : undefined,
              conceptExplanation: k.conceptExplanation || webImg.description
            });
            continue;
          }
        }

        // D) Buscar entre los posibles SINÓNIMOS que sí tengan pictograma en ARASAAC
        let matchedSynonym: string | undefined;
        let synonymPictoId: number | null = null;
        for (const syn of k.synonyms) {
          const sId = getPictoId(syn);
          if (sId) {
            matchedSynonym = syn;
            synonymPictoId = sId;
            break;
          }
        }

        if (synonymPictoId && matchedSynonym) {
          devLogger.info('ARASAAC', `Palabra "${k.word}" resuelta mediante sinónimo "${matchedSynonym}" → #${synonymPictoId}`);
          resolvedTokens.push({
            word: k.word,
            keyword: k.keyword,
            synonyms: k.synonyms,
            fallbackKeywords: k.fallbackKeywords,
            pictogramId: synonymPictoId,
            imageUrl: getPictogramImageUrl(synonymPictoId, 300),
            imageSource: 'arasaac-synonym',
            resolvedKeyword: matchedSynonym,
            compoundPictograms: compoundPictograms.length >= 2 ? compoundPictograms : undefined,
            conceptExplanation: k.conceptExplanation
          });
          continue;
        }

        // E) Si tampoco hay sinónimo directo, usar la combinación de varios pictogramas (compoundPictograms)
        //    y buscar imagen explicativa en Wikipedia/Wikimedia
        const webImgFallback = (await findExplanatoryImage(k.word)) || (await findExplanatoryImage(k.keyword));

        if (webImgFallback) {
          resolvedTokens.push({
            word: k.word,
            keyword: k.keyword,
            synonyms: k.synonyms,
            fallbackKeywords: k.fallbackKeywords,
            pictogramId: null,
            imageUrl: webImgFallback.imageUrl,
            imageSource: 'wikimedia',
            compoundPictograms: compoundPictograms.length > 0 ? compoundPictograms : undefined,
            conceptExplanation: k.conceptExplanation || webImgFallback.description
          });
          continue;
        }

        if (compoundPictograms.length > 0) {
          devLogger.info(
            'ARASAAC',
            `Palabra "${k.word}" explicada con ${compoundPictograms.length} pictogramas: ${compoundPictograms.map(c => c.keyword).join(' + ')}`
          );
          resolvedTokens.push({
            word: k.word,
            keyword: k.keyword,
            synonyms: k.synonyms,
            fallbackKeywords: k.fallbackKeywords,
            pictogramId: compoundPictograms[0].pictogramId,
            imageUrl: compoundPictograms.length === 1 ? compoundPictograms[0].imageUrl : null,
            imageSource: 'arasaac-compound',
            compoundPictograms,
            conceptExplanation: k.conceptExplanation
          });
          continue;
        }

        // F) Último recurso: pedir descomposición rápida a la IA para encontrar sinónimos o varios pictogramas,
        //    y si aun así no se encuentra, dejar listo para que el profesor/usuario lo añada.
        const decomp = await this.decomposeWordToSimplePictograms(k.word);
        const decompCompound = await resolveCompoundPictograms([
          ...decomp.synonyms,
          ...decomp.compoundKeywords
        ]);

        if (decompCompound.length > 0) {
          resolvedTokens.push({
            word: k.word,
            keyword: k.keyword,
            synonyms: [...k.synonyms, ...decomp.synonyms],
            fallbackKeywords: [...k.fallbackKeywords, ...decomp.compoundKeywords],
            pictogramId: decompCompound[0].pictogramId,
            imageUrl: decompCompound.length === 1 ? decompCompound[0].imageUrl : null,
            imageSource: decompCompound.length === 1 ? 'arasaac-synonym' : 'arasaac-compound',
            resolvedKeyword: decompCompound.length === 1 ? decompCompound[0].keyword : undefined,
            compoundPictograms: decompCompound.length > 1 ? decompCompound : undefined,
            conceptExplanation: k.conceptExplanation || decomp.explanation || undefined
          });
          continue;
        }

        resolvedTokens.push({
          word: k.word,
          keyword: k.keyword,
          synonyms: k.synonyms,
          fallbackKeywords: k.fallbackKeywords,
          pictogramId: null,
          imageUrl: null,
          imageSource: 'none',
          conceptExplanation: k.conceptExplanation || decomp.explanation || undefined
        });
      }

      phrases.push({
        id: `picto-${idx + 1}-${Date.now()}`,
        stepNumber: p.stepNumber,
        text: p.text,
        completed: false,
        tokens: resolvedTokens
      });
    }

    const allTokens = phrases.flatMap(p => p.tokens);
    const resolvedCount = allTokens.filter(
      t => t.imageUrl || (t.compoundPictograms && t.compoundPictograms.length > 0)
    ).length;
    devLogger.success('ARASAAC', `Pictogramas/Imágenes resueltos: ${resolvedCount}/${allTokens.length}`);

    return {
      title: String(parsed?.title || 'Información con pictogramas'),
      phrases
    };
  }

  /**
   * Descompone una palabra difícil o sin pictograma en sinónimos y 2-3 palabras básicas
   * para explicarla con varios pictogramas (útil desde el editor del profesor/usuario).
   */
  async decomposeWordToSimplePictograms(word: string): Promise<{
    synonyms: string[];
    compoundKeywords: string[];
    explanation: string;
  }> {
    const dict = CONCEPT_FALLBACK_DICTIONARY[normalizeWordKey(word)];
    if (dict) {
      return {
        synonyms: dict.synonyms,
        compoundKeywords: dict.compoundKeywords,
        explanation: dict.explanation
      };
    }

    if (!this.hasApiKey()) {
      return {
        synonyms: getMorphologicalVariants(word),
        compoundKeywords: [],
        explanation: ''
      };
    }

    const systemInstruction = `Eres un experto en pictogramas ARASAAC y Lectura Fácil.
Dada una palabra en español que no tiene un pictograma único obvio, devuelve:
1) "synonyms": 3 sinónimos de una sola palabra en singular o infinitivo muy simples y visuales que existan en ARASAAC.
2) "compoundKeywords": 2 o 3 palabras concretas y básicas que juntas expliquen la palabra usando varios pictogramas (ej. para "socialismo": ["compartir", "igualdad", "trabajador"]).
3) "explanation": definición en Lectura Fácil de máximo 10 palabras.
Responde solo con JSON válido: {"synonyms":["..."],"compoundKeywords":["..."],"explanation":"..."}`;

    try {
      const raw = await this.callGeminiWithFallback({
        systemInstruction,
        parts: [{ text: `Palabra a explicar con pictogramas: "${word}"` }],
        jsonMode: true
      });
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        synonyms: Array.isArray(parsed?.synonyms) ? parsed.synonyms.map(String) : [],
        compoundKeywords: Array.isArray(parsed?.compoundKeywords) ? parsed.compoundKeywords.map(String) : [],
        explanation: String(parsed?.explanation || '')
      };
    } catch {
      return {
        synonyms: getMorphologicalVariants(word),
        compoundKeywords: [],
        explanation: ''
      };
    }
  }

  /**
   * 3. MODO AUDITIVO / HABLA: Comunicador Rápido (CAA)
   * Genera exactamente 3 opciones de respuesta rápida para responder con un toque
   */
  async generateAacResponses(heardConversation: string): Promise<AacOption[]> {
    const profileBlock = this.currentProfileDirective
      ? `\nTen en cuenta este perfil del usuario al redactar las 3 respuestas:\n${this.currentProfileDirective}\n`
      : '';

    const systemInstruction =
      `Eres un asistente de Comunicación Aumentativa y Alternativa (CAA) para una persona que no puede hablar o necesita responder rápidamente a lo que otra persona le acaba de decir. Analiza la conversación o frase escuchada y genera exactamente 3 opciones de respuesta breves, naturales y directas en primera persona (ej: 'Sí, por favor', 'No necesito eso', '¿Puedes repetir más despacio?').${profileBlock}
Devuelve estrictamente un arreglo JSON con exactamente 3 opciones:
[
  {
    "id": "1",
    "emoji": "👍",
    "label": "Sí, de acuerdo",
    "speakText": "Sí, estoy de acuerdo con eso."
  },
  {
    "id": "2",
    "emoji": "✋",
    "label": "Ahora no, gracias",
    "speakText": "Ahora mismo no puedo, gracias."
  },
  {
    "id": "3",
    "emoji": "❓",
    "label": "No entendí bien",
    "speakText": "¿Podrías repetirlo más despacio, por favor?"
  }
]`;

    const rawText = await this.callGeminiWithFallback({
      systemInstruction,
      parts: [
        {
          text: `La otra persona acaba de decir: "${heardConversation}". Genera 3 respuestas adecuadas para contestarle de inmediato.`
        }
      ],
      jsonMode: true
    });

    let parsed: any = null;
    try {
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBracket = cleanJson.indexOf('[');
      const lastBracket = cleanJson.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        parsed = JSON.parse(cleanJson.substring(firstBracket, lastBracket + 1));
      } else {
        parsed = JSON.parse(cleanJson);
      }
    } catch {
      parsed = [
        { id: '1', emoji: '👍', label: 'Sí, de acuerdo', speakText: 'Sí, estoy de acuerdo.' },
        { id: '2', emoji: '✋', label: 'Ahora no', speakText: 'Ahora mismo no puedo, gracias.' },
        { id: '3', emoji: '❓', label: 'No entendí', speakText: '¿Podrías repetirlo, por favor?' }
      ];
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map((item, index) => ({
        id: String(item.id || `aac-${index}`),
        emoji: item.emoji || '💬',
        label: item.label || 'Opción',
        speakText: item.speakText || item.label || ''
      }));
    }

    return [
      { id: '1', emoji: '👍', label: 'Sí, por favor', speakText: 'Sí, por favor.' },
      { id: '2', emoji: '✋', label: 'No, gracias', speakText: 'No, muchas gracias.' },
      { id: '3', emoji: '❓', label: '¿Puedes repetir?', speakText: '¿Puedes repetirlo más despacio?' }
    ];
  }

  private extractStepsFromText(text: string): { summary: string; steps: { stepNumber: number; emoji: string; instruction: string }[] } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const steps: { stepNumber: number; emoji: string; instruction: string }[] = [];
    let summary = 'Instrucciones simplificadas:';

    let stepNum = 1;
    for (const line of lines) {
      if (line.toLowerCase().includes('resumen') || (line.length > 80 && steps.length === 0)) {
        summary = line.replace(/^#+\s*/, '');
        continue;
      }
      const cleaned = line.replace(/^(\d+[\.\)\-:]|\*|\-|\•)\s*/, '').trim();
      if (cleaned.length > 3) {
        steps.push({
          stepNumber: stepNum++,
          emoji: '👉',
          instruction: cleaned
        });
      }
    }

    return {
      summary,
      steps: steps.length > 0 ? steps : [{ stepNumber: 1, emoji: '✅', instruction: text }]
    };
  }

  private formatErrorMessage(error: any): string {
    const msg = error?.message || String(error);
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return 'Clave API de Gemini inválida. Por favor verifica tu clave en Ajustes.';
    }
    if (msg.includes('QUOTA_EXCEEDED') || msg.includes('Resource has been exhausted')) {
      return 'Cuota de API agotada temporalmente. Espera unos segundos e inténtalo de nuevo.';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return 'Error de conexión de red. Comprueba tu conexión a internet.';
    }
    return msg;
  }
}

export const aiService = new AiService();
