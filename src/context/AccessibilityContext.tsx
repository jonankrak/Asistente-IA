import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AssistanceMode,
  CognitiveOutputFormat,
  ContrastTheme,
  FontSize,
  UserProfileId,
  UserProfileOption
} from '../types';
import { getUserProfileById } from '../data/userProfiles';
import { aiService } from '../services/aiService';
import { devLogger } from '../services/loggerService';
import { useHaptics } from '../hooks/useHaptics';

interface Announcement {
  id: string;
  message: string;
  priority: 'assertive' | 'polite';
}

interface AccessibilityContextType {
  mode: AssistanceMode;
  setMode: (mode: AssistanceMode) => void;
  cognitiveFormat: CognitiveOutputFormat;
  setCognitiveFormat: (format: CognitiveOutputFormat) => void;
  isMobile: boolean;
  toggleDeviceMode: () => void;
  userProfile: UserProfileOption;
  selectUserProfile: (profileId: UserProfileId) => void;
  isProfileControlEnabled: boolean;
  setIsProfileControlEnabled: (enabled: boolean) => void;
  isColorProfileControlled: boolean;
  setIsColorProfileControlled: (enabled: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  contrastTheme: ContrastTheme;
  setContrastTheme: (theme: ContrastTheme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  autoSpeak: boolean;
  setAutoSpeak: (enabled: boolean) => void;
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
  dyslexiaFriendly: boolean;
  setDyslexiaFriendly: (enabled: boolean) => void;
  stepByStepFocus: boolean;
  setStepByStepFocus: (enabled: boolean) => void;
  maxWordsPerSentence: number;
  setMaxWordsPerSentence: (maxWords: number) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  hasApiKey: boolean;
  announcements: Announcement[];
  announce: (message: string, priority?: 'assertive' | 'polite') => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isDevConsoleOpen: boolean;
  setIsDevConsoleOpen: (open: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE_CONTROL: 'a11y_profile_control_enabled',
  COLOR_PROFILE_CONTROL: 'a11y_color_profile_control_enabled',
  USER_PROFILE: 'a11y_user_profile_id',
  MODE: 'a11y_active_mode',
  COGNITIVE_FORMAT: 'a11y_cognitive_format',
  CONTRAST: 'a11y_contrast_theme',
  FONT_SIZE: 'a11y_font_size',
  SPEECH_RATE: 'a11y_speech_rate',
  AUTO_SPEAK: 'a11y_auto_speak',
  HAPTIC: 'a11y_haptic_enabled',
  DYSLEXIA: 'a11y_dyslexia_friendly',
  STEP_BY_STEP: 'a11y_step_by_step_focus',
  MAX_WORDS: 'a11y_max_words_sentence',
  API_KEY: 'a11y_gemini_api_key'
};

function detectIsMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).platform || '';
  const uaDataMobile = Boolean((navigator as any).userAgentData?.mobile);

  const isAndroidOrIOS =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) ||
    (/Linux/i.test(platform) && navigator.maxTouchPoints > 1);

