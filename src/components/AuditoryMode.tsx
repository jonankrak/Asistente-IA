import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, MessageSquare, Sparkles, RefreshCw, VolumeX } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useSpeech } from '../hooks/useSpeech';
import { useHaptics } from '../hooks/useHaptics';
import { aiService } from '../services/aiService';
import { AacOption } from '../types';

export const AuditoryMode: React.FC = () => {
  const { announce, speechRate, hapticEnabled, hasApiKey } = useAccessibility();
  const { triggerShort, triggerSuccess, triggerError } = useHaptics();

  const [heardText, setHeardText] = useState<string>('');
  const [quickOptions, setQuickOptions] = useState<AacOption[]>([
    { id: '1', emoji: '👍', label: 'Sí, de acuerdo', speakText: 'Sí, estoy totalmente de acuerdo con eso.' },
    { id: '2', emoji: '✋', label: 'No, gracias', speakText: 'No, muchas gracias.' },
    { id: '3', emoji: '⏳', label: 'Dame un momento', speakText: 'Por favor, dame un momento para responderte.' }
  ]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [customReply, setCustomReply] = useState<string>('');
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    isListening,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSpeaking
  } = useSpeech({
    rate: speechRate,
    onTranscriptChange: (text) => {
      setHeardText(text);
    }
  });

  // Generar opciones con IA a partir de lo escuchado
  const handleGenerateResponses = useCallback(async (phraseToAnalyze?: string) => {
    const textToUse = phraseToAnalyze || heardText;
    if (!textToUse.trim()) {
      announce('Primero debes escuchar o tener una frase dicha por la otra persona.', 'polite');
      return;
    }

    if (!hasApiKey) {
      const err = 'Configura tu clave API de Gemini en Ajustes para generar respuestas con IA.';
      setErrorMsg(err);
      announce(err, 'assertive');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    announce('Generando 3 opciones de respuesta con IA Gemini...', 'polite');

    try {
      const options = await aiService.generateAacResponses(textToUse);
      setQuickOptions(options);
      setIsGenerating(false);
      if (hapticEnabled) triggerSuccess();
      announce('Opciones de respuesta listas en la pantalla.', 'assertive');
    } catch (err: any) {
      const msg = err.message || 'Error al generar respuestas.';
      setErrorMsg(msg);
      setIsGenerating(false);
      if (hapticEnabled) triggerError();
      announce(msg, 'assertive');
    }
  }, [heardText, hasApiKey, announce, hapticEnabled, triggerSuccess, triggerError]);

  // Alternar escucha de la otra persona
  const handleToggleListening = () => {
    if (hapticEnabled) triggerShort();
    if (isListening) {
      stopListening();
      announce('Escucha detenida.', 'polite');
      if (heardText.trim()) {
        handleGenerateResponses(heardText);
      }
    } else {
      setHeardText('');
      startListening();
      announce('Escuchando a la otra persona...', 'assertive');
    }
  };

  // Hablar una opción CAA mediante el altavoz
  const handleSelectOption = (option: AacOption) => {
    if (hapticEnabled) triggerShort();
    setLastSpokenText(option.speakText);
    announce(`Reproduciendo respuesta: ${option.speakText}`, 'assertive');
    speak(option.speakText, speechRate);
  };

  // Hablar texto personalizado
  const handleSpeakCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customReply.trim()) return;

    if (hapticEnabled) triggerShort();
    setLastSpokenText(customReply);
    speak(customReply, speechRate);
    announce(`Reproduciendo: ${customReply}`, 'assertive');
    setCustomReply('');
  };

  return (
    <div className="w-full flex-1 max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Título y Guía del Modo Auditivo */}
      <div className="border-4 border-a11y-border bg-a11y-card p-5 rounded-3xl">
        <h2 className="text-2xl md:text-3xl font-black text-a11y-text flex items-center gap-3">
          <MessageSquare className="w-9 h-9 text-a11y-primary" aria-hidden="true" />
          Modo Auditivo y Comunicador Rápido (CAA)
        </h2>
        <p className="text-lg md:text-xl font-bold opacity-90 mt-2 text-a11y-text">
          Transcriptor en vivo con texto grande y respuestas generadas con IA para contestar con un solo toque por el altavoz.
        </p>
      </div>

      {/* Botón principal de escucha a la otra persona */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <button
          onClick={handleToggleListening}
          className={`flex-1 touch-target min-h-[72px] py-4 px-6 rounded-2xl border-4 font-black text-xl md:text-2xl flex items-center justify-center gap-4 transition-all ${
            isListening
              ? 'bg-red-500 text-black border-red-700 animate-pulse'
              : 'bg-a11y-primary text-a11y-primaryText border-a11y-border hover:brightness-105 active:scale-98'
          }`}
          aria-label={
            isListening
              ? 'Detener escucha del interlocutor y generar respuestas'
              : 'Pulsar para escuchar lo que dice la otra persona'
          }
        >
          {isListening ? (
            <>
              <MicOff className="w-8 h-8" aria-hidden="true" />
              <span>DETENER ESCUCHA (LISTO)</span>
            </>
          ) : (
            <>
              <Mic className="w-8 h-8" aria-hidden="true" />
              <span>ESCUCHAR A LA OTRA PERSONA</span>
            </>
          )}
        </button>

        {heardText && !isListening && (
          <button
            onClick={() => handleGenerateResponses(heardText)}
            disabled={isGenerating}
            className="touch-target min-h-[72px] px-6 py-4 rounded-2xl border-4 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black text-lg flex items-center justify-center gap-3"
            aria-label="Volver a generar opciones de respuesta con IA"
          >
            <RefreshCw className={`w-7 h-7 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Nuevas Respuestas</span>
          </button>
        )}
      </div>

      {/* PANEL DE TRANSCRIPCIÓN EN VIVO (Texto Grande Accesible) */}
      <div
        className="p-6 rounded-3xl border-4 border-a11y-border bg-a11y-card space-y-3"
        role="region"
        aria-label="Transcripción de lo que dice la otra persona"
      >
        <div className="flex items-center justify-between">
          <span className="text-xl font-black text-a11y-primary uppercase tracking-wide flex items-center gap-2">
            <Mic className="w-6 h-6" aria-hidden="true" />
            {isListening ? 'Transcribiendo en vivo...' : 'Lo que ha dicho la otra persona:'}
          </span>
          {isListening && (
            <span className="px-3 py-1 rounded-full bg-red-500 text-black font-black text-xs animate-ping">
              REC
            </span>
          )}
        </div>

        <div
          aria-live="assertive"
          className="text-2xl md:text-3xl font-black min-h-[90px] leading-relaxed text-a11y-text p-4 rounded-2xl bg-a11y-bg border-2 border-a11y-border"
        >
          {heardText || (
            <span className="opacity-50 italic font-normal text-xl">
              Pulsa "Escuchar a la otra persona" para transcribir su voz aquí en tiempo real...
            </span>
          )}
        </div>
      </div>

      {/* ERROR MSG */}
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-2xl border-4 border-red-500 bg-red-950/40 text-red-200 text-lg font-bold"
        >
          {errorMsg}
        </div>
      )}

      {/* TABLERO DE COMUNICACIÓN AUMENTATIVA Y ALTERNATIVA (CAA) */}
      <div className="space-y-4" role="region" aria-label="Tablero de respuestas rápidas con un toque">
        <div className="flex items-center justify-between">
          <h3 className="text-xl md:text-2xl font-black text-a11y-text flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-a11y-primary" aria-hidden="true" />
            Respuestas Rápidas con un Solo Toque (CAA):
          </h3>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="touch-target px-3 py-2 rounded-xl border-2 border-red-500 bg-red-950/40 text-red-300 font-bold text-sm flex items-center gap-2"
              aria-label="Silenciar altavoz inmediatamente"
            >
              <VolumeX className="w-5 h-5" aria-hidden="true" />
              <span>Silenciar</span>
            </button>
          )}
        </div>

        {/* 3 OPCIONES GRANDES DE RESPUESTA DIRECTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="list">
          {quickOptions.map((opt) => (
            <button
              key={opt.id}
              role="listitem"
              onClick={() => handleSelectOption(opt)}
              className="touch-target min-h-[140px] p-5 rounded-3xl border-4 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText hover:scale-102 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 text-center shadow-lg"
              aria-label={`Responder: ${opt.label}. Al tocar, el dispositivo dirá en voz alta: "${opt.speakText}"`}
            >
              <span className="text-4xl md:text-5xl" aria-hidden="true">{opt.emoji}</span>
              <span className="text-xl md:text-2xl font-black leading-tight">{opt.label}</span>
              <span className="text-xs md:text-sm opacity-80 font-bold flex items-center gap-1">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>Hablar por altavoz</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ENTRADA DE TEXTO PERSONALIZADO PARA HABLAR */}
      <form onSubmit={handleSpeakCustom} className="space-y-3 pt-2">
        <label
          htmlFor="custom-speak-input"
          className="block text-lg md:text-xl font-black text-a11y-text"
        >
          O escribe una respuesta personalizada para que el móvil la diga en voz alta:
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="custom-speak-input"
            type="text"
            value={customReply}
            onChange={(e) => setCustomReply(e.target.value)}
            placeholder="Escribe lo que quieres responder..."
            className="flex-1 p-4 rounded-2xl border-4 border-a11y-border bg-a11y-bg text-a11y-text text-xl font-bold placeholder:opacity-50 focus:outline-none"
          />
          <button
            type="submit"
            className="touch-target min-h-[64px] px-8 py-4 rounded-2xl bg-a11y-primary text-a11y-primaryText border-4 border-a11y-border font-black text-xl flex items-center justify-center gap-3 hover:brightness-105 active:scale-95"
            aria-label="Pronunciar texto escrito por el altavoz"
          >
            <Volume2 className="w-7 h-7" aria-hidden="true" />
            <span>Hablar</span>
          </button>
        </div>
      </form>

      {/* HISTORIAL / ÚLTIMA FRASE HABLADA */}
      {lastSpokenText && (
        <div
          className="p-4 rounded-2xl border-2 border-a11y-border bg-a11y-card text-a11y-text flex items-center justify-between"
          role="status"
        >
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-green-400 shrink-0" aria-hidden="true" />
            <p className="font-bold text-base md:text-lg">
              Última respuesta emitida: <span className="underline italic">"{lastSpokenText}"</span>
            </p>
          </div>
          <button
            onClick={() => speak(lastSpokenText, speechRate)}
            className="touch-target px-3 py-2 rounded-xl border border-a11y-border text-sm font-bold"
            aria-label="Repetir última respuesta emitida"
          >
            Repetir
          </button>
        </div>
      )}
    </div>
  );
};
