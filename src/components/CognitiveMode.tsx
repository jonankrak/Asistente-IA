import React, { useState, useRef } from 'react';
import {
  Camera,
  Mic,
  CheckCircle2,
  Circle,
  Volume2,
  Sparkles,
  RotateCcw,
  Upload,
  FileText,
  Images,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  UserCheck
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useSpeech } from '../hooks/useSpeech';
import { useCamera } from '../hooks/useCamera';
import { useHaptics } from '../hooks/useHaptics';
import { aiService } from '../services/aiService';
import { validateEasyRead, summarizeChecks } from '../services/easyReadValidator';
import { ARASAAC_ATTRIBUTION } from '../services/arasaacService';
import {
  EasyReadStep,
  PictogramPhrase,
  GuidelineCheck
} from '../types';

export const CognitiveMode: React.FC = () => {
  const {
    announce,
    speechRate,
    hapticEnabled,
    hasApiKey,
    isMobile,
    userProfile,
    setIsProfileModalOpen,
    setIsSettingsOpen,
    isProfileControlEnabled,
    cognitiveFormat: outputFormat,
    autoSpeak,
    stepByStepFocus,
    maxWordsPerSentence
  } = useAccessibility();
  const { triggerShort, triggerSuccess, triggerError } = useHaptics();

  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Estado Apartado 1: Lectura Fácil (UNE 153101:2018 EX + ATECA)
  const [summary, setSummary] = useState<string>('');
  const [steps, setSteps] = useState<EasyReadStep[]>([]);
  const [guidelineChecks, setGuidelineChecks] = useState<GuidelineCheck[]>([]);
  const [showAtecaDetails, setShowAtecaDetails] = useState<boolean>(true);

  // Estado Apartado 2: Pictogramas ARASAAC
  const [pictoTitle, setPictoTitle] = useState<string>('');
  const [pictoPhrases, setPictoPhrases] = useState<PictogramPhrase[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraNativeInputRef = useRef<HTMLInputElement | null>(null);

  const {
    videoRef,
    isCameraActive,
    startCamera,
    stopCamera,
    captureFrame
  } = useCamera();

  const {
    isListening,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  } = useSpeech({
    rate: speechRate,
    onTranscriptChange: (text) => setInputText(text)
  });

  // Alternar vista de cámara (con fallback a cámara nativa de Android Chrome)
  const handleToggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      const started = await startCamera('environment');
      if (started) {
        announce('Cámara activada para fotografiar documento', 'polite');
      } else {
        cameraNativeInputRef.current?.click();
      }
    }
  };

  // Capturar fotograma de documento
  const handleCaptureDocument = () => {
    if (hapticEnabled) triggerShort();
    const frame = captureFrame();
    if (frame) {
      setPreviewImage(frame.fullDataUrl);
      stopCamera();
      announce('Foto de documento capturada. Pulsa el botón principal para procesar.', 'assertive');
    }
  };

  // Optimizar y reducir fotos pesadas a tamaño web ligero
  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
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
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Subir imagen desde galería/archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      announce('Comprimiendo imagen para procesamiento rápido...', 'polite');
      const optimized = await compressImage(result);
      setPreviewImage(optimized);
      announce('Documento cargado y optimizado correctamente.', 'polite');
    };
    reader.readAsDataURL(file);
  };

  // Dictado por voz
  const handleToggleMic = () => {
    if (hapticEnabled) triggerShort();
    if (isListening) {
      stopListening();
      announce('Dictado finalizado.', 'polite');
    } else {
      startListening();
      announce('Escuchando lo que deseas adaptar...', 'polite');
    }
  };

  // Procesar según el apartado activo (Lectura Fácil UNE/ATECA o Pictogramas ARASAAC)
  const handleProcess = async () => {
    setErrorMsg(null);
    stopSpeaking();

    if (!inputText.trim() && !previewImage) {
      const err = 'Por favor escribe un texto o haz una foto a un documento.';
      setErrorMsg(err);
      announce(err, 'assertive');
      return;
    }

    if (!hasApiKey) {
      const err = 'Falta configurar la Clave API de Gemini. Ve a Ajustes.';
      setErrorMsg(err);
      announce(err, 'assertive');
      return;
    }

    setIsLoading(true);
    let base64Clean: string | undefined = undefined;
    if (previewImage) {
      base64Clean = previewImage.replace(/^data:image\/[a-z]+;base64,/, '');
    }

    try {
      if (outputFormat === 'easy-read') {
        announce(
          'Adaptando texto a Lectura Fácil con pautas UNE 153101 y herramienta ATECA...',
          'assertive'
        );

        const result = await aiService.simplifyToEasyRead({
          text: inputText.trim() || undefined,
          base64Image: base64Clean
        });

        setSummary(result.summary);
        setSteps(result.steps);

        // Ejecutar validador automático UNE 153101:2018 EX + ATECA con el límite de palabras activo
        const linesToValidate = [
          result.summary,
          ...result.steps.map((s) => s.instruction)
        ].filter(Boolean);
        const checks = validateEasyRead(linesToValidate, maxWordsPerSentence);
        setGuidelineChecks(checks);

        setIsLoading(false);
        if (hapticEnabled) triggerSuccess();

        announce(
          `Adaptación completada. Se generaron ${result.steps.length} pasos en Lectura Fácil.`,
          'assertive'
        );
        if (autoSpeak) {
          speak(`${result.summary}. Paso 1: ${result.steps[0]?.instruction || ''}`);
        }
      } else {
        announce(
          'Generando secuencia de pictogramas con ARASAAC e Inteligencia Artificial...',
          'assertive'
        );

        const result = await aiService.generatePictograms({
          text: inputText.trim() || undefined,
          base64Image: base64Clean
        });

        setPictoTitle(result.title);
        setPictoPhrases(result.phrases);
        setIsLoading(false);
        if (hapticEnabled) triggerSuccess();

        announce(
          `Pictogramas listos. Se crearon ${result.phrases.length} frases visuales de ARASAAC.`,
          'assertive'
        );
        if (autoSpeak) {
          speak(`${result.title}. Paso 1: ${result.phrases[0]?.text || ''}`);
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Error al procesar con IA.';
      setErrorMsg(msg);
      setIsLoading(false);
      if (hapticEnabled) triggerError();
      announce(msg, 'assertive');
    }
  };

  // Marcar/desmarcar paso de Lectura Fácil
  const toggleStepCompleted = (stepId: string) => {
    if (hapticEnabled) triggerShort();
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id === stepId) {
          const nextState = !step.completed;
          announce(
            nextState
              ? `Paso ${step.stepNumber} completado: ${step.instruction}`
              : `Paso ${step.stepNumber} desmarcado`,
            'polite'
          );
          return { ...step, completed: nextState };
        }
        return step;
      })
    );
  };

  // Marcar/desmarcar frase de Pictogramas ARASAAC
  const togglePhraseCompleted = (phraseId: string) => {
    if (hapticEnabled) triggerShort();
    setPictoPhrases((prev) =>
      prev.map((phrase) => {
        if (phrase.id === phraseId) {
          const nextState = !phrase.completed;
          announce(
            nextState
              ? `Frase ${phrase.stepNumber} completada: ${phrase.text}`
              : `Frase ${phrase.stepNumber} desmarcada`,
            'polite'
          );
          return { ...phrase, completed: nextState };
        }
        return phrase;
      })
    );
  };

  // Leer un paso de Lectura Fácil en voz alta
  const readStepAloud = (step: EasyReadStep) => {
    if (hapticEnabled) triggerShort();
    announce(`Leyendo paso ${step.stepNumber}`, 'polite');
    speak(`Paso número ${step.stepNumber}. ${step.instruction}`);
  };

  // Leer una frase de Pictogramas en voz alta
  const readPhraseAloud = (phrase: PictogramPhrase) => {
    if (hapticEnabled) triggerShort();
    announce(`Leyendo frase ${phrase.stepNumber}`, 'polite');
    speak(`Paso ${phrase.stepNumber}. ${phrase.text}`);
  };

  // Leer una palabra individual al pulsar un pictograma
  const readWordAloud = (word: string) => {
    if (hapticEnabled) triggerShort();
    speak(word);
  };

  const completedStepsCount = steps.filter((s) => s.completed).length;
  const completedPhrasesCount = pictoPhrases.filter((p) => p.completed).length;
  const atecaSummary = summarizeChecks(guidelineChecks);
  const firstPendingStepId = steps.find((s) => !s.completed)?.id;
  const firstPendingPhraseId = pictoPhrases.find((p) => !p.completed)?.id;

  return (
    <div className="w-full flex-1 max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Encabezado del Modo Cognitivo */}
      <div className="border-4 border-a11y-border bg-a11y-card p-5 rounded-3xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-2xl md:text-3xl font-black text-a11y-text flex items-center gap-3">
              <Sparkles className="w-9 h-9 text-a11y-primary shrink-0" aria-hidden="true" />
              <span>Modo Cognitivo: Accesibilidad Cognitiva</span>
            </h2>
            <p className="text-lg md:text-xl font-bold opacity-90 mt-2 text-a11y-text">
              Elige si quieres adaptar el texto a <strong>Lectura Fácil</strong> (siguiendo la{' '}
              <strong>Norma UNE 153101:2018 EX</strong> y los criterios de la{' '}
              <strong>herramienta ATECA</strong>) o traducirlo a una secuencia visual con{' '}
              <strong>Pictogramas ARASAAC</strong>.
            </p>
          </div>
        </div>

        {/* Tarjeta del Perfil Diagnóstico / Funcional Activo */}
        <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-a11y-primary">
                Perfil de Apoyo Activo:
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-lg border text-xs font-black uppercase ${userProfile.badgeColor}`}
              >
                {userProfile.categoryLabel} — {userProfile.levelLabel}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md border text-[11px] font-black uppercase ${
                  isProfileControlEnabled
                    ? 'bg-green-950/60 border-green-500 text-green-300'
                    : 'bg-yellow-950/60 border-yellow-500 text-yellow-300'
                }`}
              >
                {isProfileControlEnabled
                  ? '🔒 Control Automático por Perfil'
                  : '🛠️ Modo de Ajuste Manual'}
              </span>
            </div>
            <p className="text-sm font-bold opacity-90 text-a11y-text">
              {userProfile.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="touch-target px-4 py-2.5 rounded-xl border-2 border-a11y-border bg-a11y-primary text-a11y-primaryText font-black text-sm flex items-center gap-2 hover:brightness-105"
              aria-label="Cambiar perfil de apoyo (Tecla P)"
            >
              <UserCheck className="w-5 h-5" aria-hidden="true" />
              <span>Cambiar Perfil</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="touch-target px-3.5 py-2.5 rounded-xl border-2 border-a11y-border bg-a11y-card text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-xs uppercase"
              aria-label="Abrir ajustes para cambiar entre control por perfil o ajuste manual"
            >
              {isProfileControlEnabled ? 'Ajuste Manual' : 'Ajustes'}
            </button>
          </div>
        </div>

        {/* INDICADOR FIJADO DE FORMATO COGNITIVO (Se cambia únicamente por Perfil o en Ajustes) */}
        <div
          role="status"
          aria-label="Formato de adaptación cognitiva fijado"
          className="p-4 rounded-2xl border-4 border-a11y-border bg-a11y-primary text-a11y-primaryText flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-3.5">
            {outputFormat === 'easy-read' ? (
              <FileText className="w-9 h-9 md:w-11 md:h-11 shrink-0" aria-hidden="true" />
            ) : (
              <Images className="w-9 h-9 md:w-11 md:h-11 shrink-0" aria-hidden="true" />
            )}
            <div>
              <span className="block text-xs font-black uppercase tracking-wider opacity-90">
                {isProfileControlEnabled
                  ? `🔒 Formato Fijado por Perfil (${userProfile.shortTitle}):`
                  : '🛠️ Formato Fijado en Ajustes Manuales:'}
              </span>
              <span className="block text-lg sm:text-xl md:text-2xl font-black leading-tight mt-0.5">
                {outputFormat === 'easy-read'
                  ? 'Texto en Lectura Fácil (Norma UNE 153101:2018 EX + ATECA)'
                  : 'Secuencia Visual con Pictogramas ARASAAC'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="touch-target px-4 py-2.5 rounded-xl border-2 border-current bg-black/15 hover:bg-black/25 font-black text-xs sm:text-sm shrink-0"
            aria-label="Abrir Ajustes para cambiar entre Lectura Fácil y Pictogramas ARASAAC"
          >
            ⚙️ Cambiar en Ajustes
          </button>
        </div>
      </div>

      {/* Selector de Entrada: Cámara, Subir Imagen o Dictar (Grid de 3 botones en móvil) */}
      <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
        <button
          onClick={handleToggleCamera}
          className={`touch-target min-h-[68px] px-3 sm:px-5 py-3 rounded-2xl border-4 font-black text-sm sm:text-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 transition-colors ${
            isCameraActive
              ? 'bg-red-500 text-black border-red-700'
              : 'bg-a11y-bg text-a11y-text border-a11y-border hover:bg-a11y-primary hover:text-a11y-primaryText'
          }`}
          aria-label={
            isCameraActive
              ? 'Cerrar cámara'
              : 'Abrir cámara para fotografiar carta, cartel o factura'
          }
        >
          <Camera className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span className="text-center leading-tight">
            {isCameraActive ? 'Cerrar' : isMobile ? 'Cámara' : 'Foto a Documento'}
          </span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="touch-target min-h-[68px] px-3 sm:px-5 py-3 rounded-2xl border-4 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-sm sm:text-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3"
          aria-label="Subir foto desde tus archivos o galería"
        >
          <Upload className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span className="text-center leading-tight">
            {isMobile ? 'Galería' : 'Subir Imagen'}
          </span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
          aria-hidden="true"
        />
        <input
          type="file"
          ref={cameraNativeInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden="true"
        />

        <button
          onClick={handleToggleMic}
          className={`touch-target min-h-[68px] px-3 sm:px-5 py-3 rounded-2xl border-4 font-black text-sm sm:text-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 transition-colors ${
            isListening
              ? 'bg-yellow-400 text-black border-black animate-pulse'
              : 'bg-a11y-bg text-a11y-text border-a11y-border hover:bg-a11y-primary hover:text-a11y-primaryText'
          }`}
          aria-label={
            isListening ? 'Detener dictado por voz' : 'Dictar tarea o texto con tu voz'
          }
        >
          <Mic className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span className="text-center leading-tight">
            {isListening ? 'Parar' : isMobile ? 'Dictar' : 'Dictar con Voz'}
          </span>
        </button>
      </div>

      {/* Visor de Cámara si está activa */}
      {isCameraActive && (
        <div className="relative w-full rounded-3xl overflow-hidden border-4 border-a11y-border bg-black aspect-video max-h-80">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
            aria-label="Cámara para capturar documento"
          />
          <button
            onClick={handleCaptureDocument}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 touch-target px-8 py-4 rounded-2xl bg-a11y-primary text-a11y-primaryText border-4 border-a11y-border font-black text-xl shadow-2xl"
            aria-label="Tomar foto ahora para procesar"
          >
            📸 TOMAR FOTO AL DOCUMENTO
          </button>
        </div>
      )}

      {/* Miniatura de imagen cargada */}
      {previewImage && !isCameraActive && (
        <div className="flex items-center gap-4 p-4 rounded-2xl border-4 border-a11y-border bg-a11y-card">
          <img
            src={previewImage}
            alt="Vista previa del documento"
            className="w-24 h-24 object-cover rounded-xl border-2 border-a11y-border"
          />
          <div className="flex-1">
            <p className="font-black text-lg text-a11y-text">
              Foto de documento lista para procesar
            </p>
            <p className="text-sm opacity-80">
              {outputFormat === 'easy-read'
                ? 'Se adaptará a Lectura Fácil según la Norma UNE 153101:2018 EX y ATECA.'
                : 'Se convertirá en una secuencia visual de pictogramas ARASAAC.'}
            </p>
          </div>
          <button
            onClick={() => setPreviewImage(null)}
            className="touch-target px-4 py-2 rounded-xl border-2 border-red-500 bg-red-950/40 text-red-300 font-bold"
            aria-label="Eliminar foto del documento"
          >
            Eliminar
          </button>
        </div>
      )}

      {/* Caja de texto accesible con tipografía grande (>= 20px) */}
      <div className="space-y-3">
        <label
          htmlFor="cognitive-input"
          className="block text-xl md:text-2xl font-black text-a11y-text"
        >
          {outputFormat === 'easy-read'
            ? 'Escribe o dicta el texto o tarea para adaptar a Lectura Fácil (UNE 153101 / ATECA):'
            : 'Escribe o dicta la frase, rutina o texto para crear con Pictogramas ARASAAC:'}
        </label>
        <textarea
          id="cognitive-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            outputFormat === 'easy-read'
              ? 'Ej: Carta médica, contrato, notificación oficial o instrucciones para poner la lavadora...'
              : 'Ej: Primero me lavo las manos con agua y jabón, después como en la mesa y luego me cepillo los dientes...'
          }
          rows={3}
          className="w-full p-4 rounded-2xl border-4 border-a11y-border bg-a11y-bg text-a11y-text text-xl font-bold placeholder:opacity-50 focus:outline-none"
        />
      </div>

      {/* Botón de Acción Principal según apartado */}
      <button
        onClick={handleProcess}
        disabled={isLoading}
        className="w-full touch-target min-h-[72px] py-4 px-6 rounded-2xl bg-a11y-primary text-a11y-primaryText border-4 border-a11y-border font-black text-2xl md:text-3xl flex items-center justify-center gap-4 hover:brightness-105 active:scale-98 transition-transform disabled:opacity-50"
        aria-label={
          outputFormat === 'easy-read'
            ? 'Simplificar texto a Lectura Fácil siguiendo Norma UNE 153101 y herramienta ATECA'
            : 'Crear secuencia visual con Pictogramas de ARASAAC'
        }
      >
        {outputFormat === 'easy-read' ? (
          <>
            <FileText className="w-8 h-8 shrink-0" aria-hidden="true" />
            <span>
              {isLoading
                ? 'ADAPTANDO SEGÚN NORMA UNE 153101 Y ATECA...'
                : 'SIMPLIFICAR A LECTURA FÁCIL (UNE / ATECA)'}
            </span>
          </>
        ) : (
          <>
            <Images className="w-8 h-8 shrink-0" aria-hidden="true" />
            <span>
              {isLoading
                ? 'BUSCANDO PICTOGRAMAS EN ARASAAC...'
                : 'CREAR CON PICTOGRAMAS ARASAAC'}
            </span>
          </>
        )}
      </button>

      {/* Mensaje de Error si ocurre */}
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-2xl border-4 border-red-500 bg-red-950/40 text-red-200 text-lg font-bold"
        >
          {errorMsg}
        </div>
      )}

      {/* =====================================================================
          APARTADO 1: RESULTADOS DE LECTURA FÁCIL + VALIDADOR UNE 153101 / ATECA
         ===================================================================== */}
      {outputFormat === 'easy-read' && steps.length > 0 && (
        <div
          className="space-y-6 pt-4 border-t-4 border-a11y-border"
          role="region"
          aria-label="Resultados de Lectura Fácil y validación UNE 153101 y ATECA"
        >
          {/* PANEL DE VALIDACIÓN NORMA UNE 153101:2018 EX + HERRAMIENTA ATECA */}
          {guidelineChecks.length > 0 && (
            <div className="p-5 rounded-3xl border-4 border-a11y-border bg-a11y-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    className="w-9 h-9 text-green-400 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-a11y-text">
                      Informe de Pautas: Norma UNE 153101:2018 EX y ATECA
                    </h3>
                    <p className="text-sm font-bold opacity-85 text-a11y-text">
                      Cumplimiento automático: {atecaSummary.passed} de {atecaSummary.total}{' '}
                      criterios ({atecaSummary.score}%)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAtecaDetails((prev) => !prev)}
                  className="touch-target px-4 py-2 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text font-black text-sm hover:bg-a11y-primary hover:text-a11y-primaryText"
                  aria-expanded={showAtecaDetails}
                >
                  {showAtecaDetails ? 'Ocultar criterios' : 'Ver los 8 criterios'}
                </button>
              </div>

              {showAtecaDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {guidelineChecks.map((check) => {
                    const isOk = check.severity === 'ok';
                    const isWarn = check.severity === 'warning';
                    return (
                      <div
                        key={check.id}
                        className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 ${
                          isOk
                            ? 'border-green-500/70 bg-green-950/25 text-a11y-text'
                            : isWarn
                            ? 'border-yellow-400 bg-yellow-950/30 text-yellow-100'
                            : 'border-red-500 bg-red-950/35 text-red-100'
                        }`}
                      >
                        {isOk ? (
                          <CheckCircle2
                            className="w-6 h-6 text-green-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : isWarn ? (
                          <AlertTriangle
                            className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <XCircle
                            className="w-6 h-6 text-red-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        )}
                        <div className="text-sm">
                          <div className="font-black">{check.rule}</div>
                          <div className="opacity-90 font-semibold mt-0.5">
                            {check.detail}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-xs md:text-sm font-bold opacity-80 border-t-2 border-a11y-border pt-3 text-a11y-text">
                ℹ️ Nota técnica (UNE 153101:2018 EX): Esta verificación lingüística aplica los
                indicadores de legibilidad de la norma y de la herramienta ATECA (frases cortas,
                voz activa, ausencia de conectores complejos, superlativos y tecnicismos). Para
                obtener el logotipo oficial de Lectura Fácil, el documento debe validarse además
                con personas con dificultades de comprensión lectora.
              </p>
            </div>
          )}

          {/* Barra de Progreso y Resumen */}
          <div className="p-5 rounded-2xl border-4 border-a11y-border bg-a11y-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xl md:text-2xl font-black text-a11y-text">
                Progreso: {completedStepsCount} de {steps.length} pasos completados
              </span>
              <button
                onClick={() => setSteps(steps.map((s) => ({ ...s, completed: false })))}
                className="touch-target px-4 py-2 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText text-sm font-bold flex items-center gap-2"
                aria-label="Reiniciar todos los pasos a no completados"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
                <span>Reiniciar</span>
              </button>
            </div>

            {/* Barra visual de progreso */}
            <div
              className="w-full h-6 rounded-full bg-a11y-bg border-2 border-a11y-border overflow-hidden"
              role="progressbar"
              aria-valuenow={completedStepsCount}
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-label={`Progreso de la tarea: ${completedStepsCount} de ${steps.length} completados`}
            >
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(completedStepsCount / steps.length) * 100}%` }}
              />
            </div>

            {summary && (
              <p
                className="text-xl md:text-2xl font-bold text-a11y-text pt-2 border-t-2 border-a11y-border"
                aria-live="polite"
              >
                💡 {summary}
              </p>
            )}
          </div>

          {/* Tarjetas individuales de pasos interactivos (Área táctil amplia >= 64px) */}
          <div className="space-y-4" role="list">
            {steps.map((step) => {
              const isGuidedActive = stepByStepFocus && step.id === firstPendingStepId;
              return (
                <div
                  key={step.id}
                  role="listitem"
                  className={`p-5 rounded-3xl border-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    step.completed
                      ? 'bg-green-950/30 border-green-500 text-green-200 opacity-80'
                      : isGuidedActive
                      ? 'bg-a11y-card border-a11y-primary ring-4 ring-a11y-primary/50 text-a11y-text shadow-xl scale-[1.01]'
                      : stepByStepFocus
                      ? 'bg-a11y-card border-a11y-border text-a11y-text opacity-60'
                      : 'bg-a11y-card border-a11y-border text-a11y-text'
                  }`}
                >
                  {/* Botón táctil grande de checkbox para marcar paso */}
                  <button
                    onClick={() => toggleStepCompleted(step.id)}
                    className="touch-target min-h-[64px] min-w-[64px] p-3 rounded-2xl border-4 border-current flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
                    aria-label={`Marcar paso ${step.stepNumber}: ${step.instruction}. Estado actual: ${
                      step.completed ? 'Completado' : 'Pendiente'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-12 h-12 text-green-400" aria-hidden="true" />
                    ) : (
                      <Circle className="w-12 h-12 text-a11y-primary" aria-hidden="true" />
                    )}
                  </button>

                  {/* Contenido del paso con Emoji y Texto de una sola idea por línea */}
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-3xl" aria-hidden="true">
                        {step.emoji}
                      </span>
                      <span className="text-xl font-black text-a11y-primary">
                        PASO {step.stepNumber}
                      </span>
                      {isGuidedActive && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-a11y-primary text-a11y-primaryText text-xs font-black uppercase">
                          👉 PASO ACTUAL RECOMENDADO (Modo Guiado)
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xl md:text-2xl font-black leading-snug ${
                        step.completed ? 'line-through text-gray-400' : ''
                      }`}
                    >
                      {step.instruction}
                    </p>
                  </div>

                  {/* Botón para escuchar este paso individual por altavoz */}
                  <button
                    onClick={() => readStepAloud(step)}
                    className="touch-target min-h-[64px] min-w-[64px] px-4 py-3 rounded-2xl border-4 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText flex items-center gap-2 font-black text-base shrink-0 self-stretch sm:self-auto justify-center"
                    aria-label={`Escuchar en voz alta el paso ${step.stepNumber}`}
                  >
                    <Volume2 className="w-7 h-7" aria-hidden="true" />
                    <span>Escuchar</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          APARTADO 2: RESULTADOS CON PICTOGRAMAS ARASAAC
         ===================================================================== */}
      {outputFormat === 'pictograms' && pictoPhrases.length > 0 && (
        <div
          className="space-y-6 pt-4 border-t-4 border-a11y-border"
          role="region"
          aria-label="Secuencia visual de Pictogramas ARASAAC"
        >
          {/* Encabezado y progreso de pictogramas */}
          <div className="p-5 rounded-2xl border-4 border-a11y-border bg-a11y-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-a11y-text">
                  🖼️ {pictoTitle}
                </h3>
                <p className="text-base font-bold opacity-85 text-a11y-text mt-1">
                  Toca cualquier pictograma para escuchar su palabra o pulsa &quot;Escuchar
                  frase&quot;. ({completedPhrasesCount} de {pictoPhrases.length} completadas)
                </p>
              </div>
              <button
                onClick={() =>
                  setPictoPhrases(pictoPhrases.map((p) => ({ ...p, completed: false })))
                }
                className="touch-target px-4 py-2 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText text-sm font-bold flex items-center gap-2"
                aria-label="Reiniciar todas las secuencias de pictogramas"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          {/* Tarjetas de frases con secuencias de pictogramas ARASAAC */}
          <div className="space-y-6" role="list">
            {pictoPhrases.map((phrase) => {
              const isGuidedActive = stepByStepFocus && phrase.id === firstPendingPhraseId;
              return (
              <div
                key={phrase.id}
                role="listitem"
                className={`p-5 rounded-3xl border-4 transition-all space-y-4 ${
                  phrase.completed
                    ? 'bg-green-950/30 border-green-500 text-green-200 opacity-85'
                    : isGuidedActive
                    ? 'bg-a11y-card border-a11y-primary ring-4 ring-a11y-primary/50 text-a11y-text shadow-xl scale-[1.01]'
                    : stepByStepFocus
                    ? 'bg-a11y-card border-a11y-border text-a11y-text opacity-60'
                    : 'bg-a11y-card border-a11y-border text-a11y-text'
                }`}
              >
                {/* Cabecera de la frase: Checkbox + Texto completo + Botón Escuchar Frase */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b-2 border-a11y-border">
                  <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                    <button
                      onClick={() => togglePhraseCompleted(phrase.id)}
                      className="touch-target min-h-[64px] min-w-[64px] p-3 rounded-2xl border-4 border-current flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
                      aria-label={`Marcar paso ${phrase.stepNumber}: ${phrase.text}. Estado actual: ${
                        phrase.completed ? 'Completado' : 'Pendiente'
                      }`}
                    >
                      {phrase.completed ? (
                        <CheckCircle2 className="w-10 h-10 text-green-400" aria-hidden="true" />
                      ) : (
                        <Circle className="w-10 h-10 text-a11y-primary" aria-hidden="true" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-a11y-primary uppercase tracking-wider">
                          PASO {phrase.stepNumber}
                        </span>
                        {isGuidedActive && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-a11y-primary text-a11y-primaryText text-xs font-black uppercase">
                            👉 PASO ACTUAL RECOMENDADO (Modo Guiado)
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xl md:text-2xl font-black leading-snug ${
                          phrase.completed ? 'line-through opacity-75' : ''
                        }`}
                      >
                        {phrase.text}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => readPhraseAloud(phrase)}
                    className="touch-target min-h-[64px] px-5 py-3 rounded-2xl border-4 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText flex items-center gap-2 font-black text-base shrink-0"
                    aria-label={`Escuchar frase completa del paso ${phrase.stepNumber}: ${phrase.text}`}
                  >
                    <Volume2 className="w-7 h-7" aria-hidden="true" />
                    <span>Escuchar frase</span>
                  </button>
                </div>

                {/* Fila de tarjetas de Pictogramas ARASAAC (Cuadrícula 2 columnas en móvil, fila flexible en PC) */}
                <div
                  className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-3 sm:gap-4 pt-1"
                  role="group"
                  aria-label={`Pictogramas del paso ${phrase.stepNumber}`}
                >
                  {phrase.tokens.map((token, idx) => (
                    <button
                      key={`${phrase.id}-tok-${idx}`}
                      type="button"
                      onClick={() => readWordAloud(token.word)}
                      className="touch-target w-full sm:w-40 p-3 rounded-2xl border-4 border-black bg-white text-black hover:scale-105 active:scale-95 transition-transform flex flex-col items-center justify-between shadow-md focus:ring-4 focus:ring-yellow-400"
                      aria-label={`Pictograma: ${token.word}. Tocar para escuchar palabra.`}
                    >
                      <div className="w-28 h-28 flex items-center justify-center bg-white rounded-xl overflow-hidden">
                        {token.imageUrl ? (
                          <img
                            src={token.imageUrl}
                            alt={`Pictograma ARASAAC de ${token.word}`}
                            loading="lazy"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl border-2 border-dashed border-gray-400 p-2 text-center">
                            <span className="text-base font-black text-gray-800 uppercase break-words">
                              {token.word}
                            </span>
                          </div>
                        )}
                      </div>

                      <span className="mt-2 w-full text-center font-black text-base sm:text-lg uppercase tracking-wide text-black border-t-2 border-black pt-1.5 break-words leading-tight">
                        {token.word}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              );
            })}
          </div>

          {/* Atribución oficial obligatoria CC BY-NC-SA 4.0 de ARASAAC */}
          <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-card text-xs md:text-sm font-bold text-a11y-text opacity-90 text-center">
            {ARASAAC_ATTRIBUTION}
          </div>
        </div>
      )}
    </div>
  );
};
