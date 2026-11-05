import React from 'react';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { Header } from './components/Header';
import { CognitiveMode } from './components/CognitiveMode';
import { SettingsModal } from './components/SettingsModal';
import { ProfileSelectorModal } from './components/ProfileSelectorModal';
import { DevConsole } from './components/DevConsole';
import { A11yAnnouncer } from './components/A11yAnnouncer';
import { LASALLE_LOGO_BASE64 } from './data/lasalleLogoData';

const TEAM_MEMBERS = [
  'Ana Jaramillo Gómez',
  'Ane Santiago Isunza',
  'Anne Isabel Romero Zambrano',
  'Ander Seco Pérez',
  'Jon Andoni Bernal Larriba'
];

const MainContent: React.FC = () => {
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

      {/* Barra de cabecera para PC y Móvil */}
      <Header />

      {/* Contenido principal: Accesibilidad Cognitiva */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col items-center justify-start w-full outline-none"
        role="main"
      >
        <CognitiveMode />
      </main>

      {/* Pie de página institucional con Logo de La Salle Bilbao y Autores (visible en PC y Móvil) */}
      <footer
        className="w-full border-t-4 border-a11y-border bg-a11y-card px-4 py-6 text-center"
        role="contentinfo"
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          {/* Emblema Oficial La Salle Bilbao */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-6 py-3 rounded-2xl bg-[#002F6C] border-2 border-[#FACC15] shadow-lg">
            <img
              src={LASALLE_LOGO_BASE64}
              alt="Logotipo oficial de La Salle"
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <span className="hidden sm:inline-block h-8 w-0.5 bg-[#FACC15]/60" aria-hidden="true" />
            <span className="text-white font-black tracking-[0.22em] text-lg sm:text-xl uppercase">
              BILBAO
            </span>
          </div>

          {/* Nombres del Equipo en orden de cortesía social y alfabético */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-a11y-primary">
              Proyecto desarrollado por:
            </p>
            <ul
              className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
              aria-label="Autores del proyecto"
            >
              {TEAM_MEMBERS.map((member) => (
                <li
                  key={member}
                  className="px-3.5 py-1.5 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text font-black text-xs sm:text-sm shadow-sm"
                >
                  {member}
                </li>
              ))}
            </ul>
          </div>

          {/* Información técnica y normativa */}
          <div className="w-full pt-3 border-t border-a11y-border/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold opacity-80">
            <span>WCAG 2.2 Nivel AAA • Norma UNE 153101:2018 EX • Herramienta ATECA</span>
            <span>IA Multimodal Gemini • Pictogramas ARASAAC • La Salle Bilbao</span>
          </div>
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
