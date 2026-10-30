import React, { useState } from 'react';
import { UserCheck, CheckCircle2, Sparkles, X, Volume2, Images, FileText } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { PROFILE_CATEGORIES } from '../data/userProfiles';
import { ProfileCategoryId, UserProfileOption } from '../types';

export const ProfileSelectorModal: React.FC = () => {
  const {
    userProfile,
    selectUserProfile,
    isProfileModalOpen,
    setIsProfileModalOpen
  } = useAccessibility();

  const [activeCategory, setActiveCategory] = useState<ProfileCategoryId>(
    userProfile.categoryId || 'di'
  );

  if (!isProfileModalOpen) return null;

  const currentCategory =
    PROFILE_CATEGORIES.find((c) => c.id === activeCategory) || PROFILE_CATEGORIES[0];

  const handleSelectOption = (option: UserProfileOption) => {
    selectUserProfile(option.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-selector-title"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="w-full max-w-5xl bg-a11y-card border-4 border-a11y-border rounded-3xl p-5 md:p-7 space-y-6 shadow-2xl my-auto">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b-4 border-a11y-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <UserCheck className="w-9 h-9 text-a11y-primary shrink-0" aria-hidden="true" />
              <h2
                id="profile-selector-title"
                className="text-2xl md:text-3xl font-black text-a11y-text"
              >
                Selecciona el Perfil de Apoyo
              </h2>
            </div>
            <p className="text-base md:text-lg font-bold opacity-90 text-a11y-text">
              Elige la categoría y el grado/nivel para que la interfaz y la Inteligencia Artificial
              adapten automáticamente el vocabulario, los pictogramas ARASAAC y la estructura.
            </p>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="touch-target p-3 rounded-2xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText shrink-0"
            aria-label={`Continuar con el perfil actual (${userProfile.shortTitle})`}
            title="Cerrar y continuar con el perfil actual (Escape)"
          >
            <X className="w-7 h-7" aria-hidden="true" />
          </button>
        </div>

        {/* Paso 1: Selector de las 4 Categorías Principales */}
        <div className="space-y-2">
          <span className="block text-sm font-black uppercase tracking-wider text-a11y-primary">
            1. Escoge el Área o Diagnóstico:
          </span>
          <div
            role="tablist"
            aria-label="Categorías de perfil de usuario"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
          >
            {PROFILE_CATEGORIES.map((cat) => {
              const isSelected = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`touch-target min-h-[68px] p-3 rounded-2xl border-4 text-left flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-a11y-primary text-a11y-primaryText border-a11y-border font-black shadow-lg scale-[1.01]'
                      : 'bg-a11y-bg text-a11y-text border-a11y-border font-bold opacity-85 hover:opacity-100'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl shrink-0" aria-hidden="true">
                    {cat.emoji}
                  </span>
                  <span className="text-sm sm:text-base md:text-lg leading-tight">{cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paso 2: Tarjetas de Grado / Nivel dentro de la Categoría activa */}
        <div className="space-y-3" role="tabpanel" aria-label={currentCategory.title}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="block text-sm font-black uppercase tracking-wider text-a11y-primary">
              2. Escoge el Nivel o Grado en {currentCategory.title}:
            </span>
            <span className="text-xs md:text-sm font-bold opacity-80 text-a11y-text">
              {currentCategory.subtitle}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentCategory.options.map((option) => {
              const isCurrent = userProfile.id === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  aria-pressed={isCurrent}
                  className={`touch-target p-5 rounded-3xl border-4 text-left flex flex-col justify-between gap-4 transition-all hover:scale-[1.01] active:scale-98 ${
                    isCurrent
                      ? 'border-a11y-focus ring-4 ring-a11y-focus bg-a11y-bg text-a11y-text shadow-xl'
                      : 'border-a11y-border bg-a11y-bg text-a11y-text hover:border-a11y-primary'
                  }`}
                >
                  <div className="space-y-3 w-full">
                    {/* Cabecera del nivel */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-3 py-1 rounded-xl border-2 text-sm font-black uppercase tracking-wide ${option.badgeColor}`}
                      >
                        {option.levelLabel}
                      </span>
                      {isCurrent && (
                        <span className="flex items-center gap-1 text-xs font-black text-green-400">
                          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                          Activo
                        </span>
                      )}
                    </div>

                    {/* Descripción clínica/pedagógica exacta */}
                    <p className="text-base md:text-lg font-bold leading-snug text-a11y-text">
                      {option.description}
                    </p>
                  </div>

                  {/* Etiquetas de adaptaciones automáticas que activa este perfil */}
                  <div className="w-full pt-3 border-t-2 border-a11y-border space-y-2">
                    <div className="flex flex-wrap gap-1.5 text-xs font-black">
                      {option.recommendedFormat === 'pictograms' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-400 text-purple-200 flex items-center gap-1">
                          <Images className="w-3.5 h-3.5" aria-hidden="true" />
                          Pictogramas ARASAAC
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-400 text-sky-200 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          Lectura Fácil UNE/ATECA
                        </span>
                      )}

                      <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-500 text-zinc-200 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Voz {option.recommendedSpeechRate}x
                      </span>

                      {option.dyslexiaFriendly && (
                        <span className="px-2.5 py-1 rounded-lg bg-teal-950/60 border border-teal-400 text-teal-200">
                          Tipografía Dislexia
                        </span>
                      )}

                      {option.stepByStepFocus && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-400 text-amber-200">
                          Guía / Micro-pasos
                        </span>
                      )}
                    </div>

                    <div className="w-full py-2.5 px-4 rounded-xl bg-a11y-primary text-a11y-primaryText font-black text-center text-base flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                      <span>Elegir {option.shortTitle}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pie del modal con perfil actual y botón de continuar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-a11y-border text-sm font-bold">
          <div>
            Perfil activo actualmente:{' '}
            <strong className="text-a11y-primary">
              {userProfile.categoryLabel} — {userProfile.levelLabel}
            </strong>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="touch-target px-5 py-2.5 rounded-xl border-2 border-a11y-border bg-a11y-bg text-a11y-text hover:bg-a11y-primary hover:text-a11y-primaryText font-black"
          >
            Continuar con {userProfile.shortTitle}
          </button>
        </div>
      </div>
    </div>
  );
};
