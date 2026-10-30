import React from 'react';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { Header } from './components/Header';
import { VisualMode } from './components/VisualMode';
import { CognitiveMode } from './components/CognitiveMode';
import { AuditoryMode } from './components/AuditoryMode';
import { SettingsModal } from './components/SettingsModal';
import { ProfileSelectorModal } from './components/ProfileSelectorModal';
import { DevConsole } from './components/DevConsole';
import { A11yAnnouncer } from './components/A11yAnnouncer';

const MainContent: React.FC = () => {
  const { mode, isMobile } = useAccessibility();

  return (
    <div className="min-h-screen flex flex-col bg-a11y-bg text-a11y-text transition-colors duration-200">
      {/* Enlace de salto accesible para usuarios de lector de pantalla y teclado */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-a11y-primary text-a11y-primaryText px-6 py-4 rounded-xl border-4 border-a11y-border font-black text-xl shadow-2xl"
      >
        Saltar al contenido principal
      </a>

      {/* Región de anuncios ARIA Live en vivo */}
      <A11yAnnouncer />

      {/* Barra de cabecera (PC) o Barra superior compacta + Barra inferior fija (Móvil) */}
      <Header />

      {/* Contenido principal según el modo seleccionado */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 flex flex-col items-center justify-start w-full outline-none ${
          isMobile ? 'pb-28' : ''
        }`}
        role="main"
      >
        {mode === 'visual' && <VisualMode />}
        {mode === 'cognitive' && <CognitiveMode />}
        {mode === 'auditory' && <AuditoryMode />}
      </main>

      {/* Pie de página informativo en modo Ordenador */}
      {!isMobile && (
        <footer className="w-full border-t-4 border-a11y-border bg-a11y-card p-4 text-center text-sm font-bold opacity-90">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Diseñado conforme a WCAG 2.2 Nivel AAA • Norma UNE 153101:2018 EX • ATECA</span>
            <span>IA Multimodal Gemini • Pictogramas ARASAAC • Web Speech API</span>
          </div>
        </footer>
      )}

      {/* Selector Inicial de Perfil Diagnóstico / Funcional */}
      <ProfileSelectorModal />

      {/* Modal de Configuración y Clave API */}
      <SettingsModal />

      {/* Consola para Desarrolladores en Tiempo Real */}
      <DevConsole />
    </div>
  );
};

export function App() {
  return (
    <AccessibilityProvider>
      <MainContent />
    </AccessibilityProvider>
  );
}

export default App;