  const isSmallViewport = window.innerWidth <= 860 || window.screen.width <= 860;
  const isCoarsePointer =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches) &&
    window.innerWidth <= 1100;

  return uaDataMobile || isAndroidOrIOS || isSmallViewport || isCoarsePointer;
}

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { triggerShort, triggerSuccess } = useHaptics();

  // Detección automática de Móvil vs Ordenador (PC)
  const [manualDeviceOverride, setManualDeviceOverride] = useState<'mobile' | 'desktop' | null>(null);
  const [autoDetectedMobile, setAutoDetectedMobile] = useState<boolean>(() => detectIsMobileDevice());

  useEffect(() => {
    const handleResize = () => {
      setAutoDetectedMobile(detectIsMobileDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile =
    manualDeviceOverride !== null ? manualDeviceOverride === 'mobile' : autoDetectedMobile;

  // Control Automático por Perfil vs Ajuste Manual (General)
  const [isProfileControlEnabled, setIsProfileControlEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE_CONTROL);
    return saved !== null ? saved === 'true' : true;
  });

  // Control Independiente del Cambio de Color (Automático por Perfil vs Manual Separado)
  const [isColorProfileControlled, setIsColorProfileControlledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLOR_PROFILE_CONTROL);
    return saved !== null ? saved === 'true' : true;
  });

  // Perfil de usuario inicial
  const [userProfile, setUserProfileState] = useState<UserProfileOption>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.USER_PROFILE) as UserProfileId | null;
    const initialProfile = getUserProfileById(savedId);
    aiService.updateProfileDirective(initialProfile.aiDirective, initialProfile.shortTitle);
    return initialProfile;
  });

  // Mostrar selector de perfil al iniciar la aplicación
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(true);

  // Estados de todos los parámetros de la aplicación
  const [mode, setModeState] = useState<AssistanceMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE) as AssistanceMode;
    return saved && ['visual', 'cognitive', 'auditory'].includes(saved)
      ? saved
      : userProfile.recommendedMode;
  });

  const [cognitiveFormat, setCognitiveFormatState] = useState<CognitiveOutputFormat>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COGNITIVE_FORMAT) as CognitiveOutputFormat;
    return saved && ['easy-read', 'pictograms', 'full-document'].includes(saved)
      ? saved
      : userProfile.recommendedFormat;
  });

  const [contrastTheme, setContrastThemeState] = useState<ContrastTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONTRAST) as ContrastTheme;
    return saved || userProfile.recommendedTheme;
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as FontSize;
    return saved || userProfile.recommendedFontSize;
  });

  const [speechRate, setSpeechRateState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPEECH_RATE);
    return saved ? parseFloat(saved) : userProfile.recommendedSpeechRate;
  });

  const [autoSpeak, setAutoSpeakState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTO_SPEAK);
    return saved !== null ? saved === 'true' : userProfile.recommendedAutoSpeak;
  });

  const [hapticEnabled, setHapticEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HAPTIC);
    return saved !== null ? saved === 'true' : userProfile.recommendedHaptic;
  });

  const [dyslexiaFriendly, setDyslexiaFriendlyState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DYSLEXIA);
    return saved !== null ? saved === 'true' : userProfile.dyslexiaFriendly;
  });

  const [stepByStepFocus, setStepByStepFocusState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STEP_BY_STEP);
    return saved !== null ? saved === 'true' : userProfile.stepByStepFocus;
  });

  const [maxWordsPerSentence, setMaxWordsPerSentenceState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MAX_WORDS);
    return saved ? parseInt(saved, 10) : userProfile.maxWordsPerSentence;
  });

  const [apiKey, setApiKeyState] = useState<string>(() => {
    let hashKey = '';
    if (typeof window !== 'undefined' && window.location.hash.includes('key=')) {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const extracted = (params.get('key') || '').trim();
      if (extracted.length > 10) {
        hashKey = extracted;
        localStorage.setItem(STORAGE_KEYS.API_KEY, hashKey);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        devLogger.success('Config', 'Clave API configurada automáticamente desde enlace/QR móvil');
      }
    }

    const envKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    const saved = (localStorage.getItem(STORAGE_KEYS.API_KEY) || '').trim();
    const initialKey = hashKey || (saved && saved.length > 10 ? saved : envKey);
    aiService.updateApiKey(initialKey);
    return initialKey;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDevConsoleOpen, setIsDevConsoleOpen] = useState<boolean>(false);

  // Anuncios para lectores de pantalla y feedback accesible
  const announce = useCallback((message: string, priority: 'assertive' | 'polite' = 'assertive') => {
    const id = `announce-${Date.now()}-${Math.random()}`;
    setAnnouncements((prev) => [...prev.slice(-3), { id, message, priority }]);
  }, []);

  // Aplicar todos los parámetros de un perfil a la aplicación
  const applyAllProfileParameters = useCallback(
    (profile: UserProfileOption, forceColorUpdate: boolean = false) => {
      setModeState(profile.recommendedMode);
      localStorage.setItem(STORAGE_KEYS.MODE, profile.recommendedMode);

      setCognitiveFormatState(profile.recommendedFormat);
      localStorage.setItem(STORAGE_KEYS.COGNITIVE_FORMAT, profile.recommendedFormat);

      if (isColorProfileControlled || forceColorUpdate) {
        setContrastThemeState(profile.recommendedTheme);
        localStorage.setItem(STORAGE_KEYS.CONTRAST, profile.recommendedTheme);
        document.documentElement.setAttribute('data-theme', profile.recommendedTheme);
      }

      setFontSizeState(profile.recommendedFontSize);
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, profile.recommendedFontSize);
      document.documentElement.setAttribute('data-font-size', profile.recommendedFontSize);

      setSpeechRateState(profile.recommendedSpeechRate);
      localStorage.setItem(STORAGE_KEYS.SPEECH_RATE, profile.recommendedSpeechRate.toString());

      setAutoSpeakState(profile.recommendedAutoSpeak);
      localStorage.setItem(STORAGE_KEYS.AUTO_SPEAK, profile.recommendedAutoSpeak.toString());

      setHapticEnabledState(profile.recommendedHaptic);
      localStorage.setItem(STORAGE_KEYS.HAPTIC, profile.recommendedHaptic.toString());

      setDyslexiaFriendlyState(profile.dyslexiaFriendly);
      localStorage.setItem(STORAGE_KEYS.DYSLEXIA, profile.dyslexiaFriendly.toString());
      document.documentElement.setAttribute(
        'data-dyslexia',
        profile.dyslexiaFriendly ? 'true' : 'false'
      );

      setStepByStepFocusState(profile.stepByStepFocus);
      localStorage.setItem(STORAGE_KEYS.STEP_BY_STEP, profile.stepByStepFocus.toString());

      setMaxWordsPerSentenceState(profile.maxWordsPerSentence);
      localStorage.setItem(STORAGE_KEYS.MAX_WORDS, profile.maxWordsPerSentence.toString());

      aiService.updateProfileDirective(profile.aiDirective, profile.shortTitle);
    },
    [isColorProfileControlled]
  );

  // Sincronizar clave con servicio IA
  useEffect(() => {
    aiService.updateApiKey(apiKey);
  }, [apiKey]);

  // Aplicar atributos DOM de tema, tamaño de letra y dislexia
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', contrastTheme);
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('data-dyslexia', dyslexiaFriendly ? 'true' : 'false');
  }, [contrastTheme, fontSize, dyslexiaFriendly]);

  // Activar o desactivar el Control Automático por Perfil desde Ajustes
  const setIsProfileControlEnabled = useCallback(
    (enabled: boolean) => {
      setIsProfileControlEnabledState(enabled);
      localStorage.setItem(STORAGE_KEYS.PROFILE_CONTROL, enabled.toString());
      if (enabled) {
        applyAllProfileParameters(userProfile);
        devLogger.info(
          'Perfil',
          `Control automático por perfil ACTIVADO (${userProfile.shortTitle})`
        );
        announce(
          `Control automático por perfil activado. Todos los parámetros se han sincronizado con ${userProfile.shortTitle}.`,
          'assertive'
        );
      } else {
        devLogger.info('Perfil', 'Modo de AJUSTE MANUAL activado. Todos los controles desbloqueados.');
        announce(
          'Modo de ajuste manual activado. Ahora puedes modificar todos los parámetros libremente.',
          'assertive'
        );
      }
    },
    [userProfile, applyAllProfileParameters, announce]
  );

  // Activar o desactivar el Control Automático de Color por Perfil de forma independiente
  const setIsColorProfileControlled = useCallback(
    (enabled: boolean) => {
      setIsColorProfileControlledState(enabled);
      localStorage.setItem(STORAGE_KEYS.COLOR_PROFILE_CONTROL, enabled.toString());
      if (enabled) {
        setContrastThemeState(userProfile.recommendedTheme);
        localStorage.setItem(STORAGE_KEYS.CONTRAST, userProfile.recommendedTheme);
        document.documentElement.setAttribute('data-theme', userProfile.recommendedTheme);
        devLogger.info(
          'Color',
          `Control automático de color por perfil ACTIVADO (${userProfile.recommendedTheme})`
        );
        announce(
          `Color automático del perfil activado: ${userProfile.shortTitle}.`,
          'assertive'
        );
      } else {
        devLogger.info('Color', 'Cambio de color MANUAL activado de forma independiente.');
        announce(
          'Control manual de color activado. Ahora puedes cambiar el tema de contraste libremente.',
          'assertive'
        );
      }
    },
    [userProfile, announce]
  );

  // Seleccionar un perfil diagnóstico/funcional (reactiva el control por perfil y aplica sus parámetros)
  const selectUserProfile = useCallback(
    (profileId: UserProfileId) => {
      const chosen = getUserProfileById(profileId);
      setUserProfileState(chosen);
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, chosen.id);

      // Al escoger un perfil, activar el control por perfil y aplicar todos sus parámetros
      setIsProfileControlEnabledState(true);
      localStorage.setItem(STORAGE_KEYS.PROFILE_CONTROL, 'true');
      applyAllProfileParameters(chosen);

      setIsProfileModalOpen(false);
      if (chosen.recommendedHaptic) triggerSuccess();

      devLogger.success(
        'Perfil',
        `Perfil aplicado con todos sus parámetros: ${chosen.categoryLabel} - ${chosen.levelLabel}`
      );
      announce(
        `Perfil activado: ${chosen.categoryLabel}, nivel ${chosen.levelLabel}. Se han configurado automáticamente tema, letra, voz, pictogramas y pautas IA.`,
        'assertive'
      );
    },
    [applyAllProfileParameters, triggerSuccess, announce]
  );

  const toggleDeviceMode = useCallback(() => {
    const next = isMobile ? 'desktop' : 'mobile';
    setManualDeviceOverride(next);
    if (hapticEnabled) triggerShort();
    announce(
      next === 'mobile'
        ? 'Cambiado a diseño optimizado para Teléfono Móvil'
        : 'Cambiado a diseño de Escritorio para Ordenador',
      'polite'
    );
  }, [isMobile, hapticEnabled, triggerShort, announce]);

  const setMode = useCallback(
    (newMode: AssistanceMode) => {
      setModeState(newMode);
      localStorage.setItem(STORAGE_KEYS.MODE, newMode);
      if (hapticEnabled) triggerShort();
      devLogger.info('Modo', `Cambiado al modo: ${newMode}`);

      const modeNames: Record<AssistanceMode, string> = {
        visual: 'Modo Visual activado. Botón táctil grande disponible.',
        cognitive: 'Modo Cognitivo de Lectura Fácil y Pictogramas activado.',
        auditory: 'Modo Auditivo y Comunicador Rápido activado.'
      };
      announce(modeNames[newMode], 'assertive');
    },
    [hapticEnabled, triggerShort, announce]
  );

  const setCognitiveFormat = useCallback((format: CognitiveOutputFormat) => {
    setCognitiveFormatState(format);
    localStorage.setItem(STORAGE_KEYS.COGNITIVE_FORMAT, format);
  }, []);

  const setContrastTheme = useCallback((theme: ContrastTheme) => {
    setContrastThemeState(theme);
    localStorage.setItem(STORAGE_KEYS.CONTRAST, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
    document.documentElement.setAttribute('data-font-size', size);
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    setSpeechRateState(rate);
    localStorage.setItem(STORAGE_KEYS.SPEECH_RATE, rate.toString());
  }, []);

  const setAutoSpeak = useCallback((enabled: boolean) => {
    setAutoSpeakState(enabled);
    localStorage.setItem(STORAGE_KEYS.AUTO_SPEAK, enabled.toString());
  }, []);

  const setHapticEnabled = useCallback((enabled: boolean) => {
    setHapticEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.HAPTIC, enabled.toString());
  }, []);

  const setDyslexiaFriendly = useCallback((enabled: boolean) => {
    setDyslexiaFriendlyState(enabled);
    localStorage.setItem(STORAGE_KEYS.DYSLEXIA, enabled.toString());
    document.documentElement.setAttribute('data-dyslexia', enabled ? 'true' : 'false');
  }, []);

  const setStepByStepFocus = useCallback((enabled: boolean) => {
    setStepByStepFocusState(enabled);
    localStorage.setItem(STORAGE_KEYS.STEP_BY_STEP, enabled.toString());
  }, []);

  const setMaxWordsPerSentence = useCallback((maxWords: number) => {
    setMaxWordsPerSentenceState(maxWords);
    localStorage.setItem(STORAGE_KEYS.MAX_WORDS, maxWords.toString());
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
    aiService.updateApiKey(key);
  }, []);

  // Atajos globales de teclado para Accesibilidad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          announce('Ajustes cerrados', 'polite');
        } else if (isProfileModalOpen) {
          setIsProfileModalOpen(false);
          announce('Selector de perfil cerrado', 'polite');
        }
      }

      if (!isInput) {
        if (e.key === '1') {
          setMode('visual');
        } else if (e.key === '2') {
          setMode('cognitive');
        } else if (e.key === '3') {
          setMode('auditory');
        } else if (e.key === 'p' || e.key === 'P') {
          setIsProfileModalOpen((prev) => !prev);
        } else if (e.key === 's' || e.key === 'S') {
          setIsSettingsOpen((prev) => !prev);
        } else if (e.key === 'd' || e.key === 'D') {
          setIsDevConsoleOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isProfileModalOpen, setMode, announce]);

  return (
    <AccessibilityContext.Provider
      value={{
        mode,
        setMode,
        cognitiveFormat,
        setCognitiveFormat,
        isMobile,
        toggleDeviceMode,
        userProfile,
        selectUserProfile,
        isProfileControlEnabled,
        setIsProfileControlEnabled,
        isColorProfileControlled,
        setIsColorProfileControlled,
        isProfileModalOpen,
        setIsProfileModalOpen,
        contrastTheme,
        setContrastTheme,
        fontSize,
        setFontSize,
        speechRate,
        setSpeechRate,
        autoSpeak,
        setAutoSpeak,
        hapticEnabled,
        setHapticEnabled,
        dyslexiaFriendly,
        setDyslexiaFriendly,
        stepByStepFocus,
        setStepByStepFocus,
        maxWordsPerSentence,
        setMaxWordsPerSentence,
        apiKey,
        setApiKey,
        hasApiKey: Boolean(apiKey && apiKey.length > 5),
        announcements,
        announce,
        isSettingsOpen,
        setIsSettingsOpen,
        isDevConsoleOpen,
        setIsDevConsoleOpen
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility debe usarse dentro de un AccessibilityProvider');
  }
  return context;
}
