import React from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

export const A11yAnnouncer: React.FC = () => {
  const { announcements } = useAccessibility();

  const assertive = announcements
    .filter(a => a.priority === 'assertive')
    .slice(-1)[0];

  const polite = announcements
    .filter(a => a.priority === 'polite')
    .slice(-1)[0];

  return (
    <div className="sr-only" aria-atomic="true">
      {/* Región asertiva para avisos inmediatos y críticos */}
      <div
        role="alert"
        aria-live="assertive"
        id="a11y-assertive-region"
      >
        {assertive ? assertive.message : ''}
      </div>

      {/* Región cortés para avisos secundarios */}
      <div
        role="status"
        aria-live="polite"
        id="a11y-polite-region"
      >
        {polite ? polite.message : ''}
      </div>
    </div>
  );
};
