/**
 * Omnimind — Activation Function Switcher
 * Hover popup for switching activations on any activation node.
 * Includes: mini SVG curve icons, animated node badge, rich tooltips.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ── Activation metadata ──────────────────────────────────────────────────────
export interface ActivationDef {
  fn: string;
  formula: string;
  range: string;
  color: string;        // accent color for chip + node tint
  dotColor: string;     // slightly darker for the badge dot
  desc: string;
  detail: string;       // extra line for the tooltip
  xRange: [number, number];
}

export const ACTIVATION_DEFS: ActivationDef[] = [
  {
    fn: 'ReLU', formula: 'f(x) = max(0, x)', range: '[0, ∞)',
    color: '#F97316', dotColor: '#EA580C',
    desc: 'Fires only for positive inputs.',
    detail: 'Most popular for hidden layers. Fast, sparse, but can "die" (zero gradient for x < 0).',
    xRange: [-3, 3],
  },
  {
    fn: 'Sigmoid', formula: 'f(x) = 1 / (1 + e⁻ˣ)', range: '(0, 1)',
    color: '#8B5CF6', dotColor: '#7C3AED',
    desc: 'Squashes output to (0, 1).',
    detail: 'Classic for binary classification outputs. Prone to vanishing gradients in deep nets.',
    xRange: [-5, 5],
  },
  {
    fn: 'Tanh', formula: 'f(x) = tanh(x)', range: '(-1, 1)',
    color: '#3B82F6', dotColor: '#2563EB',
    desc: 'Zero-centered S-curve in (-1, 1).',
    detail: 'Often better than Sigmoid in hidden layers. Still suffers vanishing gradients at extremes.',
    xRange: [-3, 3],
  },
  {
    fn: 'GELU', formula: 'f(x) = x · Φ(x)', range: '≈ (-0.17, ∞)',
    color: '#10B981', dotColor: '#059669',
    desc: 'Smooth ReLU with slight negative dip.',
    detail: 'Used in BERT, GPT, and modern Transformers. Probabilistic: x scaled by its Gaussian CDF.',
    xRange: [-3, 3],
  },
  {
    fn: 'Swish', formula: 'f(x) = x · σ(x)', range: '≈ (-0.28, ∞)',
    color: '#6366F1', dotColor: '#4F46E5',
    desc: 'Self-gated, non-monotonic activation.',
    detail: 'Discovered by Google Brain via architecture search. Often outperforms ReLU in deep nets.',
    xRange: [-3, 3],
  },
  {
    fn: 'LeakyReLU', formula: 'f(x) = max(0.1x, x)', range: '(-∞, ∞)',
    color: '#EC4899', dotColor: '#DB2777',
    desc: 'Like ReLU but allows small negatives.',
    detail: 'Prevents "dying ReLU" by allowing a tiny gradient when x < 0. α = 0.1 (leakiness).',
    xRange: [-3, 3],
  },
  {
    fn: 'Softmax', formula: 'f(xᵢ) = eˣⁱ / Σeˣʲ', range: '(0, 1)',
    color: '#14B8A6', dotColor: '#0D9488',
    desc: 'Normalizes to probability distribution.',
    detail: 'Use in the final output layer for multi-class problems. All outputs sum to 1.',
    xRange: [-3, 3],
  },
];

export function getActivationDef(fn: string): ActivationDef {
  return ACTIVATION_DEFS.find(d => d.fn === fn) ?? ACTIVATION_DEFS[0];
}

// ── Curve computation ─────────────────────────────────────────────────────────
function evalActivation(fn: string, x: number): number {
  switch (fn) {
    case 'ReLU':      return Math.max(0, x);
    case 'Sigmoid':   return 1 / (1 + Math.exp(-x));
    case 'Tanh':      return Math.tanh(x);
    case 'GELU': {
      const c = Math.sqrt(2 / Math.PI);
      return x * 0.5 * (1 + Math.tanh(c * (x + 0.044715 * x ** 3)));
    }
    case 'Swish':     return x / (1 + Math.exp(-x));
    case 'LeakyReLU': return x > 0 ? x : 0.1 * x;
    case 'Softmax':   return 1 / (1 + Math.exp(-x)); // per-element approx
    default:          return Math.max(0, x);
  }
}

export function computeCurvePath(
  fn: string,
  w: number,
  h: number,
  margin = 2,
  steps = 48,
  xMin = -3.5,
  xMax = 3.5,
): string {
  const vals = Array.from({ length: steps + 1 }, (_, i) => {
    const x = xMin + (xMax - xMin) * (i / steps);
    return { x, y: evalActivation(fn, x) };
  });

  const yValues = vals.map(v => v.y);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin || 1;
  const innerW = w - 2 * margin;
  const innerH = h - 2 * margin;

  const pts = vals.map(({ y }, i) => {
    const px = margin + (i / steps) * innerW;
    const py = margin + (1 - (y - yMin) / yRange) * innerH;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  });

  return `M ${pts.join(' L ')}`;
}

// ── Mini curve icon (used inside the node badge) ──────────────────────────────
interface CurveIconProps {
  fn: string;
  color: string;
  w?: number;
  h?: number;
  strokeWidth?: number;
  showAxes?: boolean;
}

export function ActivationCurveIcon({
  fn, color, w = 36, h = 24, strokeWidth = 2, showAxes = true,
}: CurveIconProps) {
  const path = computeCurvePath(fn, w, h, 2);
  const mx = w / 2;
  const [vals] = useState(() => {
    const vs = Array.from({ length: 49 }, (_, i) => evalActivation(fn, -3.5 + 7 * i / 48));
    const mn = Math.min(...vs), mx2 = Math.max(...vs), r = mx2 - mn || 1;
    // Where does y=0 land on SVG coordinates?
    return { yZero: 2 + (1 - (0 - mn) / r) * (h - 4) };
  });

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      {showAxes && (
        <>
          {/* Horizontal zero line */}
          <line x1={2} y1={vals.yZero} x2={w - 2} y2={vals.yZero}
            stroke="currentColor" strokeOpacity={0.2} strokeWidth={0.7} />
          {/* Vertical zero line */}
          <line x1={mx} y1={2} x2={mx} y2={h - 2}
            stroke="currentColor" strokeOpacity={0.2} strokeWidth={0.7} />
        </>
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Chip tooltip (detailed info on hover) ─────────────────────────────────────
interface ChipTooltipProps {
  def: ActivationDef;
  isActive: boolean;
}

