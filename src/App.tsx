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
import { LASALLE_LOGO_BASE64 } from './data/lasalleLogoData';

// Nombres del equipo: el alumnado es menor de edad, así que solo deben añadirse
// con el consentimiento de sus familias. Mientras la lista esté vacía, el pie
// muestra solo el nombre del equipo.
const TEAM_MEMBERS: string[] = [];
const TEAM_LABEL = 'Equipo de La Salle Bilbao · X Talento Challenge';

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
        className="flex-1 flex flex-col items-center justify-start w-full outline-none"
        role="main"
      >
        {mode === 'visual' && <VisualMode />}
        {mode === 'cognitive' && <CognitiveMode />}
        {mode === 'auditory' && <AuditoryMode />}
      </main>

      {/* Pie de página: centro, equipo y avisos */}
      <footer
        className={`w-full border-t-2 border-a11y-border bg-a11y-card px-4 py-5 ${
          isMobile ? 'pb-28' : ''
        }`}
        role="contentinfo"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-4 text-a11y-text">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#002F6C] shrink-0">
              <img
                src={LASALLE_LOGO_BASE64}
                alt="La Salle"
                className="h-7 w-auto object-contain"
              />
              <span className="text-white font-bold text-sm">Bilbao</span>
            </div>
            {TEAM_MEMBERS.length > 0 ? (
              <ul className="flex flex-wrap gap-x-3 text-sm" aria-label="Autores del proyecto">
                {TEAM_MEMBERS.map((member) => (
                  <li key={member}>{member}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-bold">{TEAM_LABEL}</p>
            )}
          </div>
          <p className="text-sm opacity-80 max-w-md text-center md:text-right">
            Prototipo en pruebas. Sigue las pautas de lectura fácil (UNE 153101:2018 EX) y de
            accesibilidad WCAG 2.2. Pictogramas de ARASAAC. Usa Google Gemini.
          </p>
        </div>
      </footer>

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
