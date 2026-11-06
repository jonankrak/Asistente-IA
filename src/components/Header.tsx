import React from 'react';
import {
  Eye,
  BookOpen,
  MessageSquare,
  Settings as SettingsIcon,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { AssistanceMode } from '../types';

type NavItem = {
  mode: AssistanceMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
  shortcut: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    mode: 'visual',
    label: 'Describir',
    hint: 'Describe lo que ve la cámara',
    icon: <Eye className="w-6 h-6 shrink-0" aria-hidden="true" />,
    shortcut: '1'
  },
  {
    mode: 'cognitive',
    label: 'Leer fácil',
    hint: 'Texto fácil y pictogramas',
    icon: <BookOpen className="w-6 h-6 shrink-0" aria-hidden="true" />,
    shortcut: '2'
  },
  {
    mode: 'auditory',
    label: 'Conversar',
    hint: 'Transcribe y propone respuestas',
    icon: <MessageSquare className="w-6 h-6 shrink-0" aria-hidden="true" />,
    shortcut: '3'
  }
];

export const Header: React.FC = () => {
  const {
    mode,
    setMode,
    isMobile,
    userProfile,
    setIsProfileModalOpen,
    hasApiKey,
    setIsSettingsOpen
  } = useAccessibility();

  const brand = (
    <div className="flex items-center gap-3 shrink-0">
      <div
        className="w-11 h-11 rounded-2xl bg-a11y-primary text-a11y-primaryText flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <BookOpen className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <h1 className={`text-xl font-bold leading-tight text-a11y-text whitespace-nowrap ${isMobile ? 'sr-only' : ''}`}>
          Asistente IA
        </h1>
        {!isMobile && (
          <p className="hidden md:block text-sm text-a11y-text opacity-80 leading-tight whitespace-nowrap">
            Lectura fácil, pictogramas y voz
          </p>
        )}
      </div>
    </div>
  );

  const profileButton = (
    <button
      onClick={() => setIsProfileModalOpen(true)}
      className="touch-target min-h-[48px] px-4 py-2 rounded-full border-2 border-a11y-border bg-a11y-bg text-a11y-text font-bold text-sm flex items-center gap-2 hover:border-a11y-primary"
      aria-label={`Perfil de apoyo: ${userProfile.shortTitle}. Pulsa para cambiarlo (tecla P).`}
    >
      <UserCheck className="w-5 h-5 shrink-0 text-a11y-primary" aria-hidden="true" />
      <span className={isMobile ? 'truncate max-w-[150px]' : 'truncate max-w-[340px]'}>{userProfile.shortTitle}</span>
    </button>
  );

  const settingsButton = (
    <button
      onClick={() => setIsSettingsOpen(true)}
      className="touch-target min-h-[48px] px-3 py-2 rounded-full border-2 border-a11y-border bg-a11y-bg text-a11y-text font-bold text-sm flex items-center gap-2 hover:border-a11y-primary"
      aria-label="Abrir ajustes (tecla S)"
    >
      <SettingsIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
      {!isMobile && <span>Ajustes</span>}
    </button>
  );

  const apiKeyBanner = !hasApiKey && (
    <div
      role="status"
      className="w-full border-b-2 border-a11y-primary bg-a11y-bg text-a11y-text"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold text-base">
          <AlertTriangle className="w-5 h-5 shrink-0 text-a11y-primary" aria-hidden="true" />
          Falta la clave de Gemini. Sin ella la app no puede adaptar textos.
        </p>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="touch-target min-h-[44px] px-4 py-2 rounded-full bg-a11y-primary text-a11y-primaryText font-bold text-sm"
        >
          Añadir clave
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <header
          className="sticky top-0 z-30 w-full border-b-2 border-a11y-border bg-a11y-card px-3 py-2"
          role="banner"
        >
          <div className="flex items-center justify-between gap-2">
            {brand}
            <div className="flex items-center gap-2 shrink-0">
              {profileButton}
              {settingsButton}
            </div>
          </div>
        </header>
        {apiKeyBanner}

        <nav
          aria-label="Modos de la aplicación"
          className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-a11y-border bg-a11y-card px-2 pt-2 safe-bottom-nav"
        >
          <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = mode === item.mode;
              return (
                <button
                  key={item.mode}
                  onClick={() => setMode(item.mode)}
                  aria-pressed={isActive}
                  aria-label={`${item.label}: ${item.hint}`}
                  className={`touch-target min-h-[64px] py-2 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold transition-colors ${
                    isActive
                      ? 'bg-a11y-primary text-a11y-primaryText'
                      : 'bg-transparent text-a11y-text'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm leading-none">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      <header className="w-full border-b-2 border-a11y-border bg-a11y-card" role="banner">
        <div className="max-w-6xl mx-auto px-6 pt-3 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-4">
            {brand}
            <div className="flex items-center gap-2 min-w-0">
              {profileButton}
              {settingsButton}
            </div>
          </div>

          <nav aria-label="Modos de la aplicación" className="flex justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-full border-2 border-a11y-border bg-a11y-bg">
              {NAV_ITEMS.map((item) => {
                const isActive = mode === item.mode;
                return (
                  <button
                    key={item.mode}
                    onClick={() => setMode(item.mode)}
                    aria-pressed={isActive}
                    title={`${item.hint} (tecla ${item.shortcut})`}
                    className={`touch-target min-h-[48px] px-6 py-2 rounded-full flex items-center gap-2 font-bold text-base whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-a11y-primary text-a11y-primaryText'
                        : 'text-a11y-text hover:bg-a11y-card'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </header>
      {apiKeyBanner}
    </>
  );
};
