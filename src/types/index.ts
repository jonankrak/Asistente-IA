export type AssistanceMode = 'visual' | 'cognitive' | 'auditory';

export type ContrastTheme = 'default' | 'dark-high' | 'yellow-black' | 'white-black';

export type FontSize = 'normal' | 'large' | 'extralarge';

export type ProfileCategoryId = 'di' | 'tea' | 'dislexia' | 'tdah';

export type UserProfileId =
  | 'di-leve'
  | 'di-moderada'
  | 'di-grave'
  | 'tea-grado1'
  | 'tea-grado2'
  | 'tea-grado3'
  | 'dislexia-leve'
  | 'dislexia-moderado'
  | 'dislexia-grave'
  | 'tdah-leve'
  | 'tdah-moderado'
  | 'tdah-grave';

export interface UserProfileOption {
  id: UserProfileId;
  categoryId: ProfileCategoryId;
  categoryLabel: string;
  levelLabel: string;
  shortTitle: string;
  description: string;
  badgeColor: string;
  recommendedMode: AssistanceMode;
  recommendedFormat: CognitiveOutputFormat;
  recommendedTheme: ContrastTheme;
  recommendedFontSize: FontSize;
  recommendedSpeechRate: number;
  recommendedAutoSpeak: boolean;
  recommendedHaptic: boolean;
  dyslexiaFriendly: boolean;
  stepByStepFocus: boolean;
  maxWordsPerSentence: number;
  aiDirective: string;
}

export interface ProfileCategory {
  id: ProfileCategoryId;
  title: string;
  emoji: string;
  subtitle: string;
  options: UserProfileOption[];
}

export interface EasyReadStep {
  id: string;
  stepNumber: number;
  emoji: string;
  instruction: string;
  completed: boolean;
}

export interface CognitiveResult {
  summary: string;
  steps: EasyReadStep[];
}

export type CognitiveOutputFormat = 'easy-read' | 'pictograms';

export type PictogramImageSource =
  | 'arasaac'
  | 'arasaac-synonym'
  | 'arasaac-compound'
  | 'wikimedia'
  | 'custom'
  | 'none';

export interface SubPictogramItem {
  keyword: string;
  pictogramId: number | null;
  imageUrl: string;
}

/** Entrada guardada por un profesor o usuario para una palabra sin pictograma o personalizada */
export interface CustomPictogramEntry {
  word: string;
  imageUrl?: string | null;
  pictogramId?: number | null;
  resolvedKeyword?: string;
  compoundPictograms?: SubPictogramItem[];
  conceptExplanation?: string;
  updatedAt: number;
}

/** Una palabra clave dentro de una frase, enlazada (si existe) a un pictograma ARASAAC, sinónimo, combinación de pictogramas o imagen explicativa */
export interface PictogramToken {
  word: string;          // Palabra tal y como se muestra bajo el pictograma
  keyword: string;       // Lema en infinitivo/singular usado para buscar en ARASAAC
  synonyms?: string[];   // Sinónimos alternativos sencillos sugeridos para buscar en ARASAAC
  fallbackKeywords?: string[]; // 2-3 palabras sencillas para explicarlo con varios pictogramas
  pictogramId: number | null;
  imageUrl: string | null;
  imageSource?: PictogramImageSource;
  resolvedKeyword?: string; // Si se encontró mediante un sinónimo, qué palabra se usó
  compoundPictograms?: SubPictogramItem[]; // Secuencia de 2-3 pictogramas que explican la palabra
  conceptExplanation?: string; // Breve explicación sencilla del concepto si es complejo
}

/** Una frase corta (una sola idea) representada como secuencia de pictogramas */
export interface PictogramPhrase {
  id: string;
  stepNumber: number;
  text: string;
  tokens: PictogramToken[];
  completed: boolean;
}

export interface PictogramResult {
  title: string;
  phrases: PictogramPhrase[];
}

export type GuidelineSeverity = 'ok' | 'warning' | 'error';

export interface GuidelineCheck {
  id: string;
  rule: string;          // Descripción de la pauta (UNE 153101:2018 EX / criterios ATECA)
  severity: GuidelineSeverity;
  detail: string;
}

export interface AacOption {
  id: string;
  label: string;
  emoji: string;
  speakText: string;
}

export interface SpeechSettings {
  rate: number;      // 0.5 to 2.0
  pitch: number;     // 0.5 to 1.5
  volume: number;    // 0 to 1
  selectedVoiceURI: string | null;
}

export interface AccessibilitySettings {
  contrastTheme: ContrastTheme;
  fontSize: FontSize;
  hapticEnabled: boolean;
  speechRate: number;
  autoSpeak: boolean;
  geminiApiKey: string;
}
