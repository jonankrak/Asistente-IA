import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Key,
  Contrast,
  Type,
  Volume2,
  Vibrate,
  Check,
  HelpCircle,
  Smartphone,
  Copy,
  Sliders,
  UserCheck,
  Lock,
  Unlock,
  BookOpen,
  ListChecks
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { ContrastTheme, FontSize } from '../types';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    userProfile,
    setIsProfileModalOpen,
    isProfileControlEnabled,
    setIsProfileControlEnabled,
    isColorProfileControlled,
    setIsColorProfileControlled,
    cognitiveFormat,
    setCognitiveFormat,
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
    announce
  } = useAccessibility();

  const [inputKey, setInputKey] = useState<string>(apiKey);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedMobileLink, setCopiedMobileLink] = useState<boolean>(false);
  const [showMobileQr, setShowMobileQr] = useState<boolean>(false);
  const [githubPagesUrl, setGithubPagesUrl] = useState<string>(() => {
    const savedUrl = localStorage.getItem('a11y_github_pages_url') || '';
    if (savedUrl) return savedUrl;
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
      return window.location.origin + window.location.pathname;
    }
    return 'https://jonankrak.github.io/Asistente-IA/';
  });
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (isSettingsOpen) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(inputKey.trim());
    setSaveSuccess(true);
    announce('Clave API guardada correctamente', 'polite');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const themes: { id: ContrastTheme; label: string; desc: string }[] = [
    { id: 'yellow-black', label: 'Amarillo sobre Negro', desc: 'Máximo contraste (>19:1) para baja visión' },
    { id: 'dark-high', label: 'Blanco sobre Negro', desc: 'Alto contraste oscuro sin fatiga visual' },
    { id: 'white-black', label: 'Negro sobre Blanco', desc: 'Contraste alto sobre fondo claro' },
    { id: 'default', label: 'Azul Suave Accesible', desc: 'Baja estimulación sensorial (ideal TEA/TDAH)' }
  ];

  const fontSizes: { id: FontSize; label: string }[] = [
    { id: 'normal', label: 'Normal' },
    { id: 'large', label: 'Grande' },
    { id: 'extralarge', label: 'Muy Grande' }
  ];

  const themeLabels: Record<ContrastTheme, string> = {
    'yellow-black': 'Amarillo / Negro',
    'dark-high': 'Blanco / Negro',
    'white-black': 'Negro / Blanco',
    default: 'Azul Suave'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain"
    >
      <div className="w-full max-w-2xl max-h-[95dvh] overflow-y-auto bg-a11y-card border-4 border-a11y-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 shadow-2xl my-auto">
        {/* Encabezado Fijo del Modal */}
        <div className="sticky -top-4 z-10 bg-a11y-card flex items-center justify-between border-b-4 border-a11y-border pb-3 pt-1">
          <h2 id="settings-title" className="text-xl sm:text-2xl md:text-3xl font-black text-a11y-text">
            Ajustes de Accesibilidad e IA
          </h2>
          <button
            ref={closeButtonRef}
            onClick={() => setIsSettingsOpen(false)}
            className="touch-target p-2.5 sm:p-3 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText shrink-0"
            aria-label="Cerrar ventana de ajustes (Escape)"
          >
            <X className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
          </button>
        </div>

        {/* =====================================================================
            SECCIÓN 1: CONTROL AUTOMÁTICO POR PERFIL vs AJUSTE MANUAL
           ===================================================================== */}
        <div
          className={`p-4 sm:p-5 rounded-3xl border-4 space-y-4 transition-all ${
            isProfileControlEnabled
              ? 'border-a11y-primary bg-a11y-bg'
              : 'border-amber-400 bg-amber-950/20'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              {isProfileControlEnabled ? (
                <Lock className="w-8 h-8 text-a11y-primary shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <Unlock className="w-8 h-8 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <h3 className="text-lg sm:text-xl font-black text-a11y-text">
                  {isProfileControlEnabled
                    ? `Control Automático por Perfil: ACTIVO (${userProfile.shortTitle})`
                    : 'Modo de Ajuste Manual: ACTIVO'}
                </h3>
                <p className="text-xs sm:text-sm font-bold opacity-85 text-a11y-text mt-0.5">
                  {isProfileControlEnabled
                    ? 'El perfil seleccionado configura automáticamente todos los parámetros visuales, auditivos y de IA.'
                    : 'El control por perfil está apagado. Puedes personalizar manualmente cada parámetro abajo.'}
                </p>
              </div>
            </div>

            {/* Botón Interruptor Principal: Apagar / Encender Control por Perfil */}
            <button
              type="button"
              onClick={() => setIsProfileControlEnabled(!isProfileControlEnabled)}
              aria-pressed={!isProfileControlEnabled}
              className={`touch-target px-4 py-3 rounded-2xl border-3 font-black text-sm flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95 ${
                isProfileControlEnabled
                  ? 'bg-amber-400 text-black border-black hover:brightness-105'
                  : 'bg-green-500 text-black border-black hover:brightness-105'
              }`}
            >
              <Sliders className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>
                {isProfileControlEnabled
                  ? 'Apagar y Usar Ajuste Manual'
                  : 'Reactivar Control por Perfil'}
              </span>
            </button>
          </div>

          {/* Resumen de los parámetros gobernados por el perfil actual */}
          {isProfileControlEnabled && (
            <div className="p-3.5 rounded-2xl border-2 border-a11y-border/60 bg-a11y-card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-a11y-primary">
                  Parámetros aplicados por {userProfile.categoryLabel} ({userProfile.levelLabel}):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText text-xs font-black flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Cambiar Perfil</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                <div className="p-2 rounded-xl bg-a11y-bg border border-a11y-border/40">
                  <span className="block opacity-75">Formato Cognitivo:</span>
                  <strong className="text-a11y-primary">
                    {cognitiveFormat === 'pictograms'
                      ? 'Pictogramas ARASAAC'
                      : cognitiveFormat === 'full-document'
                      ? 'Documento Completo PDF'
                      : 'Lectura Fácil UNE'}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-a11y-bg border border-a11y-border/40">
                  <span className="block opacity-75">Tema de Contraste:</span>
                  <strong className="text-a11y-primary">{themeLabels[contrastTheme]}</strong>
                </div>
                <div className="p-2 rounded-xl bg-a11y-bg border border-a11y-border/40">
                  <span className="block opacity-75">Tamaño y Dislexia:</span>
                  <strong className="text-a11y-primary">
                    {fontSize === 'extralarge' ? 'Muy Grande' : fontSize === 'large' ? 'Grande' : 'Normal'}
                    {dyslexiaFriendly ? ' + Dislexia' : ''}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-a11y-bg border border-a11y-border/40">
                  <span className="block opacity-75">Voz y Frases:</span>
                  <strong className="text-a11y-primary">
                    {speechRate}x • Máx. {maxWordsPerSentence} pal.
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            SECCIÓN 2: CLAVE API DE GEMINI + CÓDIGO QR MÓVIL (Siempre disponible)
           ===================================================================== */}
        <div className="space-y-3 p-4 rounded-3xl border-2 border-a11y-border bg-a11y-bg">
          <label
            htmlFor="api-key-input"
            className="block text-lg sm:text-xl font-black text-a11y-text flex items-center gap-2"
          >
            <Key className="w-6 h-6 text-a11y-primary shrink-0" aria-hidden="true" />
            <span>Clave API de Google Gemini:</span>
          </label>
          <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row gap-3">
            <input
              id="api-key-input"
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Pega aquí tu VITE_GEMINI_API_KEY..."
              className="flex-1 p-3 rounded-2xl border-4 border-a11y-border bg-a11y-card text-a11y-text font-bold text-base sm:text-lg"
            />
            <button
              type="submit"
              className="touch-target px-6 py-3 rounded-2xl bg-a11y-primary text-a11y-primaryText border-4 border-a11y-border font-black text-base sm:text-lg hover:brightness-105"
            >
              Guardar Clave
            </button>
          </form>
          {saveSuccess && (
            <p className="text-green-400 font-bold flex items-center gap-2" role="status">
              <Check className="w-5 h-5" /> ¡Clave API guardada en el dispositivo!
            </p>
          )}

          {/* Enlace rápido y Código QR para abrir en el teléfono con la clave ya configurada */}
          <div className="pt-2 border-t border-a11y-border/50 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const rawBase = (
                    githubPagesUrl.trim() || window.location.origin + window.location.pathname
                  ).replace(/#.*$/, '');
                  const cleanKey = (inputKey || apiKey).trim();
                  const mobileUrl = cleanKey
                    ? `${rawBase}#key=${encodeURIComponent(cleanKey)}`
                    : rawBase;
                  navigator.clipboard.writeText(mobileUrl);
                  setCopiedMobileLink(true);
                  announce('Enlace para teléfono copiado al portapapeles', 'polite');
                  setTimeout(() => setCopiedMobileLink(false), 3000);
                }}
                className="touch-target px-3.5 py-2 rounded-xl border-2 border-a11y-border bg-a11y-card text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-xs sm:text-sm flex items-center gap-2"
              >
                <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{copiedMobileLink ? '¡Enlace copiado!' : 'Copiar enlace con Clave'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMobileQr((prev) => !prev)}
                className="touch-target px-3.5 py-2 rounded-xl border-2 border-a11y-border bg-a11y-card text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-xs sm:text-sm flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{showMobileQr ? 'Ocultar QR Móvil' : 'Código QR para Móvil'}</span>
              </button>
            </div>

            {showMobileQr && (
              <div className="p-4 rounded-2xl border-2 border-a11y-border bg-white text-black space-y-3">
                <div>
                  <label htmlFor="gh-pages-url" className="block font-black text-xs sm:text-sm mb-1">
                    🌐 Dirección de tu web en GitHub Pages:
                  </label>
                  <input
                    id="gh-pages-url"
                    type="url"
                    value={githubPagesUrl}
                    onChange={(e) => {
                      setGithubPagesUrl(e.target.value);
                      localStorage.setItem('a11y_github_pages_url', e.target.value.trim());
                    }}
                    placeholder="https://jonankrak.github.io/Asistente-IA/"
                    className="w-full p-2.5 rounded-xl border-2 border-black bg-gray-100 text-black font-bold text-xs sm:text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      (
                        githubPagesUrl.trim() || window.location.origin + window.location.pathname
                      ).replace(/#.*$/, '') +
                        ((inputKey || apiKey).trim()
                          ? `#key=${encodeURIComponent((inputKey || apiKey).trim())}`
                          : '')
                    )}`}
                    alt="Código QR para abrir la aplicación en el teléfono con la clave API configurada"
                    className="w-36 h-36 rounded-xl border-2 border-black shrink-0"
                  />
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p className="font-black text-sm sm:text-base">
                      📱 Escanea con la cámara de tu teléfono
                    </p>
                    <p className="font-semibold">
                      Al escanear este QR desde tu teléfono se abrirá la app en Chrome Android y se
                      guardará automáticamente tu clave API sin tener que escribirla.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =====================================================================
            SECCIÓN 3: CONTROL MANUAL SEPARADO PARA EL CAMBIO DE COLOR
           ===================================================================== */}
        <div
          className={`p-4 sm:p-5 rounded-3xl border-4 space-y-4 transition-all ${
            isColorProfileControlled
              ? 'border-a11y-border bg-a11y-bg'
              : 'border-cyan-400 bg-cyan-950/20'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Contrast className="w-8 h-8 text-a11y-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-lg sm:text-xl font-black text-a11y-text">
                  {isColorProfileControlled
                    ? `Cambio de Color: Fijado por Perfil (${themeLabels[contrastTheme]})`
                    : 'Cambio de Color Manual: ACTIVO'}
                </h3>
                <p className="text-xs sm:text-sm font-bold opacity-85 text-a11y-text mt-0.5">
                  {isColorProfileControlled
                    ? 'El color y contraste están fijados por el perfil. Pulsa el botón separado para cambiar el color manualmente.'
                    : 'Puedes escoger manualmente cualquier tema de color sin alterar el resto del perfil.'}
                </p>
              </div>
            </div>

            {/* Botón de Ajuste Separado Exclusivo para el Cambio de Color */}
            <button
              type="button"
              onClick={() => setIsColorProfileControlled(!isColorProfileControlled)}
              aria-pressed={!isColorProfileControlled}
              className={`touch-target px-4 py-3 rounded-2xl border-3 font-black text-sm flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95 ${
                isColorProfileControlled
                  ? 'bg-cyan-400 text-black border-black hover:brightness-105'
                  : 'bg-green-500 text-black border-black hover:brightness-105'
              }`}
            >
              <Contrast className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>
                {isColorProfileControlled
                  ? 'Activar Cambio de Color Manual'
                  : 'Volver a Color del Perfil'}
              </span>
            </button>
          </div>

          <fieldset
            disabled={isColorProfileControlled}
            className={`transition-opacity ${
              isColorProfileControlled ? 'opacity-55 pointer-events-none select-none' : 'opacity-100'
            }`}
          >
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              role="radiogroup"
              aria-label="Temas de alto contraste"
            >
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={contrastTheme === t.id}
                  onClick={() => setContrastTheme(t.id)}
                  className={`touch-target p-3.5 rounded-2xl border-4 text-left flex flex-col justify-center transition-all ${
                    contrastTheme === t.id
                      ? 'border-a11y-focus ring-2 ring-a11y-focus bg-a11y-primary text-a11y-primaryText font-black'
                      : 'border-a11y-border bg-a11y-card text-a11y-text font-bold'
                  }`}
                >
                  <span className="text-base sm:text-lg">{t.label}</span>
                  <span className="text-xs opacity-85 mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* =====================================================================
            SECCIÓN 4: PARÁMETROS FIJADOS POR EL PERFIL (Texto Fácil / Pictogramas, Letra, Voz...)
           ===================================================================== */}
        <div className="relative space-y-6">
          {isProfileControlEnabled && (
            <div className="p-3.5 rounded-2xl border-2 border-amber-400 bg-amber-950/40 text-amber-100 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-bold">
              <span>
                🔒 Pictogramas / Texto Fácil, tipografía y voz están fijados por el perfil{' '}
                <strong>{userProfile.shortTitle}</strong>.
              </span>
              <button
                type="button"
                onClick={() => setIsProfileControlEnabled(false)}
                className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-black text-xs uppercase"
              >
                Desbloquear Ajuste Manual
              </button>
            </div>
          )}

          <fieldset
            disabled={isProfileControlEnabled}
            className={`space-y-6 transition-opacity ${
              isProfileControlEnabled ? 'opacity-55 pointer-events-none select-none' : 'opacity-100'
            }`}
          >
            {/* 4.1 Selección de Texto Fácil, Pictogramas ARASAAC o Documento Completo IA para PDF */}
            <div className="space-y-2.5 p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg">
              <span className="block text-lg sm:text-xl font-black text-a11y-text flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
                <span>Modo Cognitivo Fijado (Texto Fácil, Pictogramas o Documento PDF):</span>
              </span>
              <p className="text-xs sm:text-sm font-bold opacity-85 text-a11y-text">
                Escoge si el Modo Cognitivo genera pasos interactivos en Lectura Fácil, Pictogramas ARASAAC o un Documento Completo con todo el texto para extraer en PDF.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCognitiveFormat('easy-read')}
                  className={`touch-target p-3.5 rounded-2xl border-4 font-black text-sm sm:text-base ${
                    cognitiveFormat === 'easy-read'
                      ? 'bg-a11y-primary text-a11y-primaryText border-a11y-border'
                      : 'bg-a11y-card text-a11y-text border-a11y-border'
                  }`}
                >
                  1. Texto Fácil (UNE + ATECA)
                </button>
                <button
                  type="button"
                  onClick={() => setCognitiveFormat('pictograms')}
                  className={`touch-target p-3.5 rounded-2xl border-4 font-black text-sm sm:text-base ${
                    cognitiveFormat === 'pictograms'
                      ? 'bg-a11y-primary text-a11y-primaryText border-a11y-border'
                      : 'bg-a11y-card text-a11y-text border-a11y-border'
                  }`}
                >
                  2. Pictogramas ARASAAC
                </button>
                <button
                  type="button"
                  onClick={() => setCognitiveFormat('full-document')}
                  className={`touch-target p-3.5 rounded-2xl border-4 font-black text-sm sm:text-base ${
                    cognitiveFormat === 'full-document'
                      ? 'bg-a11y-primary text-a11y-primaryText border-a11y-border'
                      : 'bg-a11y-card text-a11y-text border-a11y-border'
                  }`}
                >
                  3. Texto Completo IA (PDF)
                </button>
              </div>
            </div>

            {/* 4.2 Tamaño de Tipografía y Espaciado Dislexia */}
            <div className="space-y-3">
              <span className="block text-lg sm:text-xl font-black text-a11y-text flex items-center gap-2">
                <Type className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
                <span>Tamaño de Texto y Tipografía:</span>
              </span>
              <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Tamaño del texto">
                {fontSizes.map((fs) => (
                  <button
                    key={fs.id}
                    type="button"
                    role="radio"
                    aria-checked={fontSize === fs.id}
                    onClick={() => setFontSize(fs.id)}
                    className={`touch-target px-3 py-3 rounded-2xl border-4 font-black text-sm sm:text-base transition-all ${
                      fontSize === fs.id
                        ? 'border-a11y-focus bg-a11y-primary text-a11y-primaryText'
                        : 'border-a11y-border bg-a11y-bg text-a11y-text'
                    }`}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>

              {/* Interruptor de Tipografía Especial Dislexia */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-a11y-border bg-a11y-bg">
                <div>
                  <span className="block text-base font-black text-a11y-text">
                    Espaciado y Fuente para Dislexia (WCAG 1.4.12)
                  </span>
                  <span className="text-xs opacity-80">
                    Amplía la separación entre letras, palabras y líneas para facilitar la lectura
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDyslexiaFriendly(!dyslexiaFriendly)}
                  className={`touch-target px-4 py-2 rounded-xl border-2 font-black text-sm ${
                    dyslexiaFriendly
                      ? 'bg-green-500 text-black border-black'
                      : 'bg-gray-700 text-white border-gray-500'
                  }`}
                >
                  {dyslexiaFriendly ? 'Activado' : 'Desactivado'}
                </button>
              </div>
            </div>

            {/* 3.4 Parámetros Cognitivos y de Atención (TDAH / UNE) */}
            <div className="space-y-3">
              <span className="block text-lg sm:text-xl font-black text-a11y-text flex items-center gap-2">
                <ListChecks className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
                <span>Estructura Cognitiva y Foco Atencional:</span>
              </span>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-a11y-border bg-a11y-bg">
                <div>
                  <span className="block text-base font-black text-a11y-text">
                    Modo Guiado Paso a Paso (Enfoque TDAH / DI)
                  </span>
                  <span className="text-xs opacity-80">
                    Destaca visualmente el paso actual para evitar distracciones y sobrecarga
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStepByStepFocus(!stepByStepFocus)}
                  className={`touch-target px-4 py-2 rounded-xl border-2 font-black text-sm ${
                    stepByStepFocus
                      ? 'bg-green-500 text-black border-black'
                      : 'bg-gray-700 text-white border-gray-500'
                  }`}
                >
                  {stepByStepFocus ? 'Activado' : 'Desactivado'}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl border-2 border-a11y-border bg-a11y-bg space-y-2">
                <label
                  htmlFor="max-words-slider"
                  className="block text-base font-black text-a11y-text"
                >
                  Límite de Palabras por Frase (Validador UNE/ATECA): {maxWordsPerSentence} palabras
                </label>
                <input
                  id="max-words-slider"
                  type="range"
                  min="4"
                  max="18"
                  step="1"
                  value={maxWordsPerSentence}
                  onChange={(e) => setMaxWordsPerSentence(parseInt(e.target.value, 10))}
                  className="w-full h-4 bg-a11y-card border-2 border-a11y-border rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs font-bold opacity-80">
                  <span>4 pal. (Nivel Inicial/Grave)</span>
                  <span>10 pal. (Moderado)</span>
                  <span>15+ pal. (Estándar UNE)</span>
                </div>
              </div>
            </div>

            {/* 3.5 Velocidad de Voz y Lectura Automática */}
            <div className="space-y-3">
              <label
                htmlFor="speech-rate-slider"
                className="block text-lg sm:text-xl font-black text-a11y-text flex items-center gap-2"
              >
                <Volume2 className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
                <span>Velocidad de Lectura en Voz Alta: {speechRate}x</span>
              </label>
              <input
                id="speech-rate-slider"
                type="range"
                min="0.6"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full h-4 bg-a11y-bg border-2 border-a11y-border rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs font-bold opacity-80">
                <span>0.6x (Pausada)</span>
                <span>1.0x (Normal)</span>
                <span>1.5x (Rápida)</span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-a11y-border bg-a11y-bg">
                <div>
                  <span className="block text-base font-black text-a11y-text">
                    Lectura Automática por Voz (Auto-Speak)
                  </span>
                  <span className="text-xs opacity-80">
                    Lee automáticamente en voz alta el resultado al terminar de simplificar
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`touch-target px-4 py-2 rounded-xl border-2 font-black text-sm ${
                    autoSpeak
                      ? 'bg-green-500 text-black border-black'
                      : 'bg-gray-700 text-white border-gray-500'
                  }`}
                >
                  {autoSpeak ? 'Activada' : 'Desactivada'}
                </button>
              </div>
            </div>

            {/* 3.6 Respuesta Háptica (Vibración) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-a11y-border bg-a11y-bg">
              <div className="flex items-center gap-3">
                <Vibrate className="w-7 h-7 text-a11y-primary shrink-0" aria-hidden="true" />
                <div>
                  <span className="block text-base font-black text-a11y-text">
                    Vibración Háptica
                  </span>
                  <span className="text-xs opacity-80">
                    Confirmación táctil al pulsar botones (desactivado en TEA por sensibilidad)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHapticEnabled(!hapticEnabled)}
                className={`touch-target px-4 py-2 rounded-xl border-2 font-black text-sm ${
                  hapticEnabled
                    ? 'bg-green-500 text-black border-black'
                    : 'bg-gray-700 text-white border-gray-500'
                }`}
              >
                {hapticEnabled ? 'Activada' : 'Desactivada'}
              </button>
            </div>
          </fieldset>
        </div>

        {/* 4. Atajos de Teclado Informativos */}
        <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-xs sm:text-sm">
          <p className="font-black text-sm sm:text-base flex items-center gap-2 mb-2 text-a11y-primary">
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
            Atajos de Teclado Disponibles:
          </p>
          <ul className="list-disc list-inside space-y-1 opacity-90">
            <li><strong>Barra Espaciadora:</strong> Tocar botón principal / Describir escena</li>
            <li><strong>Teclas 1, 2, 3:</strong> Cambiar entre Visual, Cognitivo y Habla CAA</li>
            <li><strong>Tecla P:</strong> Abrir Selector de Perfiles</li>
            <li><strong>Tecla S:</strong> Abrir o cerrar estos Ajustes</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
