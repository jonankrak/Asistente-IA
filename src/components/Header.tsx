import React from 'react';
import {
  Eye,
  BookOpen,
  MessageSquare,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  UserCheck,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { AssistanceMode } from '../types';

export const Header: React.FC = () => {
  const {
    mode,
    setMode,
    isMobile,
    toggleDeviceMode,
    userProfile,
    setIsProfileModalOpen,
    hasApiKey,
    setIsSettingsOpen,
    isDevConsoleOpen,
    setIsDevConsoleOpen
  } = useAccessibility();

  const navItems: {
    mode: AssistanceMode;
    shortLabel: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    shortcut: string;
  }[] = [
    {
      mode: 'visual',
      shortLabel: 'Visual',
      title: '1. Modo Visual (Ojos)',
      subtitle: 'Describir entorno y objetos',
      icon: <Eye className="w-7 h-7 shrink-0" aria-hidden="true" />,
      shortcut: '1'
    },
    {
      mode: 'cognitive',
      shortLabel: 'Cognitivo',
      title: '2. Modo Cognitivo',
      subtitle: 'Lectura Fácil UNE y Pictogramas',
      icon: <BookOpen className="w-7 h-7 shrink-0" aria-hidden="true" />,
      shortcut: '2'
    },
    {
      mode: 'auditory',
      shortLabel: 'Habla CAA',
      title: '3. Auditivo / Habla',
      subtitle: 'Transcriptor y respuestas CAA',
      icon: <MessageSquare className="w-7 h-7 shrink-0" aria-hidden="true" />,
      shortcut: '3'
    }
  ];

  // =========================================================================
  // INTERFAZ PARA TELÉFONO MÓVIL (Cabecera compacta + Barra inferior de pulgar)
  // =========================================================================
  if (isMobile) {
    return (
      <>
        {/* Barra Superior Compacta en Móvil */}
        <header
          className="sticky top-0 z-30 w-full border-b-4 border-a11y-border bg-a11y-card px-3 py-2.5 shadow-md"
          role="banner"
        >
          <div className="flex items-center justify-between gap-2">
            {/* Logo + Indicador Móvil */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-11 h-11 rounded-xl bg-a11y-primary text-a11y-primaryText flex items-center justify-center font-black text-lg border-2 border-a11y-border shrink-0"
                aria-hidden="true"
              >
                IA
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black leading-tight truncate text-a11y-text">
                  Asistente IA
                </h1>
                <button
                  onClick={toggleDeviceMode}
                  className="text-xs font-bold opacity-85 flex items-center gap-1 text-a11y-primary underline"
                  aria-label="Modo Móvil detectado. Tocar para cambiar a vista de ordenador"
                >
                  <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Vista Móvil</span>
                </button>
              </div>
            </div>

            {/* Botón central de Perfil Activo en Móvil */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="touch-target min-h-[52px] px-3 py-2 rounded-2xl border-2 border-a11y-border bg-a11y-primary text-a11y-primaryText font-black text-xs flex items-center gap-1.5 shadow-sm shrink-0"
              aria-label={`Perfil actual: ${userProfile.shortTitle}. Tocar para cambiar perfil.`}
            >
              <UserCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[110px]">{userProfile.shortTitle}</span>
            </button>

            {/* Botones de Ajustes y Consola Dev en Móvil */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsDevConsoleOpen(!isDevConsoleOpen)}
                className={`touch-target min-w-[48px] min-h-[52px] p-2.5 rounded-xl border-2 transition-colors ${
                  isDevConsoleOpen
                    ? 'bg-cyan-400 text-black border-cyan-200'
                    : 'border-cyan-500/70 bg-zinc-900 text-cyan-400'
                }`}
                aria-label="Abrir o cerrar consola de desarrollador"
              >
                <Terminal className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`touch-target min-w-[52px] min-h-[52px] p-2.5 rounded-xl border-2 transition-colors relative ${
                  hasApiKey
                    ? 'border-a11y-border bg-a11y-bg text-a11y-text'
                    : 'border-yellow-400 bg-yellow-950/60 text-yellow-300 animate-pulse'
                }`}
                aria-label="Abrir ajustes de accesibilidad y clave API"
              >
                <SettingsIcon className="w-6 h-6" aria-hidden="true" />
                {!hasApiKey && (
                  <span
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border border-white"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Barra de Navegación Inferior Fija para el Pulgar en Móvil */}
        <nav
          aria-label="Navegación principal móvil"
          className="fixed bottom-0 left-0 right-0 z-40 border-t-4 border-a11y-border bg-a11y-card px-2 py-2 shadow-2xl"
        >
          <div className="grid grid-cols-3 gap-2 max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive = mode === item.mode;
              return (
                <button
                  key={item.mode}
                  onClick={() => setMode(item.mode)}
                  aria-pressed={isActive}
                  aria-label={item.title}
                  className={`touch-target min-h-[68px] py-2 px-2 rounded-2xl border-3 flex flex-col items-center justify-center gap-1 font-black transition-all ${
                    isActive
                      ? 'bg-a11y-primary text-a11y-primaryText border-a11y-border shadow-md scale-[1.02]'
                      : 'bg-a11y-bg text-a11y-text border-transparent opacity-80'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm leading-none tracking-tight">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // =========================================================================
  // INTERFAZ PARA ORDENADOR (PC): Cabecera rediseñada en 2 filas limpias
  // =========================================================================
  return (
    <header
      className="w-full border-b-4 border-a11y-border bg-a11y-card shadow-md"
      role="banner"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4">
        {/* FILA 1: Identidad de la App (Izquierda) + Barra de Herramientas y Perfil (Derecha) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b-2 border-a11y-border/40">
          {/* Identidad + Detector PC/Móvil + Estado API */}
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl bg-a11y-primary text-a11y-primaryText flex items-center justify-center font-black text-2xl border-2 border-a11y-border shadow-sm shrink-0"
              aria-hidden="true"
            >
              IA
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-wide text-a11y-text">
                  Asistente Adaptado Multimodal
                </h1>
                <button
                  onClick={toggleDeviceMode}
                  className="px-2.5 py-1 rounded-lg border border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Haz clic para previsualizar el diseño de Teléfono Móvil"
                >
                  <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Modo Ordenador (Cambiar a Móvil)</span>
                </button>
              </div>
              <p className="text-xs font-bold opacity-85 text-a11y-text mt-0.5">
                WCAG 2.2 Nivel AAA • Norma UNE 153101:2018 EX • Herramienta ATECA • ARASAAC
              </p>
            </div>
          </div>

          {/* Controles del Sistema: Perfil Activo + Estado IA + Ajustes + Dev */}
          <div className="flex items-center gap-3">
            {/* Botón destacado de Perfil de Apoyo */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="touch-target min-h-[54px] px-4 py-2 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-sm flex items-center gap-2.5 transition-colors"
              aria-label={`Perfil activo: ${userProfile.categoryLabel}, nivel ${userProfile.levelLabel}. Pulsar para cambiar perfil (Tecla P)`}
              title="Cambiar Perfil de Usuario (Atajo: Tecla P)"
            >
              <UserCheck className="w-5 h-5 text-a11y-primary shrink-0" aria-hidden="true" />
              <div className="text-left leading-tight">
                <span className="block text-[11px] uppercase opacity-80">Perfil Activo (Tecla P)</span>
                <span className="block text-sm font-black">{userProfile.shortTitle}</span>
              </div>
            </button>

            {/* Estado de la Clave API */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`touch-target min-h-[54px] px-3.5 py-2 rounded-2xl border-2 text-xs font-black flex items-center gap-2 transition-colors ${
                hasApiKey
                  ? 'border-green-500 bg-green-950/30 text-green-300 hover:bg-green-950/50'
                  : 'border-yellow-400 bg-yellow-950/40 text-yellow-200 animate-pulse'
              }`}
              aria-label={
                hasApiKey
                  ? 'IA Gemini conectada. Pulsar para abrir ajustes'
                  : 'Falta configurar Clave API. Pulsar para abrir ajustes'
              }
            >
              {hasApiKey ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
                  <span>IA Conectada</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" aria-hidden="true" />
                  <span>Configurar API Key</span>
                </>
              )}
            </button>

            {/* Botón de Ajustes */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="touch-target min-h-[54px] px-4 py-2 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-sm flex items-center gap-2 transition-colors"
              aria-label="Abrir ajustes de accesibilidad, voz y código QR móvil (Tecla S)"
              title="Ajustes (Atajo: Tecla S)"
            >
              <SettingsIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Ajustes</span>
            </button>

            {/* Botón secundario Consola Dev */}
            <button
              onClick={() => setIsDevConsoleOpen(!isDevConsoleOpen)}
              className={`touch-target min-h-[54px] px-3.5 py-2 rounded-2xl border-2 font-black text-xs flex items-center gap-1.5 transition-colors ${
                isDevConsoleOpen
                  ? 'bg-cyan-400 text-black border-cyan-200 shadow-md'
                  : 'border-cyan-500/80 bg-zinc-950 text-cyan-400 hover:bg-cyan-400 hover:text-black'
              }`}
              aria-label="Abrir o cerrar consola para desarrolladores (Tecla D)"
              title="Consola para Desarrolladores (Atajo: Tecla D)"
            >
              <Terminal className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Dev</span>
            </button>
          </div>
        </div>

        {/* FILA 2: Pestañas Simétricas de los 3 Modos de Asistencia (Sin solapamientos) */}
        <nav
          aria-label="Selector de Modo de Asistencia"
          className="grid grid-cols-3 gap-4"
        >
          {navItems.map((item) => {
            const isActive = mode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => setMode(item.mode)}
                aria-pressed={isActive}
                aria-label={`${item.title}: ${item.subtitle}. Atajo tecla ${item.shortcut}`}
                className={`touch-target min-h-[72px] px-5 py-3 rounded-2xl border-4 text-left flex items-center gap-4 transition-all ${
                  isActive
                    ? 'bg-a11y-primary text-a11y-primaryText border-a11y-border shadow-md ring-2 ring-a11y-focus'
                    : 'bg-a11y-bg text-a11y-text border-a11y-border/80 opacity-85 hover:opacity-100 hover:bg-a11y-card'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl border-2 shrink-0 ${
                    isActive
                      ? 'border-current bg-black/10'
                      : 'border-a11y-border bg-a11y-card'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-black leading-tight truncate">
                    {item.title}
                  </div>
                  <div className="text-xs font-bold opacity-85 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
