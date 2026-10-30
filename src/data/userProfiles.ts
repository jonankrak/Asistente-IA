import { ProfileCategory, UserProfileId, UserProfileOption } from '../types';

export const PROFILE_CATEGORIES: ProfileCategory[] = [
  {
    id: 'di',
    title: 'Discapacidad Intelectual',
    emoji: '🧠',
    subtitle: 'Adaptación según autonomía personal, razonamiento conceptual y nivel de lectoescritura',
    options: [
      {
        id: 'di-leve',
        categoryId: 'di',
        categoryLabel: 'Discapacidad Intelectual',
        levelLabel: 'Leve',
        shortTitle: 'DI Leve',
        description:
          'Autonomía personal en tareas cotidianas, comprensión de conceptos concretos y lectoescritura básica funcional. Requieren apoyos en contenidos abstractos.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 0.95,
        dyslexiaFriendly: false,
        stepByStepFocus: false,
        aiDirective:
          'PERFIL ACTIVO: Discapacidad Intelectual Leve. El usuario tiene lectoescritura básica funcional y comprende conceptos concretos, pero necesita apoyo en ideas abstractas. Convierte cualquier concepto abstracto en ejemplos concretos de la vida cotidiana, usa vocabulario frecuente y frases cortas de hasta 12 palabras.'
      },
      {
        id: 'di-moderada',
        categoryId: 'di',
        categoryLabel: 'Discapacidad Intelectual',
        levelLabel: 'Moderada',
        shortTitle: 'DI Moderada',
        description:
          'Dificultades notables en la comunicación y el razonamiento conceptual. Precisan apoyos continuos y adaptar el texto a niveles muy iniciales (con apoyo gráfico explícito).',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.85,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        aiDirective:
          'PERFIL ACTIVO: Discapacidad Intelectual Moderada. El usuario presenta dificultades notables en comunicación y razonamiento conceptual y precisa nivel muy inicial con apoyo gráfico explícito. Usa frases de máximo 6 a 8 palabras, palabras de uso muy básico y cotidiano (sujeto + verbo + objeto directo) y apoyo visual directo.'
      },
      {
        id: 'di-grave',
        categoryId: 'di',
        categoryLabel: 'Discapacidad Intelectual',
        levelLabel: 'Grave / Profunda',
        shortTitle: 'DI Grave / Profunda',
        description:
          'Limitaciones severas en la comunicación verbal y la autonomía; no suelen trabajar con adaptaciones textuales estándar, sino con sistemas alternativos de comunicación.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.8,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        aiDirective:
          'PERFIL ACTIVO: Discapacidad Intelectual Grave / Profunda. El usuario requiere Sistemas Aumentativos y Alternativos de Comunicación (SAAC / Pictogramas ARASAAC) en lugar de texto estándar. Reduce cada paso a 2-4 conceptos clave ultra básicos (ej. "Beber agua", "Lavar manos", "Pedir ayuda") con verbos y sustantivos muy concretos.'
      }
    ]
  },
  {
    id: 'tea',
    title: 'Trastorno del Espectro Autista (TEA)',
    emoji: '🧩',
    subtitle: 'Adaptación según necesidad de apoyo en comunicación social, literalidad y flexibilidad cognitiva',
    options: [
      {
        id: 'tea-grado1',
        categoryId: 'tea',
        categoryLabel: 'Trastorno del Espectro Autista (TEA)',
        levelLabel: 'Grado 1 (Necesita ayuda)',
        shortTitle: 'TEA Grado 1',
        description:
          'Puede comunicarse con oraciones completas, pero presenta dificultades en la interacción social y en la interpretación del lenguaje figurado o el contexto implícito.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 1.0,
        dyslexiaFriendly: false,
        stepByStepFocus: false,
        aiDirective:
          'PERFIL ACTIVO: TEA Grado 1 (Necesita ayuda). El usuario se comunica con oraciones completas pero tiene dificultad con el lenguaje figurado y el contexto implícito. Usa lenguaje 100% literal, explícito y predecible. Explica de forma explícita cualquier norma social o intención implícita, evitando dobles sentidos, ironías, modismos o metáforas.'
      },
      {
        id: 'tea-grado2',
        categoryId: 'tea',
        categoryLabel: 'Trastorno del Espectro Autista (TEA)',
        levelLabel: 'Grado 2 (Necesita ayuda notable)',
        shortTitle: 'TEA Grado 2',
        description:
          'Capacidad de comunicación verbal limitada a frases sencillas, respuestas focales y gran rigidez cognitiva.',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.9,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        aiDirective:
          'PERFIL ACTIVO: TEA Grado 2 (Necesita ayuda notable). Comunicación verbal limitada a frases sencillas y alta rigidez cognitiva. Estructura la información como una rutina secuencial muy predecible y ordenada ("Primero...", "Después...", "Por último..."), con frases muy cortas (máximo 7 palabras), sin ambigüedades ni cambios imprevistos.'
      },
      {
        id: 'tea-grado3',
        categoryId: 'tea',
        categoryLabel: 'Trastorno del Espectro Autista (TEA)',
        levelLabel: 'Grado 3 (Necesita ayuda muy notable)',
        shortTitle: 'TEA Grado 3',
        description:
          'Comunicación verbal mínima o ausente; requiere apoyo constante para cualquier actividad de aprendizaje.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.8,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        aiDirective:
          'PERFIL ACTIVO: TEA Grado 3 (Necesita ayuda muy notable). Comunicación verbal mínima o ausente; requiere apoyo constante y secuencias pictográficas muy elementales. Usa consignas de 2 a 4 palabras altamente visuales y concretas (acción + objeto), ideales para tableros de pictogramas ARASAAC y comunicador CAA.'
      }
    ]
  },
  {
    id: 'dislexia',
    title: 'Trastornos Específicos del Aprendizaje (Dislexia / Lectoescritura)',
    emoji: '📖',
    subtitle: 'Adaptación en decodificación lectora, fluidez, espaciado tipográfico y apoyo fonológico/audio',
    options: [
      {
        id: 'dislexia-leve',
        categoryId: 'dislexia',
        categoryLabel: 'Dislexia / Lectoescritura',
        levelLabel: 'Leve',
        shortTitle: 'Dislexia Leve',
        description:
          'Algunas dificultades para decodificar o comprender, pero el alumno puede compensarlas con apoyos puntuales o más tiempo.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 0.95,
        dyslexiaFriendly: true,
        stepByStepFocus: false,
        aiDirective:
          'PERFIL ACTIVO: Dislexia / Trastorno de Lectoescritura Leve. Evita palabras largas o trabadas difíciles de decodificar, usa frases bien puntuadas de longitud moderada (máx. 12 palabras) y destaca claramente la idea principal de cada paso.'
      },
      {
        id: 'dislexia-moderado',
        categoryId: 'dislexia',
        categoryLabel: 'Dislexia / Lectoescritura',
        levelLabel: 'Moderado',
        shortTitle: 'Dislexia Moderada',
        description:
          'Dificultades marcadas en la fluidez y comprensión; requiere adaptaciones metodológicas continuas (tipografía especial, lectura fácil, audio).',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.85,
        dyslexiaFriendly: true,
        stepByStepFocus: false,
        aiDirective:
          'PERFIL ACTIVO: Dislexia / Trastorno de Lectoescritura Moderado. El usuario tiene dificultades marcadas en fluidez y comprensión lectora. Usa exclusivamente palabras cortas y transparentes (máximo 3-4 sílabas), evita palabras visual o fonéticamente parecidas que generen confusión, y redacta frases muy breves (máximo 10 palabras) pensadas para ser escuchadas con apoyo de voz.'
      },
      {
        id: 'dislexia-grave',
        categoryId: 'dislexia',
        categoryLabel: 'Dislexia / Lectoescritura',
        levelLabel: 'Grave',
        shortTitle: 'Dislexia Grave',
        description:
          'Incapacidad o gran dificultad para la decodificación automatizada, lo que impide la lectura autónoma sin apoyos intensivos.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.8,
        dyslexiaFriendly: true,
        stepByStepFocus: true,
        aiDirective:
          'PERFIL ACTIVO: Dislexia / Trastorno de Lectoescritura Grave. Gran dificultad para la decodificación automatizada; requiere apoyo auditivo (TTS) y pictográfico intensivo. Usa frases mínimas (4 a 7 palabras) con vocabulario bisílabo o trisílabo muy sencillo y apoyo directo de pictogramas y lectura en voz alta.'
      }
    ]
  },
  {
    id: 'tdah',
    title: 'TDAH (Déficit de Atención e Hiperactividad)',
    emoji: '⚡',
    subtitle: 'Adaptación mediante fragmentación de tareas, control de distractores y pausas guiadas',
    options: [
      {
        id: 'tdah-leve',
        categoryId: 'tdah',
        categoryLabel: 'TDAH',
        levelLabel: 'Leve',
        shortTitle: 'TDAH Leve',
        description:
          'Pocos síntomas de inatención o impulsividad que interfieren mínimamente en el rendimiento escolar.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 1.0,
        dyslexiaFriendly: false,
        stepByStepFocus: false,
        aiDirective:
          'PERFIL ACTIVO: TDAH Leve. Organiza la información en pasos claros, directos y accionables, comenzando cada paso con un verbo de acción para mantener el foco y evitar que se salte detalles por impulsividad.'
      },
      {
        id: 'tdah-moderado',
        categoryId: 'tdah',
        categoryLabel: 'TDAH',
        levelLabel: 'Moderado',
        shortTitle: 'TDAH Moderado',
        description:
          'Dificultad para mantener la atención en textos largos, requiriendo fragmentación del contenido y formato estructurado.',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 1.0,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        aiDirective:
          'PERFIL ACTIVO: TDAH Moderado. El usuario tiene dificultad para mantener la atención en textos largos. Fragmenta el contenido en micro-tareas muy concretas y breves (máximo 8-10 palabras por paso), eliminando todo texto de relleno y usando un formato altamente estructurado.'
      },
      {
        id: 'tdah-grave',
        categoryId: 'tdah',
        categoryLabel: 'TDAH',
        levelLabel: 'Grave',
        shortTitle: 'TDAH Grave',
        description:
          'Altamente distractor, exige tareas muy breves, guiadas y con constantes pausas de descanso.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.95,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        aiDirective:
          'PERFIL ACTIVO: TDAH Grave. El usuario se distrae con gran facilidad y exige tareas ultra breves, muy guiadas y con pausas de descanso. Divide la actividad en micro-pasos de máximo 6 palabras cada uno e INTERCALA explícitamente pasos cortos de pausa/descanso y autoverificación cada 2 o 3 acciones (ej. "⏸️ Pausa breve: respira hondo y descansa 30 segundos antes de seguir").'
      }
    ]
  }
];

export const ALL_USER_PROFILES: UserProfileOption[] = PROFILE_CATEGORIES.flatMap(
  (cat) => cat.options
);

export function getUserProfileById(id: UserProfileId | null | undefined): UserProfileOption {
  return (
    ALL_USER_PROFILES.find((p) => p.id === id) ||
    ALL_USER_PROFILES[0] // Por defecto: Discapacidad Intelectual Leve
  );
}
