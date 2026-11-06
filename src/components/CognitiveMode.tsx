import React, { useState, useRef } from 'react';
import {
  Camera,
  Mic,
  CheckCircle2,
  Circle,
  Volume2,
  RotateCcw,
  Upload,
  FileText,
  Images,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  UserCheck,
  ThumbsUp,
  RefreshCw,
  Feather,
  Pencil,
  ScrollText,
  PlusCircle,
  Search,
  Globe,
  Layers,
  Trash2,
  X,
  Sparkles
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useSpeech } from '../hooks/useSpeech';
import { useCamera } from '../hooks/useCamera';
import { useHaptics } from '../hooks/useHaptics';
import { aiService } from '../services/aiService';
import { validateEasyRead, summarizeChecks } from '../services/easyReadValidator';
import {
  ARASAAC_ATTRIBUTION,
  ArasaacSearchCandidate,
  searchPictogramsByTerm,
  resolveCompoundPictograms,
  findExplanatoryImage,
  saveCustomPictogram,
  removeCustomPictogram,
  getCustomPictogram,
  normalizeWordKey
} from '../services/arasaacService';
import {
  EasyReadStep,
  PictogramPhrase,
  PictogramToken,
  GuidelineCheck
} from '../types';

export const CognitiveMode: React.FC = () => {
  const {
    announce,
    speechRate,
    hapticEnabled,
    hasApiKey,
    userProfile,
    setIsProfileModalOpen,
    cognitiveFormat: outputFormat,
    setCognitiveFormat,
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
  // Revisión docente y respuesta del alumno sobre la adaptación
  const [isEditing, setIsEditing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [adaptedFromText, setAdaptedFromText] = useState<string>('');
  const [steps, setSteps] = useState<EasyReadStep[]>([]);
  const [guidelineChecks, setGuidelineChecks] = useState<GuidelineCheck[]>([]);
  const [showAtecaDetails, setShowAtecaDetails] = useState<boolean>(true);

  // Estado Apartado 2: Pictogramas ARASAAC
  const [pictoTitle, setPictoTitle] = useState<string>('');
  const [pictoPhrases, setPictoPhrases] = useState<PictogramPhrase[]>([]);

  // Estado del Editor de Pictograma / Imagen para Profesor o Usuario
  const [editingTokenTarget, setEditingTokenTarget] = useState<{
    phraseId: string;
    tokenIndex: number;
    token: PictogramToken;
  } | null>(null);
  const [pictoSearchQuery, setPictoSearchQuery] = useState<string>('');
  const [pictoSearchResults, setPictoSearchResults] = useState<ArasaacSearchCandidate[]>([]);
  const [isSearchingPicto, setIsSearchingPicto] = useState<boolean>(false);
  const [compoundInputText, setCompoundInputText] = useState<string>('');
  const [isBuildingCompound, setIsBuildingCompound] = useState<boolean>(false);
  const [customImageUrlInput, setCustomImageUrlInput] = useState<string>('');
  const [customExplanationInput, setCustomExplanationInput] = useState<string>('');
  const [saveForFuture, setSaveForFuture] = useState<boolean>(true);
  const [isSearchingWebImg, setIsSearchingWebImg] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraNativeInputRef = useRef<HTMLInputElement | null>(null);
  const customTokenFileInputRef = useRef<HTMLInputElement | null>(null);

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
  const handleProcess = async (refinement?: 'simpler' | 'alternative') => {
    setErrorMsg(null);
    setUnderstood(false);
    setIsEditing(false);
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
          'Adaptando texto siguiendo las pautas de Lectura Fácil (UNE 153101)...',
          'assertive'
        );

        const previousVersion =
          refinement && steps.length > 0
            ? [summary, ...steps.map((st) => `${st.stepNumber}. ${st.instruction}`)].join('\n')
            : undefined;

        const result = await aiService.simplifyToEasyRead({
          text: inputText.trim() || undefined,
          base64Image: base64Clean,
          refinement,
          previousVersion
        });

        setSummary(result.summary);
        setSteps(result.steps);
        setAdaptedFromText(inputText.trim());

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

        const previousPictos =
          refinement && pictoPhrases.length > 0
            ? [pictoTitle, ...pictoPhrases.map((ph) => `${ph.stepNumber}. ${ph.text}`)].join('\n')
            : undefined;

        const result = await aiService.generatePictograms({
          text: inputText.trim() || undefined,
          base64Image: base64Clean,
          refinement,
          previousVersion: previousPictos
        });

        setPictoTitle(result.title);
        setPictoPhrases(result.phrases);
        setAdaptedFromText(inputText.trim());
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

  // El docente corrige un paso: se vuelve a comprobar el texto con las pautas
  const updateStepText = (id: string, text: string) => {
    const updated = steps.map((st) => (st.id === id ? { ...st, instruction: text } : st));
    setSteps(updated);
    setGuidelineChecks(
      validateEasyRead([summary, ...updated.map((st) => st.instruction)].filter(Boolean), maxWordsPerSentence)
    );
  };

  const handleUnderstood = () => {
    setUnderstood(true);
    announce('Muy bien. Has entendido el texto.', 'polite');
    if (hapticEnabled) triggerSuccess();
  };

  // Abrir el modal de edición / adición de pictograma o imagen para una palabra
  const openTokenEditor = async (phraseId: string, tokenIndex: number, token: PictogramToken) => {
    if (hapticEnabled) triggerShort();
    setEditingTokenTarget({ phraseId, tokenIndex, token });
    const initialSearch = token.resolvedKeyword || token.synonyms?.[0] || token.keyword || token.word;
    setPictoSearchQuery(initialSearch);
    setCompoundInputText(
      token.compoundPictograms && token.compoundPictograms.length > 0
        ? token.compoundPictograms.map((c) => c.keyword).join(', ')
        : (token.fallbackKeywords || []).join(', ')
    );
    setCustomImageUrlInput(token.imageSource === 'custom' || token.imageSource === 'wikimedia' ? token.imageUrl || '' : '');
    setCustomExplanationInput(token.conceptExplanation || '');
    setSaveForFuture(true);

    // Lanzar búsqueda inicial en ARASAAC para mostrar opciones visuales inmediatamente
    setIsSearchingPicto(true);
    const results = await searchPictogramsByTerm(initialSearch, 12);
    setPictoSearchResults(results);
    setIsSearchingPicto(false);
  };

  // Aplicar un cambio (pictograma único, varios pictogramas o imagen) a todas las apariciones de esa palabra
  const applyTokenUpdate = (updatedFields: Partial<PictogramToken>) => {
    if (!editingTokenTarget) return;
    const targetWordNorm = normalizeWordKey(editingTokenTarget.token.word);
    const targetKwNorm = normalizeWordKey(editingTokenTarget.token.keyword);

    setPictoPhrases((prev) =>
      prev.map((ph) => ({
        ...ph,
        tokens: ph.tokens.map((tok, idx) => {
          const isExactTarget =
            ph.id === editingTokenTarget.phraseId && idx === editingTokenTarget.tokenIndex;
          const isSameWord =
            normalizeWordKey(tok.word) === targetWordNorm ||
            normalizeWordKey(tok.keyword) === targetKwNorm;

          if (isExactTarget || isSameWord) {
            return {
              ...tok,
              ...updatedFields,
              conceptExplanation:
                customExplanationInput.trim() || updatedFields.conceptExplanation || tok.conceptExplanation
            };
          }
          return tok;
        })
      }))
    );

    if (saveForFuture) {
      saveCustomPictogram({
        word: editingTokenTarget.token.word,
        imageUrl: updatedFields.imageUrl ?? null,
        pictogramId: updatedFields.pictogramId ?? null,
        resolvedKeyword: updatedFields.resolvedKeyword,
        compoundPictograms: updatedFields.compoundPictograms,
        conceptExplanation:
          customExplanationInput.trim() || updatedFields.conceptExplanation || editingTokenTarget.token.conceptExplanation,
        updatedAt: Date.now()
      });
    }

    if (hapticEnabled) triggerSuccess();
    announce(`Pictograma o imagen actualizada para la palabra ${editingTokenTarget.token.word}`, 'assertive');
    setEditingTokenTarget(null);
  };

  // Buscar pictogramas en ARASAAC desde el modal del profesor/usuario
  const handleManualPictoSearch = async (queryOverride?: string) => {
    const q = (queryOverride ?? pictoSearchQuery).trim();
    if (!q) return;
    setPictoSearchQuery(q);
    setIsSearchingPicto(true);
    const results = await searchPictogramsByTerm(q, 12);
    setPictoSearchResults(results);
    setIsSearchingPicto(false);
  };

  // Explicar la palabra combinando 2 o 3 pictogramas escritos por el profesor/usuario
  const handleApplyCompoundPictograms = async () => {
    const words = compoundInputText
      .split(/[,+;\s]+/)
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (words.length === 0) return;

    setIsBuildingCompound(true);
    const resolved = await resolveCompoundPictograms(words);
    setIsBuildingCompound(false);

    if (resolved.length === 0) {
      announce('No se encontraron pictogramas para esas palabras. Prueba con palabras más sencillas.', 'assertive');
      return;
    }

    applyTokenUpdate({
      pictogramId: resolved[0].pictogramId,
      imageUrl: resolved.length === 1 ? resolved[0].imageUrl : null,
      imageSource: 'custom',
      compoundPictograms: resolved
    });
  };

  // Pedir a la IA que sugiera sinónimos y descomposición en varios pictogramas para esta palabra
  const handleAiSuggestDecomposition = async () => {
    if (!editingTokenTarget) return;
    setIsBuildingCompound(true);
    const suggestion = await aiService.decomposeWordToSimplePictograms(editingTokenTarget.token.word);
    if (suggestion.compoundKeywords.length > 0) {
      setCompoundInputText(suggestion.compoundKeywords.join(', '));
    }
    if (suggestion.explanation && !customExplanationInput) {
      setCustomExplanationInput(suggestion.explanation);
    }
    if (suggestion.synonyms.length > 0) {
      handleManualPictoSearch(suggestion.synonyms[0]);
    }
    setIsBuildingCompound(false);
  };

  // Buscar imagen explicativa en Wikipedia / Wikimedia Commons desde el modal
  const handleSearchWebExplanatoryImage = async () => {
    if (!editingTokenTarget) return;
    setIsSearchingWebImg(true);
    const term = pictoSearchQuery.trim() || editingTokenTarget.token.word;
    const found =
      (await findExplanatoryImage(term)) ||
      (await findExplanatoryImage(editingTokenTarget.token.word)) ||
      (await findExplanatoryImage(editingTokenTarget.token.keyword));
    setIsSearchingWebImg(false);

    if (found) {
      setCustomImageUrlInput(found.imageUrl);
      if (found.description && !customExplanationInput) {
        setCustomExplanationInput(found.description);
      }
      announce('Imagen explicativa encontrada. Pulsa "Usar esta imagen" para aplicarla.', 'polite');
    } else {
      announce('No se encontró imagen en Wikipedia para ese término. Puedes subir una imagen o pegar su enlace.', 'assertive');
    }
  };

  // Subir una imagen personalizada desde el dispositivo del profesor/usuario para esa palabra
  const handleCustomTokenFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const compressed = await compressImage(dataUrl);
      applyTokenUpdate({
        pictogramId: null,
        imageUrl: compressed,
        imageSource: 'custom',
        compoundPictograms: undefined
      });
    };
    reader.readAsDataURL(file);
  };

  // Eliminar la personalización guardada en localStorage para esta palabra
  const handleRemoveSavedCustomPicto = () => {
    if (!editingTokenTarget) return;
    removeCustomPictogram(editingTokenTarget.token.word);
    removeCustomPictogram(editingTokenTarget.token.keyword);
    announce(`Se eliminó la imagen personalizada guardada para ${editingTokenTarget.token.word}`, 'polite');
    setEditingTokenTarget(null);
  };

  // Bloque común: respuesta del alumno sobre la adaptación (Texto fácil y Pictogramas)
  const comprehensionFeedback = (
    <section
      aria-labelledby="comprension-titulo"
      className="p-5 rounded-3xl border-2 border-a11y-border bg-a11y-card space-y-4"
    >
      <h3 id="comprension-titulo" className="text-xl md:text-2xl font-bold text-a11y-text">
        ¿Lo has entendido?
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleUnderstood}
          disabled={isLoading}
          aria-pressed={understood}
          className={`touch-target min-h-[72px] px-4 py-3 rounded-3xl border-2 font-bold text-lg flex items-center justify-center gap-3 ${
            understood
              ? 'bg-a11y-accent text-black border-a11y-accent'
              : 'border-a11y-border text-a11y-text hover:border-a11y-accent'
          }`}
        >
          <ThumbsUp className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span>Lo he entendido</span>
        </button>
        <button
          onClick={() => handleProcess('alternative')}
          disabled={isLoading}
          className="touch-target min-h-[72px] px-4 py-3 rounded-3xl border-2 border-a11y-border text-a11y-text font-bold text-lg flex items-center justify-center gap-3 hover:border-a11y-primary disabled:opacity-60"
        >
          <RefreshCw className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span>Otra versión</span>
        </button>
        <button
          onClick={() => handleProcess('simpler')}
          disabled={isLoading}
          className="touch-target min-h-[72px] px-4 py-3 rounded-3xl border-2 border-a11y-border text-a11y-text font-bold text-lg flex items-center justify-center gap-3 hover:border-a11y-primary disabled:opacity-60"
        >
          <Feather className="w-7 h-7 shrink-0" aria-hidden="true" />
          <span>Más fácil</span>
        </button>
      </div>
      {understood && (
        <p className="text-lg font-bold text-a11y-text" role="status">
          ¡Muy bien!
        </p>
      )}
      {isLoading && (
        <p className="text-lg font-bold text-a11y-text" role="status">
          Preparando otra versión…
        </p>
      )}
    </section>
  );

  // Bloque común: botón y panel para comparar con el texto original
  const originalToggleButton = adaptedFromText ? (
      <button
        onClick={() => setShowOriginal(!showOriginal)}
        aria-expanded={showOriginal}
        aria-controls="texto-original"
        className="touch-target min-h-[48px] px-4 py-2 rounded-full border-2 border-a11y-border text-a11y-text font-bold text-base flex items-center gap-2 hover:border-a11y-primary"
      >
        <ScrollText className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>{showOriginal ? 'Ocultar texto original' : 'Ver texto original'}</span>
      </button>
  ) : null;

  const originalPanel =
    showOriginal && adaptedFromText ? (
      <div
        id="texto-original"
        className="p-5 rounded-3xl border-2 border-dashed border-a11y-border bg-a11y-bg text-a11y-text space-y-2"
      >
        <p className="text-sm font-bold opacity-80">Texto original</p>
        <p className="text-lg leading-relaxed whitespace-pre-wrap">{adaptedFromText}</p>
      </div>
    ) : null;

  const completedStepsCount = steps.filter((s) => s.completed).length;
  const completedPhrasesCount = pictoPhrases.filter((p) => p.completed).length;
  const atecaSummary = summarizeChecks(guidelineChecks);
  const firstPendingStepId = steps.find((s) => !s.completed)?.id;
  const firstPendingPhraseId = pictoPhrases.find((p) => !p.completed)?.id;

  return (
    <div className="w-full flex-1 max-w-3xl mx-auto p-4 md:p-8 space-y-8">
      {/* Encabezado: qué hace este modo y para quién se adapta */}
      <section aria-labelledby="leer-facil-titulo" className="space-y-3">
        <h2 id="leer-facil-titulo" className="text-3xl md:text-4xl font-bold text-a11y-text">
          Leer fácil
        </h2>
        <p className="text-lg md:text-xl text-a11y-text opacity-90 max-w-prose">
          Convierte un texto difícil en frases cortas, con pictogramas y voz. Revisa siempre el
          resultado antes de compartirlo.
        </p>
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="touch-target min-h-[48px] px-4 py-2 rounded-full border-2 border-a11y-border bg-a11y-card text-a11y-text font-bold text-base flex items-center gap-2 text-left hover:border-a11y-primary"
          aria-label={`Adaptado para: ${userProfile.shortTitle}. Pulsa para cambiar el perfil de apoyo.`}
        >
          <UserCheck className="w-5 h-5 shrink-0 text-a11y-primary" aria-hidden="true" />
          <span>Adaptado para: {userProfile.shortTitle}</span>
          <span className="underline underline-offset-4 text-a11y-primary">Cambiar</span>
        </button>
      </section>

      <ol className="list-none p-0 m-0 space-y-8">
        {/* Paso 1: el texto */}
        <li className="space-y-3">
          <label
            htmlFor="cognitive-input"
            className="flex items-center gap-3 text-xl md:text-2xl font-bold text-a11y-text"
          >
            <span
              className="w-9 h-9 rounded-full bg-a11y-primary text-a11y-primaryText flex items-center justify-center text-lg shrink-0"
              aria-hidden="true"
            >
              1
            </span>
            <span>Pon el texto</span>
          </label>
          <textarea
            id="cognitive-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              outputFormat === 'easy-read'
                ? 'Pega o escribe aquí el texto: un enunciado, una circular, unas normas…'
                : 'Escribe aquí la rutina o la frase: primero me lavo las manos, después…'
            }
            rows={5}
            className="w-full p-4 md:p-5 rounded-3xl border-2 border-a11y-border bg-a11y-card text-a11y-text text-xl leading-relaxed placeholder:text-a11y-text placeholder:opacity-60 focus:border-a11y-primary"
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden sm:inline text-base text-a11y-text opacity-80 mr-1">O usa:</span>
            <button
              onClick={handleToggleCamera}
              className={`touch-target min-h-[48px] px-3 sm:px-4 py-2 rounded-full border-2 font-bold text-base flex items-center gap-2 transition-colors ${
                isCameraActive
                  ? 'bg-a11y-alert text-black border-a11y-alert'
                  : 'bg-transparent text-a11y-text border-a11y-border hover:border-a11y-primary'
              }`}
              aria-label={isCameraActive ? 'Cerrar la cámara' : 'Hacer una foto a un documento'}
            >
              <Camera className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{isCameraActive ? 'Cerrar cámara' : 'Foto'}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="touch-target min-h-[48px] px-3 sm:px-4 py-2 rounded-full border-2 border-a11y-border bg-transparent text-a11y-text font-bold text-base flex items-center gap-2 hover:border-a11y-primary"
              aria-label="Subir una imagen desde tus archivos o la galería"
            >
              <Upload className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Imagen</span>
            </button>
            <button
              onClick={handleToggleMic}
              className={`touch-target min-h-[48px] px-3 sm:px-4 py-2 rounded-full border-2 font-bold text-base flex items-center gap-2 transition-colors ${
                isListening
                  ? 'bg-a11y-primary text-a11y-primaryText border-a11y-primary'
                  : 'bg-transparent text-a11y-text border-a11y-border hover:border-a11y-primary'
              }`}
              aria-label={isListening ? 'Parar el dictado' : 'Dictar el texto con la voz'}
            >
              <Mic className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{isListening ? 'Parar dictado' : 'Dictar'}</span>
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
          </div>

          {isCameraActive && (
            <div className="relative w-full rounded-3xl overflow-hidden border-2 border-a11y-border bg-black aspect-video max-h-80">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
                aria-label="Cámara para fotografiar el documento"
              />
              <button
                onClick={handleCaptureDocument}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 touch-target px-6 py-3 rounded-full bg-a11y-primary text-a11y-primaryText font-bold text-lg"
              >
                Hacer la foto
              </button>
            </div>
          )}

          {previewImage && !isCameraActive && (
            <div className="flex items-center gap-4 p-3 rounded-3xl border-2 border-a11y-border bg-a11y-card">
              <img
                src={previewImage}
                alt="Vista previa del documento"
                className="w-20 h-20 object-cover rounded-2xl shrink-0"
              />
              <p className="flex-1 font-bold text-lg text-a11y-text">Foto lista para adaptar</p>
              <button
                onClick={() => setPreviewImage(null)}
                className="touch-target min-h-[44px] px-4 py-2 rounded-full border-2 border-a11y-border text-a11y-text font-bold"
                aria-label="Quitar la foto"
              >
                Quitar
              </button>
            </div>
          )}
        </li>

        {/* Paso 2: el formato */}
        <li className="space-y-3">
          <p
            id="formato-titulo"
            className="flex items-center gap-3 text-xl md:text-2xl font-bold text-a11y-text"
          >
            <span
              className="w-9 h-9 rounded-full bg-a11y-primary text-a11y-primaryText flex items-center justify-center text-lg shrink-0"
              aria-hidden="true"
            >
              2
            </span>
            <span>Elige cómo verlo</span>
          </p>
          <div role="radiogroup" aria-labelledby="formato-titulo" className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  value: 'easy-read',
                  label: 'Texto fácil',
                  hint: 'Frases cortas y claras',
                  icon: <FileText className="w-7 h-7 shrink-0" aria-hidden="true" />
                },
                {
                  value: 'pictograms',
                  label: 'Pictogramas',
                  hint: 'Una imagen por cada idea',
                  icon: <Images className="w-7 h-7 shrink-0" aria-hidden="true" />
                }
              ] as const
            ).map((opt) => {
              const selected = outputFormat === opt.value;
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCognitiveFormat(opt.value)}
                  className={`touch-target min-h-[80px] p-4 rounded-3xl border-2 text-left flex items-center gap-3 transition-colors ${
                    selected
                      ? 'border-a11y-primary bg-a11y-card text-a11y-text ring-2 ring-a11y-primary'
                      : 'border-a11y-border bg-transparent text-a11y-text hover:border-a11y-primary'
                  }`}
                >
                  <span className={selected ? 'text-a11y-primary' : ''}>{opt.icon}</span>
                  <span className="flex flex-col">
                    <span className="font-bold text-lg leading-tight">{opt.label}</span>
                    <span className="text-sm opacity-80 leading-tight">{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </li>

        {/* Paso 3: adaptar */}
        <li>
          <button
            onClick={() => handleProcess()}
            disabled={isLoading}
            className="w-full touch-target min-h-[72px] py-4 px-6 rounded-full bg-a11y-primary text-a11y-primaryText font-bold text-2xl flex items-center justify-center gap-3 hover:brightness-105 disabled:opacity-60"
          >
            {outputFormat === 'easy-read' ? (
              <FileText className="w-7 h-7 shrink-0" aria-hidden="true" />
            ) : (
              <Images className="w-7 h-7 shrink-0" aria-hidden="true" />
            )}
            <span>
              {isLoading
                ? outputFormat === 'easy-read'
                  ? 'Adaptando el texto…'
                  : 'Buscando pictogramas…'
                : outputFormat === 'easy-read'
                ? 'Adaptar texto'
                : 'Crear pictogramas'}
            </span>
          </button>
        </li>
      </ol>

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
          aria-label="Resultados de Lectura Fácil y comprobación de pautas UNE 153101"
        >
          {/* Herramientas de revisión docente */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              aria-pressed={isEditing}
              className={`touch-target min-h-[48px] px-4 py-2 rounded-full border-2 font-bold text-base flex items-center gap-2 ${
                isEditing
                  ? 'bg-a11y-primary text-a11y-primaryText border-a11y-primary'
                  : 'border-a11y-border text-a11y-text hover:border-a11y-primary'
              }`}
            >
              <Pencil className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{isEditing ? 'Terminar de editar' : 'Editar (docente)'}</span>
            </button>
            {originalToggleButton}
          </div>
          {originalPanel}

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
                      Comprobación automática de pautas (UNE 153101:2018 EX)
                    </h3>
                    <p className="text-sm font-bold opacity-85 text-a11y-text">
                      Pautas que se cumplen: {atecaSummary.passed} de {atecaSummary.total}{' '}
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
                indicadores de legibilidad de la norma, inspirados en la herramienta ATECA (frases cortas,
                voz activa, ausencia de conectores complejos, superlativos y tecnicismos). No sustituye
                a la validación: un texto solo es Lectura Fácil cuando lo validan personas con
                dificultades de comprensión lectora, y siempre debe revisarlo un docente.
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
                    {isEditing ? (
                      <textarea
                        value={step.instruction}
                        onChange={(e) => updateStepText(step.id, e.target.value)}
                        rows={2}
                        aria-label={`Editar el texto del paso ${step.stepNumber}`}
                        className="w-full p-3 rounded-2xl border-2 border-a11y-primary bg-a11y-bg text-a11y-text text-xl leading-snug"
                      />
                    ) : (
                      <p
                        className={`text-xl md:text-2xl font-black leading-snug ${
                          step.completed ? 'line-through text-gray-400' : ''
                        }`}
                      >
                        {step.instruction}
                      </p>
                    )}
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

          {comprehensionFeedback}
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
          {/* Barra de herramientas de revisión docente / usuario para Pictogramas */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              aria-pressed={isEditing}
              className={`touch-target min-h-[48px] px-4 py-2 rounded-full border-2 font-bold text-base flex items-center gap-2 ${
                isEditing
                  ? 'bg-a11y-primary text-a11y-primaryText border-a11y-primary'
                  : 'border-a11y-border text-a11y-text hover:border-a11y-primary'
              }`}
            >
              <Pencil className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>
                {isEditing
                  ? 'Terminar edición de pictogramas'
                  : 'Añadir o cambiar pictogramas (Profesor / Usuario)'}
              </span>
            </button>
            {originalToggleButton}
          </div>
          {originalPanel}

          {/* Encabezado y progreso de pictogramas */}
          <div className="p-5 rounded-2xl border-4 border-a11y-border bg-a11y-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-a11y-text">
                  🖼️ {pictoTitle}
                </h3>
                <p className="text-base font-bold opacity-85 text-a11y-text mt-1">
                  Toca cualquier pictograma para escuchar su palabra o pulsa &quot;Escuchar
                  frase&quot;. Si una palabra no tiene pictograma directo, se busca por sinónimo,
                  se explica con varios pictogramas o con una imagen explicativa, o puedes añadirla
                  manualmente. ({completedPhrasesCount} de {pictoPhrases.length} completadas)
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

                  {/* Fila de tarjetas de Pictogramas ARASAAC (Cuadrícula adaptable en móvil y PC) */}
                  <div
                    className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-3 sm:gap-4 pt-1"
                    role="group"
                    aria-label={`Pictogramas del paso ${phrase.stepNumber}`}
                  >
                    {phrase.tokens.map((token, idx) => {
                      const hasCompound =
                        Boolean(token.compoundPictograms && token.compoundPictograms.length > 1);
                      const hasAnyVisual =
                        Boolean(token.imageUrl) ||
                        Boolean(token.compoundPictograms && token.compoundPictograms.length > 0);
                      const isWideCard =
                        hasCompound || token.imageSource === 'wikimedia' || !hasAnyVisual;

                      return (
                        <div
                          key={`${phrase.id}-tok-${idx}`}
                          className={` flex flex-col justify-between rounded-2xl border-4 border-black bg-white text-black shadow-md overflow-hidden ${
                            isWideCard
                              ? 'col-span-2 sm:w-64 p-3'
                              : 'w-full sm:w-44 p-3'
                          }`}
                        >
                          {/* Etiqueta superior informativa cuando se usa sinónimo, varios pictogramas, imagen explicativa o docente */}
                          {token.imageSource === 'arasaac-synonym' && token.resolvedKeyword && (
                            <div className="mb-1.5 px-2 py-0.5 rounded-lg bg-blue-100 border border-blue-700 text-blue-950 text-xs font-black text-center">
                              🔄 Sinónimo: {token.resolvedKeyword}
                            </div>
                          )}
                          {token.imageSource === 'arasaac-compound' && (
                            <div className="mb-1.5 px-2 py-0.5 rounded-lg bg-purple-100 border border-purple-800 text-purple-950 text-xs font-black text-center">
                              🧩 Explicado con varios pictogramas
                            </div>
                          )}
                          {token.imageSource === 'wikimedia' && (
                            <div className="mb-1.5 px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-800 text-amber-950 text-xs font-black text-center">
                              🌐 Imagen explicativa del concepto
                            </div>
                          )}
                          {token.imageSource === 'custom' && (
                            <div className="mb-1.5 px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-800 text-emerald-950 text-xs font-black text-center">
                              👩‍🏫 Añadido por profesor / usuario
                            </div>
                          )}

                          {/* Área principal clicable para escuchar la palabra (y su explicación si la tiene) */}
                          <button
                            type="button"
                            onClick={() =>
                              readWordAloud(
                                token.conceptExplanation
                                  ? `${token.word}. ${token.conceptExplanation}`
                                  : token.word
                              )
                            }
                            className="w-full flex-1 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-xl"
                            aria-label={`Pictograma de ${token.word}. Tocar para escuchar.`}
                          >
                            {/* Caso 1: Imagen principal + opcionalmente varios pictogramas de apoyo debajo */}
                            {token.imageUrl ? (
                              <div className="w-full flex flex-col items-center gap-2">
                                <div className="w-28 h-28 flex items-center justify-center bg-white rounded-xl overflow-hidden">
                                  <img
                                    src={token.imageUrl}
                                    alt={`Imagen o pictograma de ${token.word}`}
                                    loading="lazy"
                                    className="w-full h-full object-contain"
                                  />
                                </div>

                                {/* Si además tiene descomposición en varios pictogramas (ej. "socialismo" -> compartir + igualdad + trabajador), mostrarla debajo */}
                                {token.compoundPictograms &&
                                  token.compoundPictograms.length > 0 &&
                                  token.imageSource === 'wikimedia' && (
                                    <div className="w-full border-t border-gray-300 pt-1.5">
                                      <p className="text-[11px] font-bold text-gray-700 text-center mb-1">
                                        En pictogramas:
                                      </p>
                                      <div className="flex items-center justify-center gap-1 flex-wrap">
                                        {token.compoundPictograms.map((sub, sIdx) => (
                                          <React.Fragment key={`${sub.keyword}-${sIdx}`}>
                                            {sIdx > 0 && (
                                              <span className="font-black text-sm text-black">+</span>
                                            )}
                                            <div className="flex flex-col items-center bg-gray-50 border border-gray-300 rounded-lg p-1 w-14">
                                              <img
                                                src={sub.imageUrl}
                                                alt={sub.keyword}
                                                className="w-10 h-10 object-contain"
                                              />
                                              <span className="text-[10px] font-bold text-black leading-tight truncate max-w-full">
                                                {sub.keyword}
                                              </span>
                                            </div>
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ) : token.compoundPictograms && token.compoundPictograms.length > 0 ? (
                              /* Caso 2: Explicado mediante varios pictogramas combinados (2 o 3 pictogramas) */
                              <div className="w-full py-1 flex items-center justify-center gap-1.5 flex-wrap">
                                {token.compoundPictograms.map((sub, sIdx) => (
                                  <React.Fragment key={`${sub.keyword}-${sIdx}`}>
                                    {sIdx > 0 && (
                                      <span
                                        className="font-black text-lg text-black px-0.5"
                                        aria-hidden="true"
                                      >
                                        +
                                      </span>
                                    )}
                                    <div className="flex flex-col items-center bg-gray-50 border-2 border-gray-400 rounded-xl p-1.5 w-20">
                                      <img
                                        src={sub.imageUrl}
                                        alt={`Pictograma de ${sub.keyword}`}
                                        loading="lazy"
                                        className="w-14 h-14 object-contain"
                                      />
                                      <span className="text-[11px] font-black uppercase text-gray-900 mt-1 text-center leading-tight break-words">
                                        {sub.keyword}
                                      </span>
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            ) : (
                              /* Caso 3: No se encontró ni pictograma ni imagen -> Aviso claro para añadirlo */
                              <div className="w-full min-h-[112px] flex flex-col items-center justify-center bg-amber-50 rounded-xl border-2 border-dashed border-amber-600 p-2.5 text-center gap-1.5">
                                <span className="text-xs font-black text-amber-950 uppercase">
                                  Sin pictograma directo
                                </span>
                                <span className="text-xs font-semibold text-gray-800 leading-tight">
                                  Pulsa el botón inferior para que un profesor o usuario lo añada
                                </span>
                              </div>
                            )}

                            {/* Palabra original en mayúsculas bajo el pictograma */}
                            <span className="mt-2 w-full text-center font-black text-base sm:text-lg uppercase tracking-wide text-black border-t-2 border-black pt-1.5 break-words leading-tight">
                              {token.word}
                            </span>

                            {/* Breve explicación si es un concepto abstracto o histórico (ej. "socialismo") */}
                            {token.conceptExplanation && (
                              <span className="mt-1 text-xs font-bold text-gray-800 bg-yellow-100 border border-yellow-500 rounded-lg px-2 py-1 text-center leading-snug">
                                💡 {token.conceptExplanation}
                              </span>
                            )}
                          </button>

                          {/* Botón siempre disponible para que el profesor o usuario añada o cambie el pictograma/imagen */}
                          <button
                            type="button"
                            onClick={() => openTokenEditor(phrase.id, idx, token)}
                            className={`mt-2 w-full min-h-[38px] px-2 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-colors ${
                              !hasAnyVisual
                                ? 'bg-amber-400 hover:bg-amber-300 text-black border-black shadow'
                                : 'bg-gray-100 hover:bg-yellow-200 text-gray-900 border-gray-400'
                            }`}
                            aria-label={`Añadir o cambiar pictograma o imagen para la palabra ${token.word}`}
                          >
                            {!hasAnyVisual ? (
                              <>
                                <PlusCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                                <span>Añadir pictograma / imagen</span>
                              </>
                            ) : (
                              <>
                                <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>Cambiar / Añadir</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {comprehensionFeedback}

          {/* Atribución oficial obligatoria CC BY-NC-SA 4.0 de ARASAAC */}
          <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-card text-xs md:text-sm font-bold text-a11y-text opacity-90 text-center">
            {ARASAAC_ATTRIBUTION}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL PARA PROFESOR / USUARIO: AÑADIR O PERSONALIZAR PICTOGRAMA O IMAGEN
         ===================================================================== */}
      {editingTokenTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-picto-editor-title"
        >
          <div className="w-full max-w-2xl rounded-3xl border-4 border-a11y-primary bg-a11y-card text-a11y-text p-5 md:p-6 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b-2 border-a11y-border pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-a11y-primary text-a11y-primaryText">
                  Herramienta para Profesor / Usuario
                </span>
                <h3
                  id="modal-picto-editor-title"
                  className="text-2xl md:text-3xl font-black mt-2"
                >
                  Pictograma o imagen para «{editingTokenTarget.token.word}»
                </h3>
                <p className="text-sm font-bold opacity-85 mt-1">
                  Elige un sinónimo con pictograma, combínalo con varios pictogramas, busca una
                  imagen explicativa o sube tu propia imagen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTokenTarget(null)}
                className="touch-target min-h-[48px] min-w-[48px] rounded-2xl border-2 border-a11y-border flex items-center justify-center hover:border-a11y-primary"
                aria-label="Cerrar ventana de edición de pictograma"
              >
                <X className="w-7 h-7" aria-hidden="true" />
              </button>
            </div>

            {/*Explicación breve opcional para acompañar a la palabra */}
            <div className="space-y-1.5">
              <label
                htmlFor="custom-concept-explanation"
                className="block text-sm font-black"
              >
                💡 Nota explicativa breve bajo la palabra (opcional):
              </label>
              <input
                id="custom-concept-explanation"
                type="text"
                value={customExplanationInput}
                onChange={(e) => setCustomExplanationInput(e.target.value)}
                placeholder="Ej.: Sistema que busca compartir e igualdad para los trabajadores"
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text font-bold text-base"
              />
            </div>

            {/* OPCIÓN 1: Buscar sinónimo u otra palabra en ARASAAC */}
            <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg space-y-3">
              <h4 className="text-lg font-black flex items-center gap-2">
                <Search className="w-5 h-5 text-a11y-primary shrink-0" aria-hidden="true" />
                <span>1. Buscar pictograma por sinónimo o palabra en ARASAAC</span>
              </h4>

              {/* Sugerencias rápidas de sinónimos si existen */}
              {editingTokenTarget.token.synonyms &&
                editingTokenTarget.token.synonyms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold opacity-80">Sinónimos sugeridos:</span>
                    {editingTokenTarget.token.synonyms.map((syn) => (
                      <button
                        key={syn}
                        type="button"
                        onClick={() => handleManualPictoSearch(syn)}
                        className="px-3 py-1 rounded-full border border-a11y-primary text-xs font-black hover:bg-a11y-primary hover:text-a11y-primaryText"
                      >
                        {syn}
                      </button>
                    ))}
                  </div>
                )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={pictoSearchQuery}
                  onChange={(e) => setPictoSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualPictoSearch();
                  }}
                  placeholder="Escribe un sinónimo o palabra sencilla (ej. compartir, igualdad)…"
                  className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-a11y-border bg-a11y-card text-a11y-text font-bold text-base"
                  aria-label="Buscar palabra o sinónimo en ARASAAC"
                />
                <button
                  type="button"
                  onClick={() => handleManualPictoSearch()}
                  disabled={isSearchingPicto}
                  className="touch-target px-4 py-2.5 rounded-2xl bg-a11y-primary text-a11y-primaryText font-black text-base flex items-center gap-2"
                >
                  <Search className="w-5 h-5" aria-hidden="true" />
                  <span>{isSearchingPicto ? 'Buscando…' : 'Buscar'}</span>
                </button>
              </div>

              {pictoSearchResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-1 max-h-60 overflow-y-auto p-1">
                  {pictoSearchResults.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() =>
                        applyTokenUpdate({
                          pictogramId: cand.id,
                          imageUrl: cand.imageUrl,
                          imageSource: 'custom',
                          resolvedKeyword: cand.keyword,
                          compoundPictograms: undefined
                        })
                      }
                      className="p-2 rounded-2xl border-2 border-black bg-white text-black hover:ring-4 hover:ring-a11y-primary flex flex-col items-center gap-1 transition-transform hover:scale-105"
                      title={`Elegir pictograma #${cand.id} (${cand.keyword})`}
                    >
                      <img
                        src={cand.imageUrl}
                        alt={cand.keyword}
                        className="w-16 h-16 object-contain"
                      />
                      <span className="text-xs font-black uppercase text-center truncate w-full">
                        {cand.keyword}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                !isSearchingPicto && (
                  <p className="text-sm font-bold opacity-80">
                    No hay pictogramas con esa palabra exacta. Prueba con otro sinónimo o usa las
                    opciones de abajo.
                  </p>
                )
              )}
            </div>

            {/* OPCIÓN 2: Explicar con varios pictogramas combinados (2 o 3 pictogramas) */}
            <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-black flex items-center gap-2">
                  <Layers className="w-5 h-5 text-a11y-primary shrink-0" aria-hidden="true" />
                  <span>2. Explicar con varios pictogramas (2 o 3 ideas simples)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAiSuggestDecomposition}
                  disabled={isBuildingCompound}
                  className="px-3 py-1.5 rounded-xl border-2 border-a11y-primary text-xs font-black flex items-center gap-1.5 hover:bg-a11y-primary hover:text-a11y-primaryText"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Sugerir palabras con IA</span>
                </button>
              </div>
              <p className="text-xs font-bold opacity-85">
                Escribe 2 o 3 palabras sencillas separadas por comas para explicar el concepto con
                varios pictogramas juntos (por ejemplo: <em>compartir, igualdad, trabajador</em>).
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={compoundInputText}
                  onChange={(e) => setCompoundInputText(e.target.value)}
                  placeholder="Ej.: compartir, igualdad, trabajador"
                  className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-a11y-border bg-a11y-card text-a11y-text font-bold text-base"
                  aria-label="Palabras sencillas para combinar en varios pictogramas"
                />
                <button
                  type="button"
                  onClick={handleApplyCompoundPictograms}
                  disabled={isBuildingCompound || !compoundInputText.trim()}
                  className="touch-target px-4 py-2.5 rounded-2xl bg-a11y-primary text-a11y-primaryText font-black text-base disabled:opacity-50"
                >
                  {isBuildingCompound ? 'Combinando…' : 'Usar varios pictogramas'}
                </button>
              </div>
            </div>

            {/* OPCIÓN 3: Buscar imagen explicativa o subir/pegar imagen (Profesor / Usuario) */}
            <div className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-bg space-y-3">
              <h4 className="text-lg font-black flex items-center gap-2">
                <Globe className="w-5 h-5 text-a11y-primary shrink-0" aria-hidden="true" />
                <span>3. Imagen explicativa o subida por el profesor / usuario</span>
              </h4>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSearchWebExplanatoryImage}
                  disabled={isSearchingWebImg}
                  className="touch-target px-4 py-2.5 rounded-2xl border-2 border-a11y-primary font-black text-sm flex items-center gap-2 hover:bg-a11y-primary hover:text-a11y-primaryText"
                >
                  <Globe className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isSearchingWebImg
                      ? 'Buscando en Wikipedia / Commons…'
                      : `Buscar imagen explicativa de «${editingTokenTarget.token.word}»`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => customTokenFileInputRef.current?.click()}
                  className="touch-target px-4 py-2.5 rounded-2xl border-2 border-a11y-border font-black text-sm flex items-center gap-2 hover:border-a11y-primary"
                >
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Subir imagen desde mi dispositivo</span>
                </button>
                <input
                  type="file"
                  ref={customTokenFileInputRef}
                  onChange={handleCustomTokenFileUpload}
                  accept="image/*"
                  className="hidden"
                  aria-hidden="true"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="url"
                  value={customImageUrlInput}
                  onChange={(e) => setCustomImageUrlInput(e.target.value)}
                  placeholder="O pega aquí el enlace (URL) de una imagen explicativa…"
                  className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-a11y-border bg-a11y-card text-a11y-text font-bold text-sm"
                  aria-label="URL de imagen explicativa"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customImageUrlInput.trim()) return;
                    applyTokenUpdate({
                      pictogramId: null,
                      imageUrl: customImageUrlInput.trim(),
                      imageSource: 'custom'
                    });
                  }}
                  disabled={!customImageUrlInput.trim()}
                  className="touch-target px-4 py-2.5 rounded-2xl bg-a11y-primary text-a11y-primaryText font-black text-sm disabled:opacity-50"
                >
                  Usar esta imagen
                </button>
              </div>

              {customImageUrlInput.trim() && (
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white text-black border-2 border-black">
                  <img
                    src={customImageUrlInput.trim()}
                    alt="Vista previa de la imagen explicativa"
                    className="w-16 h-16 object-contain rounded-lg border border-gray-300"
                  />
                  <div className="text-xs font-bold flex-1">
                    Vista previa de la imagen seleccionada para «{editingTokenTarget.token.word}».
                    Pulsa <strong>&quot;Usar esta imagen&quot;</strong> para guardarla.
                  </div>
                </div>
              )}
            </div>

            {/* Pie del modal: guardar para futuras sesiones o borrar personalización */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t-2 border-a11y-border">
              <label className="flex items-center gap-2.5 font-bold text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveForFuture}
                  onChange={(e) => setSaveForFuture(e.target.checked)}
                  className="w-5 h-5 accent-yellow-400 rounded"
                />
                <span>
                  Recordar en el diccionario del profesor/usuario para cuando vuelva a salir esta
                  palabra
                </span>
              </label>

              <div className="flex items-center gap-2">
                {getCustomPictogram(editingTokenTarget.token.word) && (
                  <button
                    type="button"
                    onClick={handleRemoveSavedCustomPicto}
                    className="px-3 py-2 rounded-xl border-2 border-red-500 text-red-300 font-bold text-xs flex items-center gap-1.5 hover:bg-red-950/50"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Olvidar personalización guardada</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingTokenTarget(null)}
                  className="px-5 py-2.5 rounded-2xl border-2 border-a11y-border font-black text-sm hover:border-a11y-primary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
