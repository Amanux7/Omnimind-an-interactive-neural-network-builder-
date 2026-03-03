/**
 * Omnimind — AI Optimize Panel
 * Scanning animation → suggestion cards with apply/dismiss.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Sparkles, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, Info, Lightbulb, X, Zap, SkipForward,
  BookOpen, ArrowRight, RefreshCw, Cpu,
} from 'lucide-react';
import {
  analyzeNetwork, AISuggestion, AISeverity, AICategory,
} from './AIOptimizer';
import { NetworkNode, NetworkConnection } from './types';
import { SimulationState } from './types';

// ── Scan phases ───────────────────────────────────────────────────────────────

const SCAN_PHASES = [
  'Initializing analysis engine…',
  'Mapping network topology…',
  'Evaluating architecture patterns…',
  'Checking activation functions…',
  'Analyzing training metrics…',
  'Scanning for regularization gaps…',
  'Generating recommendations…',
];

// ── Style maps ────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AISeverity, {
  bg: string; border: string; badge: string; badgeTxt: string;
  icon: React.ReactNode; barColor: string; glow: string;
}> = {
  critical: {
    bg: 'bg-red-50', border: 'border-red-200', barColor: '#EF4444', glow: 'rgba(239,68,68,0.12)',
    badge: 'bg-red-100', badgeTxt: 'text-red-700',
    icon: <AlertTriangle size={13} className="text-red-500" />,
  },
  warning: {
    bg: 'bg-amber-50', border: 'border-amber-200', barColor: '#F59E0B', glow: 'rgba(245,158,11,0.12)',
    badge: 'bg-amber-100', badgeTxt: 'text-amber-700',
    icon: <AlertTriangle size={13} className="text-amber-500" />,
  },
  info: {
    bg: 'bg-blue-50', border: 'border-blue-200', barColor: '#3B82F6', glow: 'rgba(59,130,246,0.12)',
    badge: 'bg-blue-100', badgeTxt: 'text-blue-700',
    icon: <Info size={13} className="text-blue-500" />,
  },
  tip: {
    bg: 'bg-violet-50', border: 'border-violet-200', barColor: '#8B5CF6', glow: 'rgba(139,92,246,0.12)',
    badge: 'bg-violet-100', badgeTxt: 'text-violet-700',
    icon: <Lightbulb size={13} className="text-violet-500" />,
  },
};

const CATEGORY_LABELS: Record<AICategory, string> = {
  architecture:   '🏗 Architecture',
  activation:     '⚡ Activation',
  regularization: '🛡 Regularization',
  training:       '📉 Training',
  performance:    '🚀 Performance',
};

const SEVERITY_LABEL: Record<AISeverity, string> = {
  critical: 'CRITICAL',
  warning:  'WARNING',
  info:     'INFO',
  tip:      'TIP',
};

// ── Confidence bar ────────────────────────────────────────────────────────────
function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-slate-400 w-16 text-right">{value}% confidence</span>
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Individual suggestion card ────────────────────────────────────────────────
interface CardProps {
  suggestion: AISuggestion;
  index: number;
  dismissed: boolean;
  applied: boolean;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

function SuggestionCard({ suggestion: s, index, dismissed, applied, onApply, onDismiss }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const styles = SEVERITY_STYLES[s.severity];
  const canApply = s.action && s.action.type !== 'none';

  if (dismissed) return null;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-300 ${styles.border}`}
      style={{
        background: applied ? 'white' : styles.bg,
        boxShadow: applied
          ? '0 2px 8px rgba(0,0,0,0.04)'
          : `0 2px 12px ${styles.glow}, 0 0 0 1px rgba(0,0,0,0.02)`,
        animation: `slideInCard 0.3s cubic-bezier(0.34,1.2,0.64,1) both`,
        animationDelay: `${index * 0.06}s`,
        opacity: applied ? 0.65 : 1,
      }}
    >
      {/* Left severity bar */}
      <div className="flex">
        <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ background: styles.barColor }} />

        <div className="flex-1 p-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {styles.icon}
              <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded ${styles.badge} ${styles.badgeTxt}`}>
                {SEVERITY_LABEL[s.severity]}
              </span>
              <span className="text-[9px] text-slate-400">{CATEGORY_LABELS[s.category]}</span>
              {applied && (
                <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Applied
                </span>
              )}
            </div>
            <ConfidenceBar value={s.confidence} color={styles.barColor} />
          </div>

          {/* Title */}
          <h3 className="text-[12px] font-bold text-slate-800 mb-1 leading-tight">{s.title}</h3>

          {/* Short description */}
          <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{s.shortDesc}</p>

          {/* Impact badge */}
          <div className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full mb-2">
            {s.impact}
          </div>

          {/* Expand / collapse deep-dive */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            <BookOpen size={10} />
            {expanded ? 'Hide' : 'Deep Dive'} — why this matters
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

          {expanded && (
            <div
              className="mb-3 rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              {/* Explanation */}
              <div className="p-3">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Brain size={9} /> Explanation
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                  {s.explanation}
                </p>
              </div>

              {/* Code example */}
              {s.example && (
                <div className="border-t border-slate-100">
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Example
                    </div>
                  </div>
                  <pre
                    className="px-3 pb-3 text-[10px] leading-relaxed overflow-x-auto"
                    style={{ color: '#334155', fontFamily: 'ui-monospace, monospace' }}
                  >
                    {s.example}
                  </pre>
                </div>
              )}

              {/* Pro tip */}
              {s.proTip && (
                <div className="border-t border-slate-100 px-3 py-2.5 flex items-start gap-1.5">
                  <Lightbulb size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    <span className="font-semibold">Pro tip:</span> {s.proTip}
                  </p>
                </div>
              )}

              {/* Action description */}
              {canApply && (
                <div className="border-t border-slate-100 px-3 py-2 flex items-center gap-1.5">
                  <ArrowRight size={10} className="text-slate-400" />
                  <span className="text-[10px] text-slate-500">{s.action!.label}</span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!applied && (
            <div className="flex items-center gap-1.5">
              {canApply ? (
                <button
                  onClick={() => onApply(s.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${styles.barColor}, ${styles.barColor}cc)`,
                    boxShadow: `0 2px 8px ${styles.glow}` }}
                >
                  <Zap size={10} />
                  Apply Fix
                </button>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 bg-slate-50 border border-slate-200">
                  <Info size={10} />
                  Manual fix needed
                </div>
              )}
              <button
                onClick={() => onDismiss(s.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <SkipForward size={10} /> Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Scanning animation ────────────────────────────────────────────────────────
function ScanningView({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = SCAN_PHASES.length;
    const phaseMs = 240;

    const phaseTimer = setInterval(() => {
      setPhase(p => {
        const next = p + 1;
        setProgress(Math.round((next / total) * 100));
        if (next >= total) {
          clearInterval(phaseTimer);
          setTimeout(onDone, 200);
        }
        return next;
      });
    }, phaseMs);

    const dotTimer = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 180);

    return () => { clearInterval(phaseTimer); clearInterval(dotTimer); };
  }, [onDone]);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">

      {/* ── Brain pulse + orbit rings ── */}
      <div className="relative mb-6" aria-label="Analyzing network" aria-live="polite">

        {/*
          Ambient radial background glow — slightly larger than the icon,
          pulses softly while scanning is active.
        */}
        <div
          className="absolute inset-0 rounded-full"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 72%)',
            inset: '-14px',
            animation: 'om-pulse-beat 2.2s ease-in-out infinite',
          }}
        />

        {/*
          Brain icon container.
          `overflow-visible` is required so the absolutely-positioned orbit
          rings can extend outside the rounded-2xl boundary without clipping.
        */}
        <div
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600
                     flex items-center justify-center shadow-lg relative"
          style={{ overflow: 'visible' }}
          aria-hidden="true"
        >
          {/*
            Outer orbit ring — amber, fast clockwise rotation (1.05 s).
            Uses `om-scan-orbit-outer` CSS class from icon-animations.css.
            The amber segment glows with a drop-shadow filter.
          */}
          <span className="om-scan-orbit-outer" aria-hidden="true" />

          {/*
            Inner orbit ring — indigo, slower counter-clockwise rotation (1.80 s).
            Creates the dual-tone Omnimind palette effect.
          */}
          <span className="om-scan-orbit-inner" aria-hidden="true" />

          {/*
            Three satellite dots orbiting at different phase offsets.
            Colors: amber → violet → indigo (defined in CSS nth-child).
          */}
          <span className="om-scan-dot" aria-hidden="true" />
          <span className="om-scan-dot" aria-hidden="true" />
          <span className="om-scan-dot" aria-hidden="true" />

          {/* Brain icon — heartbeat-scale while scanning */}
          <Brain
            size={24}
            className="text-white relative z-10"
            style={{ animation: 'om-pulse-beat 1.60s ease-in-out infinite' }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Status text */}
      <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
        Analyzing your network{dots}
      </p>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-5 h-4 text-center">
        {SCAN_PHASES[Math.min(phase, SCAN_PHASES.length - 1)]}
      </p>

      {/* ── Progress bar — Omnimind cognitive gradient ── */}
      <div
        className="w-48 h-1.5 bg-slate-100 dark:bg-slate-700/70 rounded-full overflow-hidden mb-5"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Analysis progress: ${progress}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${progress}%`,
            // Cognitive gradient: primary indigo → amber accent
            background: 'linear-gradient(90deg, #1E40AF 0%, #6366F1 50%, #F59E0B 100%)',
            backgroundSize: '200% 100%',
            animation: 'om-sweep 2.0s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Phase checklist ── */}
      <div className="space-y-1.5 w-48" role="list" aria-label="Analysis phases">
        {SCAN_PHASES.slice(0, -1).map((ph, i) => (
          <div key={i} className="flex items-center gap-2" role="listitem">
            {i < phase ? (
              /* Completed phase */
              <CheckCircle2
                size={10}
                className="text-emerald-500 flex-shrink-0"
                aria-label="Complete"
              />
            ) : i === phase ? (
              /* Active phase — om-scan-phase-dot uses om-pulse-beat animation */
              <span
                className="om-scan-phase-dot"
                aria-label="In progress"
              />
            ) : (
              /* Pending phase */
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600 flex-shrink-0" aria-hidden="true" />
            )}
            <span
              className={`text-[10px] transition-colors duration-200 ${
                i < phase
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : i === phase
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-slate-300 dark:text-slate-600'
              }`}
            >
              {ph}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export interface AIOptimizePanelProps {
  isOpen: boolean;
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  simulation: SimulationState;
  onClose: () => void;
  onApplySuggestion: (suggestion: AISuggestion) => void;
}

export function AIOptimizePanel({
  isOpen, nodes, connections, simulation, onClose, onApplySuggestion,
}: AIOptimizePanelProps) {
  const [scanning, setScanning]     = useState(false);
  const [scanned, setScanned]       = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [dismissed, setDismissed]   = useState<Set<string>>(new Set());
  const [applied, setApplied]       = useState<Set<string>>(new Set());
  const [filter, setFilter]         = useState<AISeverity | 'all'>('all');

  // Re-scan whenever panel opens
  useEffect(() => {
    if (!isOpen) return;
    setScanning(true);
    setScanned(false);
    setDismissed(new Set());
    setApplied(new Set());
    setSuggestions([]);
  }, [isOpen]);

  const handleScanDone = useCallback(() => {
    const results = analyzeNetwork(nodes, connections, simulation);
    setSuggestions(results);
    setScanning(false);
    setScanned(true);
  }, [nodes, connections, simulation]);

  const handleRescan = useCallback(() => {
    setScanning(true);
    setScanned(false);
    setDismissed(new Set());
    setApplied(new Set());
  }, []);

  const handleApply = useCallback((id: string) => {
    const s = suggestions.find(x => x.id === id);
    if (!s) return;
    onApplySuggestion(s);
    setApplied(prev => new Set([...prev, id]));
  }, [suggestions, onApplySuggestion]);

  const handleApplyAll = useCallback(() => {
    const applyable = suggestions.filter(
      s => s.action?.type !== 'none' && !applied.has(s.id) && !dismissed.has(s.id),
    );
    applyable.forEach(s => {
      onApplySuggestion(s);
      setApplied(prev => new Set([...prev, s.id]));
    });
  }, [suggestions, applied, dismissed, onApplySuggestion]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  if (!isOpen) return null;

  const visible = suggestions.filter(s => !dismissed.has(s.id));
  const filtered = filter === 'all' ? visible : visible.filter(s => s.severity === filter);
  const applyableCount = visible.filter(s => s.action?.type !== 'none' && !applied.has(s.id)).length;

  const counts = {
    critical: visible.filter(s => s.severity === 'critical').length,
    warning:  visible.filter(s => s.severity === 'warning').length,
    info:     visible.filter(s => s.severity === 'info').length,
    tip:      visible.filter(s => s.severity === 'tip').length,
  };

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes slideInCard {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(32px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(32px) rotate(-360deg); }
        }
        @keyframes panelSlideIn {
          from { opacity: 0; transform: translateX(24px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>

      {/* Panel */}
      <div
        className="absolute top-4 right-4 z-[80] flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 480,
          maxHeight: 'calc(100vh - 140px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 0 0 1px rgba(99,102,241,0.12)',
          background: 'white',
          animation: 'panelSlideIn 0.25s cubic-bezier(0.34,1.2,0.64,1) both',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white leading-none">Omnimind AI</div>
            <div className="text-[10px] text-white/60 leading-none mt-0.5">
              Rule-based optimization • Educational insights
            </div>
          </div>
          {scanned && (
            <button
              onClick={handleRescan}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all"
              title="Re-analyze"
            >
              <RefreshCw size={12} className="text-white" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all"
          >
            <X size={13} className="text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Scanning */}
          {scanning && <ScanningView onDone={handleScanDone} />}

          {/* Results */}
          {scanned && (
            <>
              {/* Summary strip */}
              <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu size={11} className="text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-600">
                      {visible.length} suggestion{visible.length !== 1 ? 's' : ''} found
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {nodes.length} layers, {connections.length} connections
                    </span>
                  </div>
                  {applyableCount > 0 && (
                    <button
                      onClick={handleApplyAll}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                    >
                      <Zap size={9} />
                      Apply All ({applyableCount})
                    </button>
                  )}
                </div>

                {/* Severity filter chips */}
                <div className="flex gap-1 flex-wrap">
                  {(['all', 'critical', 'warning', 'info', 'tip'] as const).map(sev => {
                    const cnt = sev === 'all' ? visible.length : counts[sev];
                    if (sev !== 'all' && cnt === 0) return null;
                    return (
                      <button
                        key={sev}
                        onClick={() => setFilter(sev)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                          filter === sev
                            ? 'text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        style={filter === sev ? {
                          background: sev === 'all' ? '#4F46E5'
                            : sev === 'critical' ? '#EF4444'
                            : sev === 'warning' ? '#F59E0B'
                            : sev === 'info' ? '#3B82F6' : '#8B5CF6',
                        } : {}}
                      >
                        {sev === 'all' ? `All (${cnt})` : `${sev} (${cnt})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2.5">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <CheckCircle2 size={28} className="text-emerald-400 mb-2" />
                    <p className="text-[12px] font-semibold text-slate-600">All clear in this category!</p>
                    <p className="text-[11px]">Try a different filter or re-analyze after changes.</p>
                  </div>
                ) : (
                  filtered.map((s, i) => (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      index={i}
                      dismissed={dismissed.has(s.id)}
                      applied={applied.has(s.id)}
                      onApply={handleApply}
                      onDismiss={handleDismiss}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {scanned && (
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <BookOpen size={9} />
              <span>All changes support Undo (Ctrl+Z)</span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg text-[10px] font-medium text-slate-500 hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
