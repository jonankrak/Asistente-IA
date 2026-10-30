import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AssistanceMode, ContrastTheme, FontSize, UserProfileId, UserProfileOption } from '../types';
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
  userProfile: UserProfileOption;
  selectUserProfile: (profileId: UserProfileId) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  contrastTheme: ContrastTheme;
  setContrastTheme: (theme: ContrastTheme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
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
  CONTRAST: 'a11y_contrast_theme',
  FONT_SIZE: 'a11y_font_size',
  SPEECH_RATE: 'a11y_speech_rate',
  HAPTIC: 'a11y_haptic_enabled',
  API_KEY: 'a11y_gemini_api_key',
  MODE: 'a11y_active_mode',
  USER_PROFILE: 'a11y_user_profile_id',
};

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { triggerShort, triggerSuccess } = useHaptics();

  // Perfil de usuario inicial
  const [userProfile, setUserProfileState] = useState<UserProfileOption>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.USER_PROFILE) as UserProfileId | null;
    const initialProfile = getUserProfileById(savedId);
    aiService.updateProfileDirective(initialProfile.aiDirective, initialProfile.shortTitle);
    return initialProfile;
  });

  // Mostrar selector de perfil al iniciar la aplicación
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(true);

  // Modo inicial guardado o cognitive por defecto
  const [mode, setModeState] = useState<AssistanceMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE) as AssistanceMode;
    return saved && ['visual', 'cognitive', 'auditory'].includes(saved) ? saved : 'cognitive';
  });

  const [contrastTheme, setContrastThemeState] = useState<ContrastTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONTRAST) as ContrastTheme;
    return saved || 'yellow-black'; // Tema de máximo contraste por defecto para accesibilidad
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as FontSize;
    return saved || 'large';
  });

  const [speechRate, setSpeechRateState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPEECH_RATE);
    return saved ? parseFloat(saved) : 1.0;
  });

  const [hapticEnabled, setHapticEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HAPTIC);
    return saved !== null ? saved === 'true' : true;
  });

  const [apiKey, setApiKeyState] = useState<string>(() => {
    // 1. Permitir auto-configurar la API Key en el teléfono mediante #key=... en el enlace/QR
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

  // Sincronizar clave y perfil con servicio IA
  useEffect(() => {
    aiService.updateApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    aiService.updateProfileDirective(userProfile.aiDirective, userProfile.shortTitle);
    document.documentElement.setAttribute(
      'data-dyslexia',
      userProfile.dyslexiaFriendly ? 'true' : 'false'
    );
  }, [userProfile]);

  // Anuncios para lectores de pantalla y feedback accesible
  const announce = useCallback((message: string, priority: 'assertive' | 'polite' = 'assertive') => {
    const id = `announce-${Date.now()}-${Math.random()}`;
    setAnnouncements((prev) => [...prev.slice(-3), { id, message, priority }]);
  }, []);

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

  const setHapticEnabled = useCallback((enabled: boolean) => {
    setHapticEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.HAPTIC, enabled.toString());
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
    aiService.updateApiKey(key);
  }, []);

  // Seleccionar un perfil diagnóstico/funcional y aplicar sus ajustes recomendados
  const selectUserProfile = useCallback(
    (profileId: UserProfileId) => {
      const chosen = getUserProfileById(profileId);
      setUserProfileState(chosen);
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, chosen.id);

      // Aplicar ajustes recomendados del perfil elegido
      setModeState(chosen.recommendedMode);
      localStorage.setItem(STORAGE_KEYS.MODE, chosen.recommendedMode);
      setFontSize(chosen.recommendedFontSize);
      setSpeechRate(chosen.recommendedSpeechRate);

      aiService.updateProfileDirective(chosen.aiDirective, chosen.shortTitle);
      setIsProfileModalOpen(false);

      if (hapticEnabled) triggerSuccess();
      devLogger.success(
        'Perfil',
        `Perfil seleccionado: ${chosen.categoryLabel} - ${chosen.levelLabel}`
      );
      announce(
        `Perfil activado: ${chosen.categoryLabel}, nivel ${chosen.levelLabel}. Interfaz e Inteligencia Artificial adaptadas.`,
        'assertive'
      );
    },
    [hapticEnabled, triggerSuccess, setFontSize, setSpeechRate, announce]
  );

  // Aplicar clases y atributos al cargar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', contrastTheme);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [contrastTheme, fontSize]);

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
        userProfile,
        selectUserProfile,
        isProfileModalOpen,
        setIsProfileModalOpen,
        contrastTheme,
        setContrastTheme,
        fontSize,
        setFontSize,
        speechRate,
        setSpeechRate,
        hapticEnabled,
        setHapticEnabled,
        apiKey,
        setApiKey,
        hasApiKey: Boolean(apiKey && apiKey.length > 5),
        announcements,
        announce,
        isSettingsOpen,
        setIsSettingsOpen,
        isDevConsoleOpen,
        setIsDevConsoleOpen,
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
