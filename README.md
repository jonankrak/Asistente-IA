# Asistente Adaptado Multimodal con IA (WCAG 2.2 Nivel AAA)

Prototipo funcional (MVP) de un **Asistente Adaptado Multimodal con Inteligencia Artificial** diseñado específicamente para personas con discapacidad visual, cognitiva y auditiva/del habla. Cumple estrictamente con las directrices de accesibilidad web **WCAG 2.2 Nivel AAA** e integra el SDK oficial de **Google Gemini** (`@google/genai`) con el modelo de baja latencia `gemini-3.8-flash`.

---

## 🌟 Características Principales

### 1. Perfiles de Asistencia Adaptativos (Selector en la UI)

#### 👁️ Modo 1: Visual (Ojos Digitales)
- **UI:** Un botón gigante central que ocupa el 80% del área de interacción táctil.
- **Flujo:** Al pulsar (o presionar la `Barra Espaciadora`), emite vibración corta háptica, captura un fotograma con la cámara trasera y activa el micrófono.
- **Temporizador Inteligente:** Si el usuario no habla durante 3 segundos, se activa automáticamente la descripción general del entorno inmediato. Si el usuario formula una pregunta, la IA responde directamente a su duda analizando la imagen.
- **System Instruction de la IA:**
  > *"Eres un asistente visual para una persona ciega. Sé directo, conciso y describe las posiciones usando las agujas del reloj y distancias aproximadas. Prioriza peligros u obstáculos, textos visibles y objetos cercanos. No uses introducciones como 'En esta imagen veo...'."*
- **Salida:** Lectura por voz automática (TTS) con velocidad personalizable.

#### 🧠 Modo 2: Cognitivo (Lectura Fácil y Rutinas)
- **UI:** Interfaz libre de distracciones, con tipografía sans-serif grande (mínimo 20px), colores suaves y alto contraste.
- **Flujo:** Permite fotografiar un documento complejo (factura, carta médica, prospecto) mediante la cámara o subida de imagen, o dictar/escribir una tarea cotidiana (ej: *"Cómo poner la lavadora"*).
- **System Instruction de la IA:**
  > *"Adapta cualquier texto o instrucción a formato de Lectura Fácil. Usa frases cortas, una sola idea por línea, lenguaje 100% literal (sin metáforas ni ironías) y divide las tareas en pasos numerados muy sencillos con un emoji representativo al inicio de cada paso."*
- **Salida:** Tarjetas interactivas con casillas de verificación de gran tamaño, barra de progreso accesible y botón de audio individual para escuchar cada paso por separado.

#### 💬 Modo 3: Auditivo / Habla (Comunicador Rápido - CAA)
- **UI:** Transcriptor en vivo con texto de gran escala y tablero de Comunicación Aumentativa y Alternativa (CAA).
- **Flujo:** Escucha continua de la conversación mediante reconocimiento de voz en tiempo real (`SpeechRecognition`).
- **IA Contextual:** Genera exactamente 3 opciones de respuesta rápida adaptadas a lo que dijo el interlocutor.
- **Salida con 1 Toque:** Al presionar cualquiera de las opciones (o escribir un texto personalizado), el dispositivo lo pronuncia en voz alta a través del altavoz mediante `SpeechSynthesis`.

---

## ♿ Cumplimiento Estricto de Accesibilidad (WCAG 2.2 AAA)

- **Objetivos Táctiles (Target Size AAA - Criterio 2.5.5 / 2.5.8):** Todos los botones y controles interactivos tienen un área mínima de **64x64px**, superando los mínimos estándar.
- **Contraste de Color:** 4 temas de alto contraste seleccionables:
  - **Amarillo sobre Negro:** Ratio superior a 19:1 para baja visión severa.
  - **Blanco sobre Negro:** 21:1 contraste puro.
  - **Negro sobre Blanco:** Fondo claro de alto contraste.
  - **Estándar Accesible:** Paleta moderna optimizada.
- **Foco de Teclado Visible:** Contornos reforzados de 4px (`outline: 4px solid var(--color-focus)`) con desplazamiento (`outline-offset: 4px`).
- **Atributos ARIA Completos:**
  - `aria-live="assertive"` para anuncios críticos e inmediatos de la IA.
  - `aria-live="polite"` para confirmaciones y cambios de estado.
  - `role="alert"`, `role="status"`, `role="region"`, `role="progressbar"` y `aria-label` descriptivos en todos los controles interactivos.
  - Enlace de salto accesible (*Skip Link*) al inicio del documento.
