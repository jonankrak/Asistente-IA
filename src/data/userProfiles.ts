import { ProfileCategory, UserProfileId, UserProfileOption } from '../types';

export const PROFILE_CATEGORIES: ProfileCategory[] = [
  {
    id: 'di',
    title: 'Comprender textos',
    emoji: '🧠',
    subtitle: 'Vocabulario, ideas abstractas y textos largos: ejemplos concretos, frases cortas y apoyo visual',
    options: [
      {
        id: 'di-leve',
        categoryId: 'di',
        categoryLabel: 'Comprender textos',
        levelLabel: 'Apoyo puntual',
        shortTitle: 'Comprender textos · apoyo puntual',
        description:
          'Entiende textos sencillos y conceptos concretos; necesita ayuda con las ideas abstractas.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedTheme: 'default',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 0.95,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: false,
        stepByStepFocus: false,
        maxWordsPerSentence: 12,
        aiDirective:
          'PERFIL DE APOYO: comprensión con apoyo puntual. Convierte cualquier concepto abstracto en ejemplos concretos de la vida cotidiana, usa vocabulario frecuente y frases cortas de hasta 12 palabras.'
      },
      {
        id: 'di-moderada',
        categoryId: 'di',
        categoryLabel: 'Comprender textos',
        levelLabel: 'Apoyo frecuente',
        shortTitle: 'Comprender textos · apoyo frecuente',
        description:
          'Necesita textos muy sencillos, frases cortas y apoyo gráfico para entender la información.',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedTheme: 'dark-high',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.85,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        maxWordsPerSentence: 8,
        aiDirective:
          'PERFIL DE APOYO: comprensión con apoyo frecuente. Usa frases de 6 a 8 palabras como máximo, palabras de uso muy básico y cotidiano (sujeto + verbo + complemento) y apoyo visual directo.'
      },
      {
        id: 'di-grave',
        categoryId: 'di',
        categoryLabel: 'Comprender textos',
        levelLabel: 'Apoyo intenso',
        shortTitle: 'Comprender textos · apoyo intenso',
        description:
          'Se comunica sobre todo con pictogramas u otros sistemas de comunicación aumentativa; el texto escrito le ayuda poco.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedTheme: 'yellow-black',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.75,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        maxWordsPerSentence: 5,
        aiDirective:
          'PERFIL DE APOYO: comprensión con apoyo intenso mediante pictogramas. Reduce cada paso a 2-4 conceptos clave muy básicos (ej. "Beber agua", "Lavar manos", "Pedir ayuda") con verbos y sustantivos muy concretos.'
      }
    ]
  },
  {
    id: 'tea',
    title: 'Entender instrucciones y anticipar rutinas',
    emoji: '🧩',
    subtitle: 'Lenguaje figurado, información implícita y cambios: lenguaje literal, pasos ordenados y apoyo visual',
    options: [
      {
        id: 'tea-grado1',
        categoryId: 'tea',
        categoryLabel: 'Entender instrucciones y anticipar rutinas',
        levelLabel: 'Apoyo puntual',
        shortTitle: 'Instrucciones y rutinas · apoyo puntual',
        description:
          'Lee frases completas, pero le cuesta el lenguaje figurado y lo que no se dice de forma explícita.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedTheme: 'default',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 1.0,
        recommendedAutoSpeak: false,
        recommendedHaptic: false,
        dyslexiaFriendly: false,
        stepByStepFocus: false,
        maxWordsPerSentence: 14,
        aiDirective:
          'PERFIL DE APOYO: lenguaje literal con apoyo puntual. Usa lenguaje 100% literal, explícito y predecible. Explica de forma explícita cualquier norma o intención implícita, sin dobles sentidos, ironías, modismos ni metáforas.'
      },
      {
        id: 'tea-grado2',
        categoryId: 'tea',
        categoryLabel: 'Entender instrucciones y anticipar rutinas',
        levelLabel: 'Apoyo frecuente',
        shortTitle: 'Instrucciones y rutinas · apoyo frecuente',
        description:
          'Entiende mejor la información en frases sencillas, con un orden fijo y sin cambios imprevistos.',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedTheme: 'default',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.9,
        recommendedAutoSpeak: true,
        recommendedHaptic: false,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        maxWordsPerSentence: 7,
        aiDirective:
          'PERFIL DE APOYO: lenguaje literal y anticipación con apoyo frecuente. Estructura la información como una rutina secuencial predecible ("Primero...", "Después...", "Por último..."), con frases de 7 palabras como máximo, sin ambigüedades ni cambios imprevistos.'
      },
      {
        id: 'tea-grado3',
        categoryId: 'tea',
        categoryLabel: 'Entender instrucciones y anticipar rutinas',
        levelLabel: 'Apoyo intenso',
        shortTitle: 'Instrucciones y rutinas · apoyo intenso',
        description:
          'Se apoya sobre todo en pictogramas y consignas muy breves para seguir una actividad.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedTheme: 'dark-high',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.8,
        recommendedAutoSpeak: true,
        recommendedHaptic: false,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        maxWordsPerSentence: 4,
        aiDirective:
          'PERFIL DE APOYO: anticipación con apoyo intenso mediante pictogramas. Usa consignas de 2 a 4 palabras muy visuales y concretas (acción + objeto), adecuadas para tableros de pictogramas ARASAAC.'
      }
    ]
  },
  {
    id: 'dislexia',
    title: 'Leer con más facilidad',
    emoji: '📖',
    subtitle: 'Leer el texto escrito: palabras sencillas, tipografía espaciada y lectura en voz alta',
    options: [
      {
        id: 'dislexia-leve',
        categoryId: 'dislexia',
        categoryLabel: 'Leer con más facilidad',
        levelLabel: 'Apoyo puntual',
        shortTitle: 'Leer con facilidad · apoyo puntual',
        description:
          'Lee con algo de esfuerzo; le ayudan las palabras sencillas y algo más de tiempo.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedTheme: 'default',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 0.95,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: true,
        stepByStepFocus: false,
        maxWordsPerSentence: 12,
        aiDirective:
          'PERFIL DE APOYO: lectura con apoyo puntual. Evita palabras largas o difíciles de descodificar, usa frases bien puntuadas de hasta 12 palabras y destaca la idea principal de cada paso.'
      },
      {
        id: 'dislexia-moderado',
        categoryId: 'dislexia',
        categoryLabel: 'Leer con más facilidad',
        levelLabel: 'Apoyo frecuente',
        shortTitle: 'Leer con facilidad · apoyo frecuente',
        description:
          'Leer le cuesta bastante; le ayudan la tipografía espaciada, las frases breves y escuchar el texto.',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedTheme: 'white-black',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.85,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: true,
        stepByStepFocus: true,
        maxWordsPerSentence: 10,
        aiDirective:
          'PERFIL DE APOYO: lectura con apoyo frecuente. Usa palabras cortas y transparentes (3-4 sílabas como máximo), evita palabras visual o fonéticamente parecidas y redacta frases de hasta 10 palabras pensadas para escucharse en voz alta.'
      },
      {
        id: 'dislexia-grave',
        categoryId: 'dislexia',
        categoryLabel: 'Leer con más facilidad',
        levelLabel: 'Apoyo intenso',
        shortTitle: 'Leer con facilidad · apoyo intenso',
        description:
          'Necesita escuchar el texto y apoyarse en pictogramas para acceder a la información.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'pictograms',
        recommendedTheme: 'yellow-black',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.8,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: true,
        stepByStepFocus: true,
        maxWordsPerSentence: 7,
        aiDirective:
          'PERFIL DE APOYO: lectura con apoyo intenso por voz y pictogramas. Usa frases de 4 a 7 palabras con vocabulario muy sencillo, pensadas para lectura en voz alta y acompañadas de pictogramas.'
      }
    ]
  },
  {
    id: 'tdah',
    title: 'Mantener la atención y seguir pasos',
    emoji: '⚡',
    subtitle: 'Mantener la atención en textos largos: pasos breves, una idea cada vez y pausas',
    options: [
      {
        id: 'tdah-leve',
        categoryId: 'tdah',
        categoryLabel: 'Mantener la atención y seguir pasos',
        levelLabel: 'Apoyo puntual',
        shortTitle: 'Atención y pasos · apoyo puntual',
        description:
          'Sigue bien las tareas si los pasos son claros y empiezan por una acción.',
        badgeColor: 'border-emerald-500 bg-emerald-950/40 text-emerald-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedTheme: 'default',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 1.0,
        recommendedAutoSpeak: false,
        recommendedHaptic: true,
        dyslexiaFriendly: false,
        stepByStepFocus: false,
        maxWordsPerSentence: 12,
        aiDirective:
          'PERFIL DE APOYO: atención con apoyo puntual. Organiza la información en pasos claros y accionables, empezando cada paso con un verbo de acción.'
      },
      {
        id: 'tdah-moderado',
        categoryId: 'tdah',
        categoryLabel: 'Mantener la atención y seguir pasos',
        levelLabel: 'Apoyo frecuente',
        shortTitle: 'Atención y pasos · apoyo frecuente',
        description:
          'Le cuesta mantener la atención en textos largos; le ayudan los pasos breves y el formato ordenado.',
        badgeColor: 'border-amber-500 bg-amber-950/40 text-amber-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedTheme: 'dark-high',
        recommendedFontSize: 'large',
        recommendedSpeechRate: 1.0,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        maxWordsPerSentence: 9,
        aiDirective:
          'PERFIL DE APOYO: atención con apoyo frecuente. Fragmenta el contenido en pasos muy concretos y breves (8-10 palabras por paso como máximo), sin texto de relleno y con un formato muy estructurado.'
      },
      {
        id: 'tdah-grave',
        categoryId: 'tdah',
        categoryLabel: 'Mantener la atención y seguir pasos',
        levelLabel: 'Apoyo intenso',
        shortTitle: 'Atención y pasos · apoyo intenso',
        description:
          'Trabaja mejor con pasos muy cortos, guiados y con pausas entre ellos.',
        badgeColor: 'border-rose-500 bg-rose-950/40 text-rose-200',
        recommendedMode: 'cognitive',
        recommendedFormat: 'easy-read',
        recommendedTheme: 'dark-high',
        recommendedFontSize: 'extralarge',
        recommendedSpeechRate: 0.95,
        recommendedAutoSpeak: true,
        recommendedHaptic: true,
        dyslexiaFriendly: false,
        stepByStepFocus: true,
        maxWordsPerSentence: 6,
        aiDirective:
          'PERFIL DE APOYO: atención con apoyo intenso. Divide la actividad en pasos de 6 palabras como máximo e intercala pausas breves y comprobaciones cada 2 o 3 pasos (ej. "⏸️ Pausa breve: respira y descansa 30 segundos antes de seguir").'
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
    ALL_USER_PROFILES[0] // Por defecto: comprensión con apoyo puntual
  );
}
