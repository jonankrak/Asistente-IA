import React from 'react';
import {
  Eye,
  BookOpen,
  MessageSquare,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  UserCheck
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { AssistanceMode } from '../types';

export const Header: React.FC = () => {
  const {
    mode,
    setMode,
    userProfile,
    setIsProfileModalOpen,
    hasApiKey,
    setIsSettingsOpen,
    isDevConsoleOpen,
    setIsDevConsoleOpen
  } = useAccessibility();

  const navItems: { mode: AssistanceMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    {
      mode: 'visual',
      label: 'Visual (Ojos)',
      icon: <Eye className="w-8 h-8" aria-hidden="true" />,
      shortcut: '1'
    },
    {
      mode: 'cognitive',
      label: 'Cognitivo (Lectura Fácil / Pictos)',
      icon: <BookOpen className="w-8 h-8" aria-hidden="true" />,
      shortcut: '2'
    },
    {
      mode: 'auditory',
      label: 'Auditivo / Habla (CAA)',
      icon: <MessageSquare className="w-8 h-8" aria-hidden="true" />,
      shortcut: '3'
    }
  ];

  return (
    <header
      className="w-full border-b-4 border-a11y-border bg-a11y-card px-4 py-3"
      role="banner"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Identidad de la App */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl bg-a11y-primary text-a11y-primaryText flex items-center justify-center font-black text-2xl border-2 border-a11y-border"
              aria-hidden="true"
            >
              IA
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-wide text-a11y-text">
                Asistente Adaptado
              </h1>
              <p className="text-xs md:text-sm opacity-90 text-a11y-text font-bold">
                Perfil activo: <span className="underline">{userProfile.shortTitle}</span>
              </p>
            </div>
          </div>

          {/* Botones de Perfil, Ajustes y Consola Dev para Móvil */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="touch-target px-3 py-2 rounded-xl border-2 border-a11y-border bg-a11y-primary text-a11y-primaryText font-black text-xs flex items-center gap-1.5"
              aria-label={`Cambiar perfil de usuario. Actual: ${userProfile.shortTitle} (Tecla P)`}
            >
              <UserCheck className="w-5 h-5" aria-hidden="true" />
              <span>Perfil</span>
            </button>
            <button
              onClick={() => setIsDevConsoleOpen(!isDevConsoleOpen)}
              className={`touch-target p-3 rounded-xl border-2 transition-colors ${
                isDevConsoleOpen
                  ? 'bg-cyan-500 text-black border-cyan-300'
                  : 'border-cyan-500/70 bg-zinc-900 text-cyan-400 hover:bg-cyan-500 hover:text-black'
              }`}
              aria-label="Abrir o cerrar consola de desarrollador (Tecla D)"
              title="Consola de Desarrollador (Tecla D)"
            >
              <Terminal className="w-6 h-6" aria-hidden="true" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="touch-target p-3 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText transition-colors"
              aria-label="Abrir ajustes de accesibilidad y clave API (Tecla S)"
            >
              <SettingsIcon className="w-7 h-7" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Selector de Modos de Asistencia (Mínimo 64x64px en cada elemento táctil) */}
        <nav
          className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto"
          aria-label="Selector de Modo de Asistencia"
        >
          {navItems.map((item) => {
            const isActive = mode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => setMode(item.mode)}
                aria-pressed={isActive}
                aria-label={`${item.label}, atajo tecla ${item.shortcut}`}
                className={`touch-target px-4 py-3 rounded-2xl font-bold flex items-center gap-3 border-4 transition-all ${
                  isActive
                    ? 'bg-a11y-primary text-a11y-primaryText border-a11y-border shadow-lg ring-2 ring-a11y-focus scale-105'
                    : 'bg-a11y-bg text-a11y-text border-a11y-border hover:bg-a11y-card'
                }`}
              >
                {item.icon}
                <span className="text-base md:text-lg">{item.label}</span>
                <span className="sr-only">Atajo número {item.shortcut}</span>
              </button>
            );
          })}
        </nav>

        {/* Botón de Perfil, Ajustes, Consola Dev y Estado de API en Desktop */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="touch-target px-3.5 py-2.5 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-xs flex items-center gap-2 transition-colors"
            aria-label={`Cambiar perfil de usuario. Perfil activo: ${userProfile.categoryLabel} ${userProfile.levelLabel} (Tecla P)`}
            title="Cambiar Perfil de Usuario (Tecla P)"
          >
            <UserCheck className="w-5 h-5 text-a11y-primary" aria-hidden="true" />
            <span>Perfil: {userProfile.shortTitle}</span>
          </button>

          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold ${
              hasApiKey
                ? 'border-green-500 bg-green-950/30 text-green-300'
                : 'border-yellow-500 bg-yellow-950/30 text-yellow-300'
            }`}
            role="status"
            aria-live="polite"
          >
            {hasApiKey ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" aria-hidden="true" />
                <span>IA Lista</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                <span>Falta API Key</span>
              </>
            )}
          </div>

          <button
            onClick={() => setIsDevConsoleOpen(!isDevConsoleOpen)}
            className={`touch-target px-3.5 py-2.5 rounded-2xl border-2 font-bold flex items-center gap-2 transition-colors text-xs ${
              isDevConsoleOpen
                ? 'bg-cyan-400 text-black border-cyan-200 shadow-lg'
                : 'border-cyan-500/80 bg-zinc-950 text-cyan-400 hover:bg-cyan-400 hover:text-black'
            }`}
            aria-label="Abrir o cerrar consola exclusiva para desarrolladores (Tecla D)"
            title="Consola para Desarrolladores (Atajo: Tecla D)"
          >
            <Terminal className="w-5 h-5" aria-hidden="true" />
            <span>Consola Dev</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="touch-target px-4 py-3 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-bold flex items-center gap-2 transition-colors"
            aria-label="Abrir configuración de accesibilidad y clave API (Tecla S)"
          >
            <SettingsIcon className="w-6 h-6" aria-hidden="true" />
            <span className="text-sm">Ajustes</span>
          </button>
        </div>
      </div>
    </header>
  );
};
