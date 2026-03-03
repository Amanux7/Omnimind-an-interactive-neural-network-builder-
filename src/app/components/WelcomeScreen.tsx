/**
 * Omnimind — Welcome / Onboarding Screen
 * Figma-style first-run experience with demo network selector.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, Sparkles, Zap, Users, BookOpen } from 'lucide-react';
import { OmnimindLogo } from './OmnimindLogo';
import { DEMO_NETWORKS, type DemoNetwork } from './demoNetworks';

// ── Mini Network SVG Preview ──────────────────────────────────────────────────

function NodeCircle({ x, y, r, fill, stroke }: { x: number; y: number; r: number; fill: string; stroke: string }) {
  return (
    <>
      <circle cx={x} cy={y} r={r + 2} fill={fill} opacity="0.15" />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth="1.5" />
    </>
  );
}

// XOR: 2 → 2 → 1
function XorPreview() {
  const inputY = [28, 52];
  const hiddenY = [20, 44, 68];
  const outputY = [40];
  const w = 160, h = 88;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" aria-hidden="true">
      {/* connections */}
      {inputY.flatMap((iy, i) => hiddenY.map((hy, j) => (
        <line key={`ih-${i}-${j}`} x1={28} y1={iy} x2={72} y2={hy}
          stroke="#3B82F6" strokeWidth={0.9} opacity={0.35} />
      )))}
      {hiddenY.flatMap((hy, i) => outputY.map((oy, j) => (
        <line key={`ho-${i}-${j}`} x1={102} y1={hy} x2={140} y2={oy}
          stroke="#F59E0B" strokeWidth={0.9} opacity={0.50} />
      )))}
      {/* input nodes */}
      {inputY.map((y, i) => (
        <NodeCircle key={`in-${i}`} x={28} y={y} r={7} fill="#1E40AF" stroke="#1D4ED8" />
      ))}
      {/* hidden nodes */}
      {hiddenY.map((y, i) => (
        <NodeCircle key={`h-${i}`} x={87} y={y} r={7} fill="#3B82F6" stroke="#2563EB" />
      ))}
      {/* output */}
      {outputY.map((y, i) => (
        <NodeCircle key={`out-${i}`} x={140} y={y} r={8} fill="#0F766E" stroke="#0D9488" />
      ))}
      {/* labels */}
      <text x={28}  y={82} textAnchor="middle" fontSize="7" fill="#64748B">Input</text>
      <text x={87}  y={82} textAnchor="middle" fontSize="7" fill="#64748B">Hidden</text>
      <text x={140} y={82} textAnchor="middle" fontSize="7" fill="#64748B">Output</text>
    </svg>
  );
}

// Digit: 64 → 32 → 10
function DigitPreview() {
  const w = 200, h = 88;
  // Represent layers as blocks of dots (max 6 shown per layer with "+" indicator)
  const layers = [
    { x: 22, nodes: 6, label: '×64', color: '#1E40AF', border: '#1D4ED8' },
    { x: 80, nodes: 5, label: '×32', color: '#3B82F6', border: '#2563EB' },
    { x: 130, nodes: 3, label: '×16', color: '#8B5CF6', border: '#7C3AED' },
    { x: 178, nodes: 4, label: '×10', color: '#0F766E', border: '#0D9488' },
  ];
  const spacing = 12;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" aria-hidden="true">
      {/* connections between layers */}
      {layers.slice(0, -1).map((layer, li) => {
        const next = layers[li + 1];
        const lNodes = Array.from({ length: layer.nodes }, (_, i) => {
          const total = (layer.nodes - 1) * spacing;
          return 44 - total / 2 + i * spacing;
        });
        const nNodes = Array.from({ length: next.nodes }, (_, i) => {
          const total = (next.nodes - 1) * spacing;
          return 44 - total / 2 + i * spacing;
        });
        return lNodes.flatMap((ly, i) => nNodes.map((ny, j) => (
          <line key={`c-${li}-${i}-${j}`}
            x1={layer.x + 7} y1={ly} x2={next.x - 7} y2={ny}
            stroke="#94A3B8" strokeWidth={0.7} opacity={0.30}
          />
        )));
      })}
      {/* nodes */}
      {layers.map((layer) => {
        const total = (layer.nodes - 1) * spacing;
        const startY = 44 - total / 2;
        return Array.from({ length: layer.nodes }, (_, i) => (
          <NodeCircle key={`${layer.x}-${i}`}
            x={layer.x} y={startY + i * spacing}
            r={5.5} fill={layer.color} stroke={layer.border}
          />
        ));
      })}
      {/* dropout indicator */}
      <rect x={98} y={16} width={18} height={56} rx={4}
        fill="#0F766E" fillOpacity="0.08" stroke="#0F766E" strokeOpacity="0.3"
        strokeWidth={1} strokeDasharray="3 2" />
      <text x={107} y={75} textAnchor="middle" fontSize="6" fill="#0F766E" opacity="0.7">drop</text>
      {/* labels */}
      {layers.map(layer => (
        <text key={`lbl-${layer.x}`} x={layer.x} y={82}
          textAnchor="middle" fontSize="7" fill="#64748B">{layer.label}</text>
      ))}
    </svg>
  );
}