function ChipTooltip({ def, isActive }: ChipTooltipProps) {
  return (
    <div
      className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
      style={{ minWidth: 188 }}
    >
      {/* Arrow */}
      <div
        className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45"
        style={{ background: 'white', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}
      />
      <div
        className="bg-white rounded-xl border border-slate-200 p-3"
        style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: def.color }} />
          <span className="text-[12px] font-bold text-slate-800">{def.fn}</span>
          {isActive && (
            <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
              style={{ background: def.color }}>active</span>
          )}
        </div>
        {/* Curve preview */}
        <div className="flex items-center justify-center p-1.5 rounded-lg mb-2"
          style={{ background: `${def.color}12`, border: `1px solid ${def.color}28` }}>
          <ActivationCurveIcon fn={def.fn} color={def.color} w={120} h={50} strokeWidth={2.5} />
        </div>
        {/* Formula */}
        <div className="font-mono text-[10px] px-2 py-1 rounded-lg mb-2 text-center"
          style={{ background: `${def.color}10`, color: def.dotColor }}>
          {def.formula}
        </div>
        {/* Range + description */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Range</span>
            <span className="text-[10px] font-mono text-slate-600">{def.range}</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">{def.desc}</p>
          <p className="text-[10px] text-slate-400 leading-relaxed">{def.detail}</p>
        </div>
      </div>
    </div>
  );
}

