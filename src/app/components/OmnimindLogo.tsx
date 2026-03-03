/**
 * Omnimind — Brand Logo Component
 * Neural loop forming an eye in #1E40AF (indigo) / #F59E0B (amber)
 * Hover: amber pupil glow + iris ring rotation + outer synapse drift
 */
import { useState, useCallback } from 'react';

interface OmnimindLogoProps {
  /** Called when the logo is clicked (e.g. reset to home) */
  onClick?: () => void;
  /** Override text label (default "Omnimind") */
  label?: string;
  /** Show subtitle below name */
  subtitle?: string;
  /** Whether to show the text label beside the mark */
  showLabel?: boolean;
  className?: string;
}

export function OmnimindLogo({
  onClick,
  label = 'Omnimind',
  subtitle,
  showLabel = true,
  className = '',
}: OmnimindLogoProps) {
  const [hovered, setHovered] = useState(false);

  const handleEnter = useCallback(() => setHovered(true), []);
  const handleLeave = useCallback(() => setHovered(false), []);

  return (
    <>
      {/* ── Keyframe definitions ─────────────────────────────────────── */}
      <style>{`
        @keyframes om-iris-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes om-pupil-pulse {
          0%,100% { opacity:1; r:3.8; }
          50%      { opacity:0.75; r:4.6; }
        }
        @keyframes om-node-drift {
          0%,100% { transform:translate(0,0); }
          50%      { transform:translate(0,-1.5px); }
        }
        @keyframes om-glow-ring {
          0%,100% { opacity:0.18; }
          50%      { opacity:0.40; }
        }
        .om-iris {
          transform-origin: 24px 24px;
          transition: animation 0.3s;
        }
        .om-iris-spinning {
          animation: om-iris-spin 5s linear infinite;
        }
        .om-node-float {
          animation: om-node-drift 2.8s ease-in-out infinite;
        }
        .om-glow-ring-anim {
          animation: om-glow-ring 2s ease-in-out infinite;
        }
      `}</style>

      <button
        type="button"
        onClick={onClick}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        aria-label={`${label} — return to home`}
        title={`${label} — click to reset`}
        className={`
          flex items-center gap-2.5
          rounded-xl px-1 py-0.5
          outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60
          transition-all duration-300 cursor-pointer select-none
          ${onClick ? 'hover:bg-white/10 active:scale-95' : 'cursor-default'}
          ${className}
        `}
        style={{
          filter: hovered
            ? 'drop-shadow(0 0 10px rgba(245,158,11,0.45)) drop-shadow(0 0 20px rgba(30,64,175,0.30))'
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
          transition: 'filter 0.35s ease, transform 0.15s ease',
        }}
      >
        {/* ── SVG Mark (48×48 viewBox → rendered 36×36) ─────────────── */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ overflow: 'visible', flexShrink: 0 }}
        >
          {/* Ambient glow ring behind pupil */}
          <circle
            cx="24" cy="24" r="13"
            fill="#F59E0B"
            className={hovered ? 'om-glow-ring-anim' : ''}
            style={{ opacity: hovered ? 0.22 : 0 , transition:'opacity 0.35s ease' }}
          />

          {/* ── Eye outline — the neural loop ── */}
          {/* Top arc  */}
          <path
            d="M4,24 C10,7 38,7 44,24"
            stroke="#1E40AF"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            style={{ transition: 'stroke 0.3s' }}
          />
          {/* Bottom arc */}
          <path
            d="M44,24 C38,41 10,41 4,24"
            stroke="#1E40AF"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />

          {/* ── Synaptic threads from iris to outer nodes ── */}
          {/* Top */}
          <line x1="24" y1="15.5" x2="24" y2="9"   stroke="#3B82F6" strokeWidth="0.9" opacity="0.65" />
          {/* Bottom */}
          <line x1="24" y1="32.5" x2="24" y2="39"  stroke="#3B82F6" strokeWidth="0.9" opacity="0.65" />
          {/* Upper-right */}
          <line x1="31.5" y1="18" x2="38" y2="11"  stroke="#3B82F6" strokeWidth="0.8" opacity="0.45" />
          {/* Upper-left */}
          <line x1="16.5" y1="18" x2="10" y2="11"  stroke="#3B82F6" strokeWidth="0.8" opacity="0.45" />
          {/* Lower-right */}
          <line x1="31.5" y1="30" x2="38" y2="37"  stroke="#3B82F6" strokeWidth="0.7" opacity="0.30" />
          {/* Lower-left */}
          <line x1="16.5" y1="30" x2="10" y2="37"  stroke="#3B82F6" strokeWidth="0.7" opacity="0.30" />

          {/* ── Iris dashed ring (rotates on hover) ── */}
          <circle
            cx="24" cy="24" r="9"
            stroke="#3B82F6"
            strokeWidth="1.1"
            fill="none"
            strokeDasharray="4.2 2.8"
            className={`om-iris ${hovered ? 'om-iris-spinning' : ''}`}
            style={{ opacity: hovered ? 0.9 : 0.65, transition: 'opacity 0.3s' }}
          />

          {/* ── Major nodes — eye tips ── */}
          <circle cx="4"  cy="24" r="2.8" fill="#1E40AF" />
          <circle cx="44" cy="24" r="2.8" fill="#1E40AF" />

          {/* ── Minor nodes — arc peaks ── */}
          <circle cx="24" cy="9"  r="2.0" fill="#3B82F6"
            className={hovered ? 'om-node-float' : ''}
            style={{ opacity: hovered ? 1 : 0.8, transition:'opacity 0.3s' }}
          />
          <circle cx="24" cy="39" r="2.0" fill="#3B82F6"
            style={{ opacity: hovered ? 1 : 0.8, transition:'opacity 0.3s' }}
          />

          {/* ── Outer synapse accent nodes ── */}
          <circle cx="38" cy="11" r="1.6" fill="#F59E0B" opacity="0.80"
            className={hovered ? 'om-node-float' : ''}
          />
          <circle cx="10" cy="11" r="1.6" fill="#F59E0B" opacity="0.80"
            className={hovered ? 'om-node-float' : ''}
          />
          <circle cx="38" cy="37" r="1.3" fill="#F59E0B" opacity="0.50" />
          <circle cx="10" cy="37" r="1.3" fill="#F59E0B" opacity="0.50" />

          {/* ── Amber pupil ── */}
          {/* Soft outer glow */}
          <circle cx="24" cy="24" r="6"
            fill="#F59E0B"
            style={{ opacity: hovered ? 0.28 : 0.14, transition: 'opacity 0.35s ease' }}
          />
          {/* Main pupil disc */}
          <circle
            cx="24" cy="24"
            r={hovered ? 4.2 : 3.8}
            fill="url(#omPupilGrad)"
            style={{ transition: 'r 0.3s ease' }}
          />
          {/* Specular highlight */}
          <circle cx="22.4" cy="22.5" r="1.1" fill="white" opacity="0.55" />

          {/* ── Gradient defs ── */}
          <defs>
            <radialGradient id="omPupilGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#FDE68A" />
              <stop offset="55%"  stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </radialGradient>
          </defs>
        </svg>

        {/* ── Wordmark ─────────────────────────────────────────────────── */}
        {showLabel && (
          <div className="flex flex-col leading-none select-none">
            <span
              style={{
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '-0.4px',
                color: 'white',
                lineHeight: 1,
                textShadow: hovered
                  ? '0 0 18px rgba(245,158,11,0.60), 0 1px 3px rgba(0,0,0,0.30)'
                  : '0 1px 3px rgba(0,0,0,0.25)',
                transition: 'text-shadow 0.35s ease',
              }}
            >
              {label}
            </span>
            {subtitle && (
              <span
                style={{
                  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  color: 'rgba(204,251,241,0.80)',  /* teal-100 @ 80% */
                  lineHeight: 1,
                  marginTop: 3,
                  transition: 'color 0.3s',
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        )}
      </button>
    </>
  );
}
