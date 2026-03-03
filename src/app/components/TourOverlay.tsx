/**
 * Omnimind — 3-Step Guided Tour Overlay
 * Floating callout bubbles anchored to sidebar / canvas / SimulationBar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TOUR_STEPS } from './WelcomeScreen';

interface TourOverlayProps {
  isActive: boolean;
  onComplete: () => void;
  isDark: boolean;
}

// Arrow SVG that points toward the anchor area
function TourArrow({ direction }: { direction: 'left' | 'down' | 'up' }) {
  if (direction === 'left') {
    return (
      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pointer-events-none" aria-hidden="true">
        <svg width="18" height="14" viewBox="0 0 18 14">
          <path d="M 18 7 L 2 7 M 2 7 L 8 2 M 2 7 L 8 12"
            stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    );
  }
  if (direction === 'down') {
    return (
      <div className="absolute left-1/2 bottom-0 translate-y-full -translate-x-1/2 pointer-events-none" aria-hidden="true">
        <svg width="14" height="18" viewBox="0 0 14 18">
          <path d="M 7 2 L 7 16 M 7 16 L 2 10 M 7 16 L 12 10"
            stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    );
  }
  // up
  return (
    <div className="absolute left-1/2 top-0 -translate-y-full -translate-x-1/2 pointer-events-none" aria-hidden="true">
      <svg width="14" height="18" viewBox="0 0 14 18">
        <path d="M 7 16 L 7 2 M 7 2 L 2 8 M 7 2 L 12 8"
          stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

// Position data for each anchor
const ANCHOR_POSITIONS: Record<string, {
  position: React.CSSProperties;
  arrowDirection: 'left' | 'down' | 'up';
  spotlightStyle?: React.CSSProperties;
}> = {
  sidebar: {
    position: { left: 280, top: '50%', transform: 'translateY(-50%)' },
    arrowDirection: 'left',
    spotlightStyle: { left: 0, top: 0, width: 270, height: '100%' },
  },
  canvas: {
    position: { left: '50%', top: '40%', transform: 'translate(-50%, -50%)' },
    arrowDirection: 'down',
  },
  simbar: {
    position: { left: '50%', bottom: 72, transform: 'translateX(-50%)' },
    arrowDirection: 'up',
    spotlightStyle: { left: 0, bottom: 0, width: '100%', height: 64 },
  },
};

export function TourOverlay({ isActive, onComplete, isDark }: TourOverlayProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (isActive) {
      setStep(0);
      setExiting(false);
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [isActive]);

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setVisible(false);
      setTimeout(() => {
        setStep(s => s + 1);
        setVisible(true);
      }, 180);
    } else {
      handleDone();
    }
  }, [step]);

  const handleDone = useCallback(() => {
    setExiting(true);
    setVisible(false);
    setTimeout(onComplete, 320);
  }, [onComplete]);

  if (!isActive) return null;

  const currentStep = TOUR_STEPS[step];
  const pos = ANCHOR_POSITIONS[currentStep.anchor];

  return (
    <>
      {/* Semi-transparent backdrop — lighter than welcome to let app show through */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[150] pointer-events-none"
        style={{
          background: 'rgba(7,15,35,0.35)',
          opacity: visible && !exiting ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Spotlight highlight for sidebar / simbar */}
      {pos.spotlightStyle && (
        <div
          aria-hidden="true"
          className="fixed z-[151] pointer-events-none"
          style={{
            ...pos.spotlightStyle,
            boxShadow: 'inset 0 0 0 2px rgba(30,64,175,0.55)',
            borderRadius: 8,
            opacity: visible && !exiting ? 1 : 0,
            transition: 'opacity 0.28s ease',
          }}
        />
      )}

      {/* Tour callout card */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Tour step ${step + 1}: ${currentStep.title}`}
        className="fixed z-[160]"
        style={{
          ...pos.position,
          opacity: visible && !exiting ? 1 : 0,
          transform: `${(pos.position.transform ?? '')} ${visible && !exiting ? 'scale(1)' : 'scale(0.90)'}`,
          transition: 'opacity 0.22s ease, transform 0.30s cubic-bezier(0.34,1.4,0.64,1)',
          pointerEvents: visible && !exiting ? 'auto' : 'none',
        }}
      >
        <div
          className="relative rounded-2xl overflow-visible"
          style={{
            width: 280,
            background: isDark ? '#0F172A' : '#FFFFFF',
            border: isDark ? '1.5px solid rgba(30,64,175,0.40)' : '1.5px solid rgba(30,64,175,0.25)',
            boxShadow: '0 16px 40px rgba(30,64,175,0.22), 0 4px 12px rgba(0,0,0,0.18)',
          }}
        >
          {/* Arrow */}
          <TourArrow direction={pos.arrowDirection} />

          {/* Progress bar */}
          <div
            className="h-1 w-full"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }}
          >
            <div
              className="h-full"
              style={{
                width: `${((step + 1) / TOUR_STEPS.length) * 100}%`,
                background: 'linear-gradient(90deg, #1E40AF, #3B82F6)',
                transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex items-center gap-2">
              {/* Step indicator circles */}
              <div className="flex items-center gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 16 : 6,
                      height: 6,
                      background: i <= step ? '#1E40AF' : (isDark ? '#1E293B' : '#E2E8F0'),
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 9.5, color: isDark ? '#475569' : '#94A3B8',
                fontWeight: 500 }}>
                Step {step + 1} of {TOUR_STEPS.length}
              </span>
            </div>

            <button
              onClick={handleDone}
              aria-label="Skip tour"
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
              style={{
                color: isDark ? '#475569' : '#94A3B8',
                background: 'transparent',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = isDark ? '#94A3B8' : '#64748B'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isDark ? '#475569' : '#94A3B8'; }}
            >
              <X size={12} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pt-3 pb-4">
            <h3 style={{ fontSize: 14, fontWeight: 700,
              color: isDark ? '#E2E8F0' : '#1E293B', marginBottom: 6 }}>
              {currentStep.title}
            </h3>
            <p style={{ fontSize: 11.5, lineHeight: 1.6,
              color: isDark ? '#64748B' : '#64748B' }}>
              {currentStep.body}
            </p>

            {/* CTA */}
            <div className="flex items-center justify-between mt-4">
              {step < TOUR_STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-[0.97]"
                  style={{
                    fontSize: 11, color: 'white',
                    background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                    boxShadow: '0 2px 10px rgba(30,64,175,0.35)',
                  }}
                >
                  Next <ArrowRight size={11} />
                </button>
              ) : (
                <button
                  onClick={handleDone}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-[0.97]"
                  style={{
                    fontSize: 11, color: 'white',
                    background: 'linear-gradient(135deg, #0F766E, #0D9488)',
                    boxShadow: '0 2px 10px rgba(15,118,110,0.35)',
                  }}
                >
                  <CheckCircle2 size={11} /> Done!
                </button>
              )}

              <button
                onClick={handleDone}
                style={{ fontSize: 10, color: isDark ? '#475569' : '#94A3B8',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 8px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = isDark ? '#64748B' : '#64748B'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isDark ? '#475569' : '#94A3B8'; }}
              >
                Skip tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}