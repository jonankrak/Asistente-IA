import { useState, useRef, useCallback, useEffect } from 'react';
import { devLogger } from '../services/loggerService';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Iniciar cámara con cámara trasera preferida
  const startCamera = useCallback(async (desiredFacing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    devLogger.info('Camera', `Solicitando acceso a cámara (${desiredFacing})...`);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err = 'La cámara no es accesible en este navegador o entorno (requiere HTTPS o localhost).';
      devLogger.error('Camera', err);
      setCameraError(err);
      return false;
    }

    try {
      // Detener stream previo si existe
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setFacingMode(desiredFacing);
      setIsCameraActive(true);
      devLogger.success('Camera', `Cámara activada correctamente (${desiredFacing})`);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(e => devLogger.warn('Camera', 'Error al reproducir stream de video', String(e)));
      }

      return true;
    } catch (err: any) {
      let message = 'No se pudo acceder a la cámara.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Permiso denegado para usar la cámara. Habilita los permisos de cámara en tu navegador.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No se encontró ninguna cámara conectada al dispositivo.';
      } else if (err.name === 'NotReadableError') {
        message = 'La cámara está siendo utilizada por otra aplicación.';
      }
      devLogger.warn('Camera', `${message} (${err.name || 'Error'})`);
      setCameraError(message);
      setIsCameraActive(false);
      return false;
    }
  }, [facingMode, stream]);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [stream]);

  // Alternar entre cámara trasera y delantera
  const toggleFacingMode = useCallback(async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    return await startCamera(nextMode);
  }, [facingMode, startCamera]);

  // Capturar fotograma actual como Base64 (JPEG sin encabezado data:image/jpeg;base64,)
  const captureFrame = useCallback((): { fullDataUrl: string; base64Data: string } | null => {
    const video = videoRef.current;
    if (!video || !isCameraActive || video.videoWidth === 0) {
      return null;
    }

    try {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }

      // Escalar imagen para envío ultrarrápido a la IA (máximo 1024px)
      const MAX_DIM = 1024;
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) {
          h = Math.round((h * MAX_DIM) / w);
          w = MAX_DIM;
        } else {
          w = Math.round((w * MAX_DIM) / h);
          h = MAX_DIM;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Dibujar fotograma optimizado
      ctx.drawImage(video, 0, 0, w, h);

      const fullDataUrl = canvas.toDataURL('image/jpeg', 0.75);
      const base64Data = fullDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      devLogger.info('Camera', `Fotograma capturado y optimizado (${w}x${h}, ~${Math.round(base64Data.length * 0.75 / 1024)} KB)`);

      return { fullDataUrl, base64Data };
    } catch (err) {
      devLogger.error('Camera', 'Error al capturar fotograma', String(err));
      return null;
    }
  }, [isCameraActive]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    stream,
    isCameraActive,
    cameraError,
    facingMode,
    startCamera,
    stopCamera,
    toggleFacingMode,
    captureFrame,
  };
}