// Regression: 1 → 8 → 4 → 2 → 1
function RegressionPreview() {
  const w = 200, h = 88;
  const layers = [
    { x: 18,  nodes: 1, label: '×1',  color: '#1E40AF', border: '#1D4ED8' },
    { x: 68,  nodes: 5, label: '×8',  color: '#3B82F6', border: '#2563EB' },
    { x: 118, nodes: 4, label: '×4',  color: '#059669', border: '#047857' },
    { x: 162, nodes: 2, label: '×2',  color: '#10B981', border: '#059669' },
    { x: 192, nodes: 1, label: '×1',  color: '#0F766E', border: '#0D9488' },
  ];
  const spacing = 11;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" aria-hidden="true">
      {layers.slice(0, -1).map((layer, li) => {
        const next = layers[li + 1];
        const lNodes = Array.from({ length: layer.nodes }, (_, i) => {
          const total = (layer.nodes - 1) * spacing;
          return 40 - total / 2 + i * spacing;
        });
        const nNodes = Array.from({ length: next.nodes }, (_, i) => {
          const total = (next.nodes - 1) * spacing;
          return 40 - total / 2 + i * spacing;
        });
        return lNodes.flatMap((ly, i) => nNodes.map((ny, j) => (
          <line key={`rc-${li}-${i}-${j}`}
            x1={layer.x + 6} y1={ly} x2={next.x - 6} y2={ny}
            stroke="#10B981" strokeWidth={0.7} opacity={0.25}
          />
        )));
      })}
      {layers.map((layer) => {
        const total = (layer.nodes - 1) * spacing;
        const startY = 40 - total / 2;
        return Array.from({ length: layer.nodes }, (_, i) => (
          <NodeCircle key={`r-${layer.x}-${i}`}
            x={layer.x} y={startY + i * spacing}
            r={5.5} fill={layer.color} stroke={layer.border}
          />
        ));
      })}
      {/* activation curve hint */}
      <path d="M 55 38 Q 65 28 75 38 Q 85 48 95 38" fill="none" stroke="#F59E0B" strokeWidth={1.2} opacity={0.55} />
      {layers.map(layer => (
        <text key={`rl-${layer.x}`} x={layer.x} y={76}
          textAnchor="middle" fontSize="7" fill="#64748B">{layer.label}</text>
      ))}
    </svg>
  );
}

const PREVIEWS: Record<DemoNetwork['id'], React.FC> = {
  xor: XorPreview,
  digit: DigitPreview,
  regression: RegressionPreview,
};

// ── Feature pills for the hero section ──────────────────────────────────────
const FEATURES = [
  { icon: <Zap size={11} />,      label: 'Infinite Canvas',   color: '#1E40AF' },
  { icon: <Sparkles size={11} />, label: 'Live Training',      color: '#F59E0B' },
  { icon: <BookOpen size={11} />, label: 'Forward Pass',       color: '#0F766E' },
  { icon: <Users size={11} />,    label: 'Multiplayer',        color: '#7C3AED' },
];

