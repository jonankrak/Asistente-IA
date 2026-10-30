import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Contrast, Type, Volume2, Vibrate, Check, HelpCircle, Smartphone, Copy } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { ContrastTheme, FontSize } from '../types';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
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
    return '';
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
    { id: 'white-black', label: 'Negro sobre Blanco', desc: 'Contraste alto fondo claro tradicional' },
    { id: 'default', label: 'Estándar Accesible', desc: 'Paleta moderna de alto contraste equilibrado' },
  ];

  const fontSizes: { id: FontSize; label: string }[] = [
    { id: 'normal', label: 'Normal (18px)' },
    { id: 'large', label: 'Grande (22px)' },
    { id: 'extralarge', label: 'Muy Grande (26px)' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-a11y-card border-4 border-a11y-border rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between border-b-4 border-a11y-border pb-4">
          <h2 id="settings-title" className="text-2xl md:text-3xl font-black text-a11y-text">
            Ajustes de Accesibilidad e IA
          </h2>
          <button
            ref={closeButtonRef}
            onClick={() => setIsSettingsOpen(false)}
            className="touch-target p-3 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText"
            aria-label="Cerrar ventana de ajustes (Escape)"
          >
            <X className="w-8 h-8" aria-hidden="true" />
          </button>
        </div>

        {/* 1. Clave API de Gemini */}
        <div className="space-y-3">
          <label htmlFor="api-key-input" className="block text-xl font-black text-a11y-text flex items-center gap-2">
            <Key className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
            <span>Clave API de Google Gemini (gemini-3.8-flash):</span>
          </label>
          <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row gap-3">
            <input
              id="api-key-input"
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Pega aquí tu VITE_GEMINI_API_KEY..."
              className="flex-1 p-3 rounded-2xl border-4 border-a11y-border bg-a11y-bg text-a11y-text font-bold text-lg"
            />
            <button
              type="submit"
              className="touch-target px-6 py-3 rounded-2xl bg-a11y-primary text-a11y-primaryText border-4 border-a11y-border font-black text-lg hover:brightness-105"
            >
              Guardar Clave
            </button>
          </form>
          {saveSuccess && (
            <p className="text-green-400 font-bold flex items-center gap-2" role="status">
              <Check className="w-5 h-5" /> ¡Clave API guardada en el dispositivo!
            </p>
          )}
          <p className="text-sm opacity-80">
            También puedes definirla en el archivo <code>.env</code> como <code>VITE_GEMINI_API_KEY=tu_clave</code>.
          </p>

          {/* Enlace rápido y Código QR para abrir en el teléfono con la clave ya configurada */}
          <div className="pt-2 border-t-2 border-a11y-border space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const rawBase = (githubPagesUrl.trim() || (window.location.origin + window.location.pathname)).replace(/#.*$/, '');
                  const cleanKey = (inputKey || apiKey).trim();
                  const mobileUrl = cleanKey ? `${rawBase}#key=${encodeURIComponent(cleanKey)}` : rawBase;
                  navigator.clipboard.writeText(mobileUrl);
                  setCopiedMobileLink(true);
                  announce('Enlace para teléfono copiado al portapapeles', 'polite');
                  setTimeout(() => setCopiedMobileLink(false), 3000);
                }}
                className="touch-target px-4 py-2.5 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-sm flex items-center gap-2"
              >
                <Copy className="w-5 h-5" aria-hidden="true" />
                <span>{copiedMobileLink ? '¡Enlace copiado!' : 'Copiar enlace con mi Clave para el Móvil'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMobileQr((prev) => !prev)}
                className="touch-target px-4 py-2.5 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-sm flex items-center gap-2"
              >
                <Smartphone className="w-5 h-5" aria-hidden="true" />
                <span>{showMobileQr ? 'Ocultar Código QR' : 'Ver Código QR para el Teléfono'}</span>
              </button>
            </div>

            {showMobileQr && (
              <div className="p-4 rounded-2xl border-2 border-a11y-border bg-white text-black space-y-3">
                <div>
                  <label htmlFor="gh-pages-url" className="block font-black text-sm mb-1">
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
                    placeholder="https://tu-usuario.github.io/tu-repositorio/"
                    className="w-full p-2.5 rounded-xl border-2 border-black bg-gray-100 text-black font-bold text-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      (githubPagesUrl.trim() || (window.location.origin + window.location.pathname)).replace(/#.*$/, '') +
                        ((inputKey || apiKey).trim() ? `#key=${encodeURIComponent((inputKey || apiKey).trim())}` : '')
                    )}`}
                    alt="Código QR para abrir la aplicación en el teléfono con la clave API configurada"
                    className="w-40 h-40 rounded-xl border-2 border-black shrink-0"
                  />
                  <div className="space-y-1 text-sm">
                    <p className="font-black text-base">📱 Escanea con la cámara de tu teléfono</p>
                    <p className="font-semibold">
                      Pega arriba tu enlace de <strong>GitHub Pages</strong> y escanea este QR con el móvil: abrirá la app en tu teléfono y guardará automáticamente tu clave API sin tener que escribirla.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Temas de Alto Contraste (WCAG 2.2 AAA) */}
        <div className="space-y-3">
          <span className="block text-xl font-black text-a11y-text flex items-center gap-2">
            <Contrast className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
            <span>Tema de Alto Contraste:</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Temas de alto contraste">
            {themes.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={contrastTheme === t.id}
                onClick={() => setContrastTheme(t.id)}
                className={`touch-target p-4 rounded-2xl border-4 text-left flex flex-col justify-center transition-all ${
                  contrastTheme === t.id
                    ? 'border-a11y-focus ring-4 ring-a11y-focus bg-a11y-primary text-a11y-primaryText font-black'
                    : 'border-a11y-border bg-a11y-bg text-a11y-text font-bold'
                }`}
              >
                <span className="text-lg">{t.label}</span>
                <span className="text-xs opacity-85 mt-1">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Tamaño de Tipografía Accesible */}
        <div className="space-y-3">
          <span className="block text-xl font-black text-a11y-text flex items-center gap-2">
            <Type className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
            <span>Tamaño de Texto:</span>
          </span>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Tamaño del texto">
            {fontSizes.map((fs) => (
              <button
                key={fs.id}
                role="radio"
                aria-checked={fontSize === fs.id}
                onClick={() => setFontSize(fs.id)}
                className={`touch-target px-5 py-3 rounded-2xl border-4 font-black transition-all ${
                  fontSize === fs.id
                    ? 'border-a11y-focus ring-4 ring-a11y-focus bg-a11y-primary text-a11y-primaryText'
                    : 'border-a11y-border bg-a11y-bg text-a11y-text'
                }`}
              >
                {fs.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Velocidad de Voz (TTS) */}
        <div className="space-y-3">
          <label htmlFor="speech-rate-slider" className="block text-xl font-black text-a11y-text flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
            <span>Velocidad de Lectura en Voz Alta: {speechRate}x</span>
          </label>
          <input
            id="speech-rate-slider"
            type="range"
            min="0.6"
            max="1.6"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full h-4 bg-a11y-bg border-2 border-a11y-border rounded-lg cursor-pointer"
            aria-valuemin={0.6}
            aria-valuemax={1.6}
            aria-valuenow={speechRate}
            aria-valuetext={`${speechRate} veces la velocidad normal`}
          />
          <div className="flex justify-between text-xs font-bold opacity-80">
            <span>0.6x (Lenta)</span>
            <span>1.0x (Normal)</span>
            <span>1.6x (Rápida)</span>
          </div>
        </div>

        {/* 5. Respuesta Háptica (Vibración) */}
        <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg">
          <div className="flex items-center gap-3">
            <Vibrate className="w-7 h-7 text-a11y-primary" aria-hidden="true" />
            <div>
              <span className="block text-lg font-black text-a11y-text">Vibración Háptica</span>
              <span className="text-xs opacity-80">Confirmación táctil en pulsaciones y avisos</span>
            </div>
          </div>
          <button
            onClick={() => setHapticEnabled(!hapticEnabled)}
            className={`touch-target px-5 py-2 rounded-xl border-2 font-black ${
              hapticEnabled
                ? 'bg-green-500 text-black border-black'
                : 'bg-gray-700 text-white border-gray-500'
            }`}
            aria-label={`Vibración táctil: actualmente ${hapticEnabled ? 'activada' : 'desactivada'}`}
          >
            {hapticEnabled ? 'Activada' : 'Desactivada'}
          </button>
        </div>

        {/* 6. Atajos de Teclado Informativos */}
        <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-sm">
          <p className="font-black text-base flex items-center gap-2 mb-2 text-a11y-primary">
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
            Atajos de Teclado Disponibles:
          </p>
          <ul className="list-disc list-inside space-y-1 opacity-90">
            <li><strong>Barra Espaciadora:</strong> Tocar botón principal / Describir escena</li>
            <li><strong>Tecla 1:</strong> Activar Modo Visual</li>
            <li><strong>Tecla 2:</strong> Activar Modo Cognitivo</li>
            <li><strong>Tecla 3:</strong> Activar Modo Auditivo</li>
            <li><strong>Tecla S:</strong> Abrir o cerrar estos Ajustes</li>
            <li><strong>Escape:</strong> Cerrar modal o cancelar lectura</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
