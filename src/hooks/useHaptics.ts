import { useCallback } from 'react';

export function useHaptics() {
  const isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if (isSupported) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Fallback silencioso si el navegador restringe la vibración
        console.warn('Vibration API no disponible o bloqueada:', err);
      }
    }
  }, [isSupported]);

  // Vibración corta para activación de botones táctiles
  const triggerShort = useCallback(() => vibrate(60), [vibrate]);

  // Doble pulso para confirmación o acción completada
  const triggerSuccess = useCallback(() => vibrate([60, 40, 80]), [vibrate]);

  // Pulso prolongado o alerta para errores
  const triggerError = useCallback(() => vibrate([150, 60, 150]), [vibrate]);

  // Pulso de cuenta regresiva o aviso de escucha
  const triggerListening = useCallback(() => vibrate(100), [vibrate]);

  return {
    isSupported,
    vibrate,
    triggerShort,
    triggerSuccess,
    triggerError,
    triggerListening,
  };
}