// ── Tour Step Data ────────────────────────────────────────────────────────────
export interface TourStep {
  step: number;
  title: string;
  body: string;
  /** Anchor: where the callout arrow points */
  anchor: 'sidebar' | 'canvas' | 'simbar';
}
export const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: 'Layer Library',
    body: 'Drag any layer card from the sidebar onto the canvas — Input, Dense, Activation, Conv2D and more.',
    anchor: 'sidebar',
  },
  {
    step: 2,
    title: 'Connect Nodes',
    body: 'Hover a node to reveal its port dots (◉). Drag from the right port to a left port on the next node.',
    anchor: 'canvas',
  },
  {
    step: 3,
    title: 'Train & Simulate',
    body: 'Press T to open the Training panel or R to run a Forward Pass. Watch gradients flow in real-time!',
    anchor: 'simbar',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────
interface WelcomeScreenProps {
  isOpen: boolean;
  onDismiss: () => void;
  onLoadDemo: (id: DemoNetwork['id']) => void;
  onStartTour: () => void;
  isDark: boolean;
}

export function WelcomeScreen({
  isOpen,
  onDismiss,
  onLoadDemo,
  onStartTour,
  isDark,
}: WelcomeScreenProps) {
  const [hovered, setHovered] = useState<DemoNetwork['id'] | null>(null);
  const [visible, setVisible] = useState(false);

  // Entrance animation
  useEffect(() => {
    if (isOpen) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleLoadDemo = useCallback((id: DemoNetwork['id']) => {
    onLoadDemo(id);
    onDismiss();
  }, [onLoadDemo, onDismiss]);

  const handleTakeATour = useCallback(() => {
    onDismiss();
    onStartTour();
  }, [onDismiss, onStartTour]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Omnimind"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        background: 'rgba(7, 15, 35, 0.72)',
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      {/* ── Main Card ── */}
      <div
        className="relative w-full max-w-[780px] rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: isDark ? '#0F172A' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(30,64,175,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(30,64,175,0.20)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
        }}
      >
        {/* ── Hero Header ── */}
        <div
          className="relative px-8 pt-8 pb-6 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0C1844 0%, #0F766E 55%, #1E40AF 100%)',
          }}
        >
          {/* Decorative node mesh */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <defs>
              <radialGradient id="wm-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="92%" cy="15%" r="120" fill="url(#wm-glow)" />
            {/* Background neural threads */}
            {[
              ['5%','20%','18%','8%'], ['20%','5%','35%','15%'], ['75%','90%','88%','78%'],
              ['8%','75%','22%','85%'], ['90%','30%','78%','15%'], ['40%','92%','55%','82%'],
            ].map(([x1,y1,x2,y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(59,130,246,0.20)" strokeWidth="1" />
            ))}
            {[
              ['5%','20%'], ['18%','8%'], ['75%','90%'], ['8%','75%'],
              ['90%','30%'], ['55%','82%'], ['35%','15%'],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3" fill="rgba(245,158,11,0.45)" />
            ))}
          </svg>

          {/* Close button */}
          <button
            onClick={onDismiss}
            aria-label="Close welcome screen"
            className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.15)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.20)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; }}
          >
            <X size={14} />
          </button>

          {/* Logo + tagline */}
          <div className="relative flex flex-col items-center text-center gap-3">
            <OmnimindLogo showLabel={true} subtitle={undefined} className="pointer-events-none" />
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white',
                letterSpacing: '-0.5px', textShadow: '0 2px 12px rgba(0,0,0,0.40)' }}>
                Build&nbsp;•&nbsp;Train&nbsp;•&nbsp;Understand Neural Networks
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(204,251,241,0.75)', marginTop: 4 }}>
                The interactive ML playground for researchers &amp; students
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {FEATURES.map(f => (
                <div
                  key={f.label}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{
                    background: `${f.color}22`,
                    border: `1px solid ${f.color}50`,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <span style={{ color: f.color }}>{f.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Demo Selection ── */}
        <div
          className="px-6 pt-5 pb-2 flex-shrink-0"
          style={{ background: isDark ? '#0F172A' : '#FFFFFF' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="flex-1 h-px"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.08)' }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
              color: isDark ? 'rgba(148,163,184,0.7)' : '#94A3B8',
              textTransform: 'uppercase' }}>
              Choose a Demo to Get Started
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.08)' }}
            />
          </div>

          {/* Demo cards row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {DEMO_NETWORKS.map(demo => {
              const Preview = PREVIEWS[demo.id];
              const isHov = hovered === demo.id;
              return (
                <button
                  key={demo.id}
                  onClick={() => handleLoadDemo(demo.id)}
                  onMouseEnter={() => setHovered(demo.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="group text-left rounded-2xl overflow-hidden flex flex-col transition-all"
                  style={{
                    background: isDark
                      ? (isHov ? `${demo.accentColor}14` : 'rgba(255,255,255,0.03)')
                      : (isHov ? demo.bgFrom : '#FAFAFA'),
                    border: isHov
                      ? `1.5px solid ${demo.accentColor}60`
                      : `1.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(30,64,175,0.08)'}`,
                    boxShadow: isHov
                      ? `0 8px 24px ${demo.accentColor}22, 0 2px 8px rgba(0,0,0,0.12)`
                      : '0 1px 4px rgba(0,0,0,0.04)',
                    transform: isHov ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.22s cubic-bezier(0.34,1.2,0.64,1)',
                  }}
                >
                  {/* Colored accent bar */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${demo.accentColor}, ${demo.accentColor}80)` }} />

                  {/* Mini preview */}
                  <div
                    className="px-3 pt-3 pb-1"
                    style={{
                      background: isDark
                        ? `${demo.accentColor}08`
                        : `linear-gradient(135deg, ${demo.bgFrom}, ${demo.bgTo})`,
                      height: 80,
                    }}
                  >
                    <Preview />
                  </div>

                  {/* Card body */}
                  <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700,
                          color: isDark ? '#E2E8F0' : '#1E293B', lineHeight: 1.2 }}>
                          {demo.emoji} {demo.name}
                        </div>
                        <div style={{ fontSize: 9.5, color: isDark ? '#64748B' : '#94A3B8',
                          marginTop: 1 }}>
                          {demo.task}
                        </div>
                      </div>
                      <span
                        className="flex-shrink-0 rounded-md px-1.5 py-0.5"
                        style={{
                          fontSize: 8.5, fontWeight: 600,
                          background: `${demo.accentColor}18`,
                          color: demo.accentColor,
                          border: `1px solid ${demo.accentColor}30`,
                        }}
                      >
                        {demo.difficulty}
                      </span>
                    </div>

                    <p style={{ fontSize: 9.5, lineHeight: 1.5,
                      color: isDark ? '#475569' : '#94A3B8' }}>
                      {demo.tagline}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {demo.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          fontSize: 8, fontWeight: 500, borderRadius: 4,
                          padding: '1px 5px',
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(30,64,175,0.06)',
                          color: isDark ? '#94A3B8' : '#6B7280',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        }}>{tag}</span>
                      ))}
                    </div>

                    {/* Load button */}
                    <div
                      className="flex items-center justify-between mt-1"
                      style={{
                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                        paddingTop: 6,
                      }}
                    >
                      <span style={{ fontSize: 9.5, fontWeight: 600,
                        color: isHov ? demo.accentColor : (isDark ? '#64748B' : '#94A3B8'),
                        transition: 'color 0.2s' }}>
                        {demo.nodes.length} layers · {demo.connections.length} connections
                      </span>
                      <span
                        className="flex items-center gap-1"
                        style={{ fontSize: 10, fontWeight: 700,
                          color: demo.accentColor, opacity: isHov ? 1 : 0.7,
                          transition: 'opacity 0.2s' }}
                      >
                        Load <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }} />
            <span style={{ fontSize: 10, color: isDark ? '#475569' : '#CBD5E1' }}>or</span>
            <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }} />
          </div>

          {/* Footer CTAs */}
          <div className="flex items-center gap-3 pb-6">
            {/* Start from scratch */}
            <button
              onClick={onDismiss}
              className="flex-1 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98]"
              style={{
                fontSize: 12,
                background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                color: 'white',
                boxShadow: '0 4px 18px rgba(30,64,175,0.40)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(30,64,175,0.55)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 18px rgba(30,64,175,0.40)'; }}
            >
              Start from Scratch →
            </button>

            {/* Take tour */}
            <button
              onClick={handleTakeATour}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
              style={{
                fontSize: 12, fontWeight: 600,
                color: isDark ? '#94A3B8' : '#64748B',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = isDark ? '#CBD5E1' : '#334155';
                el.style.borderColor = isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = isDark ? '#94A3B8' : '#64748B';
                el.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
              }}
            >
              <Sparkles size={12} /> Take the Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}