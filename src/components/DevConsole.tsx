import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Copy, Play, X, Check, Cpu } from 'lucide-react';
import { devLogger, LogEntry, LogLevel } from '../services/loggerService';
import { aiService, GEMINI_MODELS } from '../services/aiService';
import { useAccessibility } from '../context/AccessibilityContext';

export const DevConsole: React.FC = () => {
  const { isDevConsoleOpen, setIsDevConsoleOpen, hasApiKey } = useAccessibility();
  const [logs, setLogs] = useState<LogEntry[]>(devLogger.getLogs());
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = devLogger.subscribe((updatedLogs) => {
      setLogs([...updatedLogs]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isDevConsoleOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isDevConsoleOpen]);

  if (!isDevConsoleOpen) return null;

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const handleTestApi = async () => {
    setIsTestingApi(true);
    try {
      await aiService.testConnection();
    } catch {
      // El error ya queda registrado automáticamente en devLogger
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleCopyLogs = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}${l.details ? '\n  ' + l.details : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getBadgeStyle = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'bg-red-600 text-white border-red-400';
      case 'warn':
        return 'bg-amber-500 text-black border-amber-300';
      case 'success':
        return 'bg-emerald-500 text-black border-emerald-300';
      case 'api':
        return 'bg-cyan-500 text-black border-cyan-300';
      default:
        return 'bg-slate-700 text-slate-200 border-slate-500';
    }
  };

  const speechRecSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const camSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Consola de Desarrollador y Diagnóstico en Tiempo Real"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] bg-zinc-950 border-t-4 border-cyan-400 text-zinc-100 shadow-2xl flex flex-col font-mono text-sm"
    >
      {/* Cabecera de la Consola de Desarrollador */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          <span className="font-bold text-cyan-400 text-base">
            CONSOLA DE DESARROLLADOR (LOGS & DIAGNÓSTICO EN VIVO)
          </span>
          <span className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {logs.length} eventos
          </span>
        </div>

        {/* Botones de Acción del Desarrollador */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTestApi}
            disabled={isTestingApi}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Enviar un ping de prueba a Gemini y medir latencia"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isTestingApi ? 'Probando API...' : 'Probar API Gemini'}</span>
          </button>

          <button
            onClick={handleCopyLogs}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado' : 'Copiar Logs'}</span>
          </button>

          <button
            onClick={() => devLogger.clear()}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Limpiar</span>
          </button>

          <button
            onClick={() => setIsDevConsoleOpen(false)}
            className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-700 text-white border border-red-500 font-bold text-xs flex items-center gap-1"
            aria-label="Cerrar consola de desarrollador"
          >
            <X className="w-4 h-4" />
            <span>Cerrar</span>
          </button>
        </div>
      </div>

      {/* Barra de Estado de Sub-sistemas y Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <strong className="text-zinc-400">Cadena IA:</strong>
            <span className="text-cyan-300">{GEMINI_MODELS.join(' → ')}</span>
          </span>
          <span className={hasApiKey ? 'text-emerald-400' : 'text-red-400'}>
            ● API Key: {hasApiKey ? 'Configurada' : 'Falta clave'}
          </span>
          <span className={camSupported ? 'text-emerald-400' : 'text-amber-400'}>
            ● Cámara API: {camSupported ? 'Soportada' : 'No disponible'}
          </span>
          <span className={speechRecSupported ? 'text-emerald-400' : 'text-amber-400'}>
            ● STT Voz: {speechRecSupported ? 'Soportado' : 'No soportado'}
          </span>
          <span className={ttsSupported ? 'text-emerald-400' : 'text-amber-400'}>
            ● TTS Voz: {ttsSupported ? 'Soportado' : 'No soportado'}
          </span>
        </div>

        {/* Filtros por nivel */}
        <div className="flex items-center gap-1">
          {(['all', 'api', 'info', 'success', 'warn', 'error'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-2 py-0.5 rounded uppercase font-bold text-[11px] border ${
                filter === lvl
                  ? 'bg-cyan-500 text-black border-cyan-300'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              {lvl === 'all' ? 'Todos' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Logs en Vivo */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[48vh] bg-black/95">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 italic">
            No hay registros que coincidan con el filtro seleccionado.
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className={`p-2 rounded border text-xs leading-relaxed flex flex-col gap-1 ${
                entry.level === 'error'
                  ? 'bg-red-950/30 border-red-800 text-red-200'
                  : entry.level === 'warn'
                  ? 'bg-amber-950/25 border-amber-800/70 text-amber-200'
                  : entry.level === 'api'
                  ? 'bg-cyan-950/20 border-cyan-900/60 text-cyan-100'
                  : entry.level === 'success'
                  ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-200'
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 shrink-0 select-all">[{entry.timestamp}]</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase border shrink-0 ${getBadgeStyle(entry.level)}`}>
                  {entry.level}
                </span>
                <span className="font-bold text-cyan-400 shrink-0">[{entry.source}]</span>
                <span className="flex-1 break-words font-medium">{entry.message}</span>
              </div>

              {entry.details && (
                <pre className="mt-1 p-2 rounded bg-black/80 border border-zinc-800 text-zinc-300 overflow-x-auto text-[11px] whitespace-pre-wrap">
                  {entry.details}
                </pre>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
