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
  recommendedFontSize: FontSize;
  recommendedSpeechRate: number;
  dyslexiaFriendly: boolean;
  stepByStepFocus: boolean;
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

/** Una palabra clave dentro de una frase, enlazada (si existe) a un pictograma ARASAAC */
export interface PictogramToken {
  word: string;          // Palabra tal y como se muestra bajo el pictograma
  keyword: string;       // Lema en infinitivo/singular usado para buscar en ARASAAC
  pictogramId: number | null;
  imageUrl: string | null;
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
