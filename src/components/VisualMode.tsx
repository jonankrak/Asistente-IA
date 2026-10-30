import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Mic, AlertCircle, RefreshCw, Eye, Radio, Upload } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useSpeech } from '../hooks/useSpeech';
import { useHaptics } from '../hooks/useHaptics';
import { useAccessibility } from '../context/AccessibilityContext';
import { aiService } from '../services/aiService';

export const VisualMode: React.FC = () => {
  const { announce, speechRate, hapticEnabled, hasApiKey, setIsSettingsOpen } = useAccessibility();
  const { triggerShort, triggerSuccess, triggerError, triggerListening } = useHaptics();

  const {
    videoRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera,
    captureFrame,
    toggleFacingMode,
    facingMode
  } = useCamera();

  const [visualState, setVisualState] = useState<'idle' | 'listening' | 'analyzing' | 'speaking'>('idle');
  const [description, setDescription] = useState<string>('');
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const countdownIntervalRef = useRef<any>(null);
  const autoSendTimeoutRef = useRef<any>(null);
  const capturedFrameRef = useRef<{ fullDataUrl: string; base64Data: string } | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hook de voz y reconocimiento
  const {
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useSpeech({
    rate: speechRate,
    onTranscriptChange: (text) => {
      latestTranscriptRef.current = text;
    }
  });

  // Iniciar la cámara trasera al entrar al modo visual
  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
      stopSpeaking();
      stopListening();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
    };
  }, []);

  // Notificar errores de cámara sin bloquear el uso con foto subida
  useEffect(() => {
    if (cameraError) {
      announce(`Aviso de cámara: ${cameraError}. Puedes subir una foto con el botón Subir Imagen.`, 'polite');
    }
  }, [cameraError, announce]);

  // Ejecutar análisis multimodal en Gemini
  const executeAnalysis = useCallback(async (base64Img: string, userQuery?: string) => {
    stopListening();
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
    setCountdown(null);

    if (!hasApiKey) {
      const keyError = 'Falta configurar la Clave API de Gemini. Pulsa en Ajustes arriba a la derecha.';
      setErrorMessage(keyError);
      announce(keyError, 'assertive');
      if (hapticEnabled) triggerError();
      speak(keyError);
      setVisualState('idle');
      return;
    }

    setErrorMessage(null);
    setVisualState('analyzing');
    const queryToUse = userQuery?.trim() || latestTranscriptRef.current.trim();
    const msg = queryToUse
      ? `Procesando pregunta: "${queryToUse}". Analizando escena...`
      : 'Analizando escena y detectando obstáculos...';
    announce(msg, 'assertive');

    try {
      const responseText = await aiService.describeVisualScene(base64Img, queryToUse || undefined);
      setDescription(responseText);
      setVisualState('speaking');
      if (hapticEnabled) triggerSuccess();

      announce(`Descripción: ${responseText}`, 'assertive');
      speak(responseText, speechRate, () => {
        setVisualState('idle');
      });
    } catch (err: any) {
      const errTxt = err.message || 'Error al comunicarse con la IA Gemini.';
      setErrorMessage(errTxt);
      setVisualState('idle');
      if (hapticEnabled) triggerError();
      announce(`Error: ${errTxt}`, 'assertive');
      speak(`Error al analizar la imagen: ${errTxt}`);
    }
  }, [hasApiKey, announce, hapticEnabled, triggerError, triggerSuccess, speak, speechRate, stopListening]);

  // Subir una imagen manualmente (ideal en PC sin cámara o para analizar fotos guardadas)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1024;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const fullDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const base64Data = fullDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
          capturedFrameRef.current = { fullDataUrl, base64Data };
          setCapturedThumbnail(fullDataUrl);
          setErrorMessage(null);
          executeAnalysis(base64Data, undefined);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Acción principal al tocar el botón gigante o pulsar Barra Espaciadora
  const handleMainButtonTrigger = useCallback(() => {
    if (visualState === 'analyzing') return;

    if (visualState === 'speaking') {
      stopSpeaking();
      setVisualState('idle');
      announce('Lectura detenida', 'polite');
      return;
    }

    if (visualState === 'listening') {
      // Enviar inmediatamente
      if (capturedFrameRef.current) {
        executeAnalysis(capturedFrameRef.current.base64Data, latestTranscriptRef.current);
      }
      return;
    }

    // 1. Vibración corta táctil
    if (hapticEnabled) triggerShort();
    setErrorMessage(null);
    setDescription('');
    latestTranscriptRef.current = '';

    // 2. Capturar fotograma de la cámara (o usar imagen subida previamente si no hay cámara activa)
    const frame = captureFrame() || capturedFrameRef.current;
    if (!frame) {
      const msg = 'Cámara no disponible. Selecciona una imagen con el botón Subir Foto o permite el acceso a la cámara.';
      setErrorMessage(msg);
      announce(msg, 'assertive');
      speak(msg);
      fileInputRef.current?.click();
      return;
    }

    capturedFrameRef.current = frame;
    setCapturedThumbnail(frame.fullDataUrl);
    setVisualState('listening');

    // 3. Feedback háptico y sonoro
    if (hapticEnabled) triggerListening();
    announce('Imagen capturada. Di tu pregunta o espera 3 segundos para descripción automática.', 'assertive');

    // Iniciar escucha por micrófono (si está disponible)
    startListening();

    // 4. Cuenta atrás garantizada de 3 segundos (independiente del micrófono)
    let timeLeft = 3;
    setCountdown(3);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) {
        setCountdown(timeLeft);
      } else {
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
      }
    }, 1000);

    if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
    autoSendTimeoutRef.current = setTimeout(() => {
      if (capturedFrameRef.current) {
        executeAnalysis(capturedFrameRef.current.base64Data, latestTranscriptRef.current);
      }
    }, 3200);
  }, [
    visualState,
    hapticEnabled,
    triggerShort,
    triggerListening,
    captureFrame,
    announce,
    speak,
    startListening,
    stopSpeaking,
    executeAnalysis
  ]);

  // Atajo de teclado: Barra espaciadora para el botón principal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleMainButtonTrigger();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMainButtonTrigger]);

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-between p-3 md:p-6 max-w-5xl mx-auto min-h-[calc(100vh-120px)]">
      {/* Barra superior de cámara y subida de imagen */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-3 mb-3">
        <div className="relative flex-1 w-full h-36 md:h-44 rounded-2xl overflow-hidden border-4 border-a11y-border bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
            aria-label="Transmisión en vivo de la cámara"
          />

          <div className="absolute top-2 left-2 bg-black/80 px-3 py-1 rounded-full border border-a11y-border text-xs font-bold text-a11y-text flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isCameraActive ? 'text-green-400 animate-pulse' : 'text-red-500'}`} aria-hidden="true" />
            <span>{isCameraActive ? `Cámara ${facingMode === 'environment' ? 'Trasera' : 'Frontal'} Activa` : 'Sin cámara activa'}</span>
          </div>

          {isCameraActive && (
            <button
              onClick={toggleFacingMode}
              className="absolute top-2 right-2 touch-target p-2 rounded-xl bg-black/80 border border-a11y-border text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText text-xs font-bold flex items-center gap-1"
              aria-label="Cambiar entre cámara trasera y delantera"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Girar</span>
            </button>
          )}

          {capturedThumbnail && (
            <div className="absolute bottom-2 right-2 w-16 h-16 rounded-lg overflow-hidden border-2 border-a11y-focus shadow-lg">
              <img src={capturedThumbnail} alt="Fotograma capturado" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Botón para subir foto desde el PC o móvil */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="touch-target w-full sm:w-auto sm:h-44 px-5 py-4 rounded-2xl border-4 border-a11y-border bg-a11y-card text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black flex sm:flex-col items-center justify-center gap-2 text-center"
          aria-label="Subir una foto desde el dispositivo para describirla"
        >
          <Upload className="w-8 h-8" aria-hidden="true" />
          <span className="text-base">Subir Foto</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Alerta de Error Accesible */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full max-w-2xl mb-4 p-4 rounded-2xl border-4 border-red-500 bg-red-950/40 text-red-200 flex items-start gap-3"
        >
          <AlertCircle className="w-7 h-7 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-bold text-base md:text-lg">{errorMessage}</p>
            {!hasApiKey && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-yellow-400 text-black font-black text-sm uppercase underline"
              >
                Abrir Ajustes y Configurar API Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* BOTÓN GIGANTE DEL MODO VISUAL (80% DEL ESPACIO DE INTERACCIÓN) */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-2">
        <button
          onClick={handleMainButtonTrigger}
          aria-label={
            visualState === 'idle'
              ? 'Tocar para describir entorno o hacer una pregunta con la cámara. Atajo: Barra Espaciadora.'
              : visualState === 'listening'
              ? `Escuchando pregunta. Enviando en ${countdown || 1} segundos. Toca para enviar ahora.`
              : visualState === 'analyzing'
              ? 'Analizando imagen con IA Gemini...'
              : 'Leyendo en voz alta. Tocar para detener.'
          }
          className={`w-full max-w-2xl min-h-[280px] md:min-h-[380px] rounded-3xl border-8 p-6 md:p-10 flex flex-col items-center justify-center gap-6 text-center cursor-pointer select-none transition-all duration-200 shadow-2xl ${
            visualState === 'listening'
              ? 'bg-yellow-400 text-black border-black pulsing-target ring-8 ring-cyan-400'
              : visualState === 'analyzing'
              ? 'bg-blue-600 text-white border-white animate-pulse'
              : visualState === 'speaking'
              ? 'bg-green-500 text-black border-black'
              : 'bg-a11y-primary text-a11y-primaryText border-a11y-border hover:brightness-105 active:scale-95'
          }`}
        >
          <div className="p-4 rounded-full bg-black/10 border-4 border-current">
            {visualState === 'listening' ? (
              <Mic className="w-20 h-20 md:w-24 md:h-24 animate-bounce" aria-hidden="true" />
            ) : visualState === 'analyzing' ? (
              <RefreshCw className="w-20 h-20 md:w-24 md:h-24 animate-spin" aria-hidden="true" />
            ) : visualState === 'speaking' ? (
              <Volume2 className="w-20 h-20 md:w-24 md:h-24" aria-hidden="true" />
            ) : (
              <Eye className="w-20 h-20 md:w-24 md:h-24" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-2">
            <span className="block text-2xl md:text-4xl font-black leading-tight">
              {visualState === 'idle' && 'TOCAR PARA DESCRIBIR O PREGUNTAR'}
              {visualState === 'listening' && (
                <>
                  ESCUCHANDO TU PREGUNTA...
                  <span className="block text-xl md:text-2xl mt-1">
                    (Analizando en {countdown !== null ? countdown : 1}s — Toca para enviar ya)
                  </span>
                </>
              )}
              {visualState === 'analyzing' && 'ANALIZANDO IMAGEN CON IA...'}
              {visualState === 'speaking' && 'LEYENDO RESPUESTA (TOCA PARA PARAR)'}
            </span>

            <span className="block text-base md:text-xl font-bold opacity-90">
              {visualState === 'idle' && 'Atajo: Pulsa la Barra Espaciadora'}
              {visualState === 'listening' && (transcript ? `"${transcript}"` : 'Habla ahora o espera para descripción general')}
              {visualState === 'analyzing' && 'Calculando posiciones de reloj y obstáculos...'}
              {visualState === 'speaking' && 'Audio activo. Pulsa para silenciar.'}
            </span>
          </div>
        </button>
      </div>

      {/* Región de Respuesta y Transcripción con aria-live */}
      <div
        className="w-full max-w-2xl mt-4 p-5 rounded-2xl border-4 border-a11y-border bg-a11y-card"
        role="region"
        aria-label="Resultado de la descripción visual"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg md:text-xl font-black flex items-center gap-2 text-a11y-text">
            <Volume2 className="w-6 h-6 text-a11y-primary" aria-hidden="true" />
            Descripción Accesible (Reloj y Distancias):
          </h2>
          {description && (
            <button
              onClick={() => speak(description, speechRate)}
              className="touch-target px-3 py-2 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-bold text-sm flex items-center gap-1"
              aria-label="Repetir lectura en voz alta"
            >
              <Volume2 className="w-5 h-5" aria-hidden="true" />
              <span>Repetir</span>
            </button>
          )}
        </div>

        <div
          aria-live="assertive"
          className="text-lg md:text-2xl font-bold leading-relaxed text-a11y-text min-h-[60px]"
        >
          {description ? (
            <p>{description}</p>
          ) : (
            <p className="opacity-70 italic">
              Toca el botón gigante para capturar el entorno o sube una foto. El asistente te indicará obstáculos a las 12 en punto, a las 3 en punto, textos y peligros inmediatos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
