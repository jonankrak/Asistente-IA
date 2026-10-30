export type LogLevel = 'info' | 'api' | 'success' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: string;
}

type LogListener = (logs: LogEntry[]) => void;

class LoggerService {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs = 200;

  constructor() {
    this.add('info', 'Sistema', 'Consola de desarrollador inicializada.');
    this.setupGlobalErrorListeners();
  }

  private getTimestamp(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  private setupGlobalErrorListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.add(
        'error',
        'WindowError',
        event.message || 'Error global de ejecución',
        `${event.filename || ''}:${event.lineno || ''}:${event.colno || ''}`
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.message || String(event.reason);
      this.add('error', 'PromiseRejection', `Promesa rechazada: ${reason}`, event.reason?.stack);
    });
  }

  public add(level: LogLevel, source: string, message: string, details?: any) {
    let formattedDetails: string | undefined = undefined;
    if (details !== undefined && details !== null) {
      if (typeof details === 'string') {
        formattedDetails = details;
      } else {
        try {
          formattedDetails = JSON.stringify(details, null, 2);
        } catch {
          formattedDetails = String(details);
        }
      }
    }

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: this.getTimestamp(),
      level,
      source,
      message,
      details: formattedDetails,
    };

    this.logs = [...this.logs.slice(-(this.maxLogs - 1)), entry];
    this.notify();
  }

  public info(source: string, message: string, details?: any) {
    this.add('info', source, message, details);
  }

  public api(source: string, message: string, details?: any) {
    this.add('api', source, message, details);
  }

  public success(source: string, message: string, details?: any) {
    this.add('success', source, message, details);
  }

  public warn(source: string, message: string, details?: any) {
    this.add('warn', source, message, details);
  }

  public error(source: string, message: string, details?: any) {
    this.add('error', source, message, details);
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clear() {
    this.logs = [];
    this.add('info', 'Sistema', 'Consola limpiada.');
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.logs);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.logs);
    }
  }
}

export const devLogger = new LoggerService();
