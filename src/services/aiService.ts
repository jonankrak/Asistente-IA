import { EasyReadStep, AacOption, PictogramResult, PictogramPhrase } from '../types';
import { devLogger } from './loggerService';
import { findPictogramIds, getPictogramImageUrl } from './arasaacService';

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
- En "keyword" escribe el LEMA más simple y concreto en español para buscarlo en ARASAAC: verbos en INFINITIVO ("lavar", no "lava"), sustantivos en SINGULAR ("camisa", no "camisas"), adjetivos en masculino singular.
- Prefiere palabras concretas y visuales que existan en un diccionario de pictogramas básico (ej.: "médico", "pastilla", "comer", "casa", "mañana").
- En "word" escribe la palabra tal y como aparece en la frase.`;

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
    this.updateApiKey(apiKey || import.meta.env.VITE_GEMINI_API_KEY || '');
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
      jsonMode: false,
      temperature: 0.1
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
    temperature?: number;
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

        const generationConfig: Record<string, any> = {
          temperature: params.temperature ?? 0.2,
          maxOutputTokens: 1024,
        };

        if (params.jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(this.currentApiKey)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
      jsonMode: false,
      temperature: 0.2
    });
  }

  /**
   * 2. MODO COGNITIVO: Lectura Fácil y Rutinas
   * Transforma textos o documentos complejos en pasos numerados con emoji y lenguaje literal
   */
  async simplifyToEasyRead(params: {
    text?: string;
    base64Image?: string;
  }): Promise<{ summary: string; steps: EasyReadStep[] }> {
    const profileBlock = this.currentProfileDirective
      ? `\nADAPTACIÓN ESPECÍFICA AL PERFIL DEL USUARIO:\n${this.currentProfileDirective}\n`
      : '';

    const systemInstruction =
      `Adapta cualquier texto o instrucción a formato de Lectura Fácil. Usa frases cortas, una sola idea por línea, lenguaje 100% literal (sin metáforas ni ironías) y divide las tareas en pasos numerados muy sencillos con un emoji representativo al inicio de cada paso.
${profileBlock}
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
      jsonMode: true,
      temperature: 0.2
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
   * 2b. MODO COGNITIVO – PICTOGRAMAS (ARASAAC)
   * Convierte el texto/documento en frases muy cortas y las representa con pictogramas ARASAAC
   */
  async generatePictograms(params: {
    text?: string;
    base64Image?: string;
  }): Promise<PictogramResult> {
    const profileBlock = this.currentProfileDirective
      ? `\nADAPTACIÓN ESPECÍFICA AL PERFIL DEL USUARIO:\n${this.currentProfileDirective}\n`
      : '';

    const systemInstruction =
      `Eres un especialista en accesibilidad cognitiva y Comunicación Aumentativa y Alternativa (CAA). Adapta el texto o documento a frases de Lectura Fácil que se representarán con pictogramas.
${profileBlock}
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
        { "word": "Yo", "keyword": "yo" },
        { "word": "separo", "keyword": "separar" },
        { "word": "ropa", "keyword": "ropa" },
        { "word": "blanca", "keyword": "blanco" }
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
      jsonMode: true,
      temperature: 0.2
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

    // Normalizar palabras clave (si la IA no las devuelve, se usan las palabras de la frase)
    const STOPWORDS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'y', 'o', 'que', 'se', 'lo']);
    const normalized = rawPhrases.map((p: any, idx: number) => {
      const text: string = String(p.text || p.instruction || '').trim();
      let keywords: { word: string; keyword: string }[] = Array.isArray(p.keywords)
        ? p.keywords
            .map((k: any) => typeof k === 'string'
              ? { word: k, keyword: k }
              : { word: String(k.word || k.keyword || ''), keyword: String(k.keyword || k.word || '') })
            .filter((k: any) => k.keyword.trim())
        : [];
      if (keywords.length === 0) {
        keywords = text
          .replace(/[.,;:!?¡¿]/g, '')
          .split(/\s+/)
          .filter(w => w && !STOPWORDS.has(w.toLowerCase()))
          .map(w => ({ word: w, keyword: w.toLowerCase() }));
      }
      return { stepNumber: Number(p.stepNumber) || idx + 1, text, keywords };
    });

    // Resolver todos los pictogramas en ARASAAC
    const allKeywords = normalized.flatMap(p => p.keywords.map(k => k.keyword));
    devLogger.api('ARASAAC', `Buscando ${new Set(allKeywords).size} pictogramas en api.arasaac.org...`);
    const idMap = await findPictogramIds(allKeywords);

    // Si el lema no tiene pictograma, se intenta con la palabra literal
    const missingLiteral = normalized
      .flatMap(p => p.keywords)
      .filter(k => !idMap.get(k.keyword.trim().toLowerCase()) && k.word.toLowerCase() !== k.keyword.toLowerCase())
      .map(k => k.word);
    const literalMap = missingLiteral.length > 0 ? await findPictogramIds(missingLiteral) : new Map<string, number | null>();

    const phrases: PictogramPhrase[] = normalized.map((p, idx) => ({
      id: `picto-${idx + 1}-${Date.now()}`,
      stepNumber: p.stepNumber,
      text: p.text,
      completed: false,
      tokens: p.keywords.map(k => {
        const id = idMap.get(k.keyword.trim().toLowerCase()) ?? literalMap.get(k.word.trim().toLowerCase()) ?? null;
        return {
          word: k.word,
          keyword: k.keyword,
          pictogramId: id,
          imageUrl: id ? getPictogramImageUrl(id, 300) : null
        };
      })
    }));

    const found = phrases.flatMap(p => p.tokens).filter(t => t.pictogramId).length;
    const total = phrases.flatMap(p => p.tokens).length;
    devLogger.success('ARASAAC', `Pictogramas resueltos: ${found}/${total}`);

    return {
      title: String(parsed?.title || 'Información con pictogramas'),
      phrases
    };
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
      jsonMode: true,
      temperature: 0.2
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
