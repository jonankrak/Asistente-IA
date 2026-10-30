import { useState, useEffect, useRef, useCallback } from 'react';
import { devLogger } from '../services/loggerService';

// Declaración global para reconocimiento de voz en navegadores WebKit/Chromium
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  onTranscriptChange?: (text: string) => void;
  onSilenceTimeout?: () => void;
  silenceTimeoutMs?: number;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const {
    lang = 'es-ES',
    rate = 1.0,
    pitch = 1.0,
    onTranscriptChange,
    onSilenceTimeout,
    silenceTimeoutMs = 3000
  } = options;

  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [recognitionSupported, setRecognitionSupported] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const speechHasStartedRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');

  // Cargar voces disponibles del sistema
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Inicializar SpeechRecognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      setRecognitionSupported(true);
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognitionRef.current = recognition;
      } catch (err) {
        console.error('Error inicializando SpeechRecognition:', err);
      }
    } else {
      setRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [lang]);

  // Limpiar temporizador de silencio
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Iniciar temporizador de silencio (útil para el Modo Visual de 3 segundos)
  const startSilenceTimer = useCallback((onTimeout?: () => void, customMs?: number) => {
    clearSilenceTimer();
    const timeoutDuration = customMs || silenceTimeoutMs;
    silenceTimerRef.current = setTimeout(() => {
      if (!speechHasStartedRef.current && !latestTranscriptRef.current.trim()) {
        if (onTimeout) {
          onTimeout();
        } else if (onSilenceTimeout) {
          onSilenceTimeout();
        }
      }
    }, timeoutDuration);
  }, [clearSilenceTimer, silenceTimeoutMs, onSilenceTimeout]);

  // Comenzar a escuchar por micrófono
  const startListening = useCallback((params?: { timeoutCallback?: () => void; timeoutMs?: number; resetText?: boolean }) => {
    setSpeechError(null);
    if (params?.resetText !== false) {
      setTranscript('');
      latestTranscriptRef.current = '';
    }
    speechHasStartedRef.current = false;

    if (!recognitionRef.current) {
      const err = 'El reconocimiento por voz no es compatible con este navegador. Por favor usa Chrome, Edge o Safari.';
      setSpeechError(err);
      return false;
    }

    try {
      const rec = recognitionRef.current;
      rec.lang = lang;

      rec.onstart = () => {
        setIsListening(true);
        devLogger.info('SpeechRec', 'Micrófono escuchando...');
        if (params?.timeoutCallback || onSilenceTimeout) {
          startSilenceTimer(params?.timeoutCallback, params?.timeoutMs);
        }
      };

      rec.onspeechstart = () => {
        speechHasStartedRef.current = true;
        clearSilenceTimer();
        devLogger.info('SpeechRec', 'Voz humana detectada');
      };

      rec.onresult = (event: any) => {
        speechHasStartedRef.current = true;
        clearSilenceTimer();

        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        const combined = (finalText || interimText).trim();
        latestTranscriptRef.current = combined;
        setTranscript(combined);
        if (finalText) {
          devLogger.success('SpeechRec', `Transcripción final: "${finalText.trim()}"`);
        }
        if (onTranscriptChange) {
          onTranscriptChange(combined);
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          devLogger.info('SpeechRec', 'Sin habla detectada durante el periodo de escucha');
        } else if (event.error === 'not-allowed') {
          const msg = 'Permiso de micrófono denegado. Permite el acceso al micrófono en los ajustes del navegador.';
          devLogger.error('SpeechRec', msg);
          setSpeechError(msg);
          setIsListening(false);
          clearSilenceTimer();
        } else {
          devLogger.warn('SpeechRec', `Aviso de micrófono: ${event.error}`);
          setSpeechError(`Error de micrófono: ${event.error}`);
          setIsListening(false);
          clearSilenceTimer();
        }
      };

      rec.onend = () => {
        setIsListening(false);
        clearSilenceTimer();
      };

      rec.start();
      return true;
    } catch (err: any) {
      console.warn('Excepción al iniciar reconocimiento de voz:', err);
      // Si ya estaba activo, intentar reiniciarlo
      if (err.name !== 'InvalidStateError') {
        setSpeechError('No se pudo activar el reconocimiento de voz.');
      }
      return false;
    }
  }, [lang, onSilenceTimeout, startSilenceTimer, clearSilenceTimer, onTranscriptChange]);

  // Detener escucha
  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
  }, [clearSilenceTimer]);

  // Síntesis de voz (TTS) accesible
  const speak = useCallback((textToSpeak: string, customRate?: number, onEndCallback?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechError('La síntesis de voz no está soportada en este navegador.');
      return;
    }

    // Cancelar cualquier lectura previa para evitar solapamientos
    window.speechSynthesis.cancel();

    if (!textToSpeak.trim()) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang;
    utterance.rate = customRate || rate;
    utterance.pitch = pitch;

    // Buscar una voz nativa en español
    const currentVoices = window.speechSynthesis.getVoices();
    const esVoice = currentVoices.find(v => v.lang.startsWith('es') || v.lang.includes('es-')) || currentVoices[0];
    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      devLogger.info('TTS', `Reproduciendo voz (${esVoice?.name || 'default'}): "${textToSpeak.slice(0, 60)}..."`);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = (e) => {
      devLogger.warn('TTS', `Error o cancelación de síntesis de voz: ${e.error}`);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [lang, rate, pitch]);

  // Detener voz inmediatamente
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    isSpeaking,
    speechError,
    recognitionSupported,
    voices,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearSilenceTimer,
  };
}