// ── Individual chip ────────────────────────────────────────────────────────────
interface ChipProps {
  def: ActivationDef;
  isActive: boolean;
  onSelect: (fn: string) => void;
}

function ActivationChip({ def, isActive, onSelect }: ChipProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex-shrink-0" style={{ isolation: 'isolate' }}>
      {/* Tooltip */}
      {hovered && <ChipTooltip def={def} isActive={isActive} />}

      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={e => { e.stopPropagation(); onSelect(def.fn); }}
        className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-150"
        style={{
          background: isActive ? `${def.color}1A` : hovered ? `${def.color}0E` : 'transparent',
          border: `1.5px solid ${isActive ? def.color : hovered ? `${def.color}80` : 'transparent'}`,
          boxShadow: isActive ? `0 0 12px ${def.color}33, inset 0 0 8px ${def.color}10` : 'none',
          transform: hovered && !isActive ? 'translateY(-2px) scale(1.05)' : isActive ? 'scale(1.0)' : 'scale(1)',
        }}
        title={def.fn}
      >
        <ActivationCurveIcon fn={def.fn} color={isActive ? def.color : hovered ? def.color : '#94A3B8'}
          w={34} h={20} strokeWidth={isActive || hovered ? 2.2 : 1.8} />
        <span
          className="text-[9px] font-semibold leading-none"
          style={{ color: isActive ? def.dotColor : hovered ? def.color : '#94A3B8' }}
        >
          {def.fn === 'LeakyReLU' ? 'LReLU' : def.fn}
        </span>
      </button>
    </div>
  );
}

// ── Main switcher popup ───────────────────────────────────────────────────────
interface ActivationSwitcherProps {
  currentFn: string;
  onSelect: (fn: string) => void;
  visible: boolean;
}

export function ActivationSwitcher({ currentFn, onSelect, visible }: ActivationSwitcherProps) {
  const def = getActivationDef(currentFn);

  return (
    <div
      className="absolute left-1/2 z-[100]"
      style={{
        top: 'calc(100% + 8px)',
        transform: 'translateX(-50%)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.15s ease, transform 0.15s cubic-bezier(0.2,0,0.2,1)',
        transformOrigin: 'top center',
      }}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200"
        style={{
          boxShadow: `0 16px 40px rgba(0,0,0,0.10), 0 4px 12px ${def.color}22, 0 0 0 1px rgba(0,0,0,0.04)`,
          padding: '8px 10px 10px',
        }}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <div className="w-2 h-2 rounded-full" style={{ background: def.color }} />
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
            Activation Function
          </span>
        </div>

        {/* Chips row */}
        <div className="flex items-center gap-0.5">
          {ACTIVATION_DEFS.map(d => (
            <ActivationChip
              key={d.fn}
              def={d}
              isActive={d.fn === currentFn}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Animated node badge ───────────────────────────────────────────────────────
/**
 * Displayed inside the activation node — replaces the static type label.
 * Animates smoothly when the activation function changes.
 */
interface ActivationBadgeProps {
  fn: string;
  size?: number;
}

export function ActivationBadge({ fn, size = 36 }: ActivationBadgeProps) {
  const def = getActivationDef(fn);
  const [displayFn, setDisplayFn] = useState(fn);
  const [displayColor, setDisplayColor] = useState(def.color);
  const [fade, setFade] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (fn === displayFn) return;
    // Fade out
    setFade(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Swap
      setDisplayFn(fn);
      setDisplayColor(getActivationDef(fn).color);
      // Fade in
      setFade(false);
    }, 120);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fn]);

  return (
    <div
      style={{
        opacity: fade ? 0 : 1,
        transform: fade ? 'scale(0.85)' : 'scale(1)',
        transition: 'opacity 0.12s ease, transform 0.12s ease',
      }}
    >
      <ActivationCurveIcon
        fn={displayFn}
        color={displayColor}
        w={size}
        h={Math.round(size * 0.65)}
        strokeWidth={2.2}
        showAxes
      />
    </div>
  );
}