- **Atajos de Teclado:**
  - `Barra Espaciadora`: Activar botón principal / Captura visual
  - `Tecla 1`: Modo Visual
  - `Tecla 2`: Modo Cognitivo
  - `Tecla 3`: Modo Auditivo
  - `Tecla S`: Abrir / Cerrar ventana de Ajustes
  - `Escape`: Cancelar audio o cerrar modales
- **Manejo Accesible de Errores:** Tanto visual como auditivo (anunciado por TTS) si la cámara no tiene permisos, no hay conexión o falta la clave API.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS.
- **APIs Nativas del Navegador:**
  - `Web Speech API`: `SpeechRecognition` (entrada por voz con soporte WebKit/Chromium) y `SpeechSynthesis` (lectura con control de velocidad y voz en español).
  - `MediaDevices API`: `getUserMedia` con preferencia de cámara trasera (`facingMode: { ideal: "environment" }`) y captura a través de Canvas.
  - `Vibration API`: `navigator.vibrate` con patrones para éxito, error y activación.
- **IA / Backend:** SDK Oficial `@google/genai` con modelo `gemini-3.8-flash`.
- **PWA:** Web App Manifest (`manifest.json`) y metadatos adaptables.

---

## 📁 Estructura del Proyecto

```text
TIC APPS/
├── .env.example                       # Plantilla de variable de entorno
├── .env                               # Clave local VITE_GEMINI_API_KEY
├── index.html                         # Plantilla HTML con metadatos PWA y accesibilidad
├── package.json                       # Dependencias y scripts
├── postcss.config.js                  # Configuración PostCSS
├── tailwind.config.js                 # Configuración Tailwind y temas de color A11y
├── tsconfig.json                      # Configuración TypeScript modo bundler
├── vite.config.ts                     # Configuración del servidor de desarrollo Vite
├── public/
│   ├── icon.svg                       # Icono vectorial accesible PWA
│   └── manifest.json                  # Manifiesto PWA para instalación en móviles
└── src/
    ├── App.tsx                        # Componente raíz con layout y Skip Link
    ├── index.css                      # Variables CSS y temas de contraste WCAG AAA
    ├── main.tsx                       # Punto de entrada de React
    ├── vite-env.d.ts                  # Tipado de Vite y variables de entorno
    ├── types/
    │   └── index.ts                   # Interfaces y tipos del asistente
    ├── services/
    │   └── aiService.ts               # Integración con SDK @google/genai (Gemini 3.8)
    ├── hooks/
    │   ├── useCamera.ts               # Hook de MediaDevices y captura de fotogramas
    │   ├── useHaptics.ts              # Hook de Vibration API
    │   └── useSpeech.ts               # Hook de Web Speech API (STT y TTS)
    ├── context/
    │   └── AccessibilityContext.tsx   # Estado global accesible y atajos de teclado
    └── components/
        ├── A11yAnnouncer.tsx          # Regiones aria-live para lectores de pantalla
        ├── Header.tsx                 # Barra superior y selector de modos (≥64px)
        ├── VisualMode.tsx             # Modo 1: Ojos Digitales (Botón 80%)
        ├── CognitiveMode.tsx          # Modo 2: Lectura Fácil y Rutinas
        ├── AuditoryMode.tsx           # Modo 3: Comunicador Rápido (CAA)
        └── SettingsModal.tsx          # Modal de configuración de clave y accesibilidad
```

---

## 🚀 Instrucciones de Instalación y Ejecución

### 1. Ejecución con un solo clic (.exe)
Simplemente haz doble clic sobre el archivo ejecutable:
```text
AsistenteIA.exe
```
O ejecuta `iniciar.bat`.
Esto iniciará automáticamente un servidor local autónomo y abrirá el Asistente en una ventana de aplicación de escritorio sin distracciones ni barras de navegación.

### 2. Configurar la Clave API de Gemini
Puedes ingresar tu clave directamente desde la interfaz web pulsando el botón **Ajustes** (o la tecla **S**), o configurarla en el archivo `.env`:
```env
VITE_GEMINI_API_KEY=tu_clave_api_aqui
```

### 3. Modo Desarrollador (Opcional)
Si deseas modificar el código en vivo:
```bash
npm run dev
```

Y para volver a compilar el ejecutable tras hacer cambios:
```bash
npm run build:exe
```
