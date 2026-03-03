/**
 * Omnimind — Results Dashboard Panel
 * Slides in from the right after training / forward-pass completion.
 * Weights & Biases–inspired clean metrics display.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  X, Download, ChevronDown, ChevronUp, CheckCircle2,
  Zap, TrendingDown, TrendingUp, Layers, Activity,
  BarChart2, FileJson, Share2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import type { NetworkNode, NetworkConnection } from './types';
import type { TrainAnimState } from './TrainingPanel';
import type { ForwardPassResult } from './forwardProp';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatNum(v: number, digits = 4): string {
  return v.toFixed(digits);
}

function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function estimateParams(nodes: NetworkNode[]): number {
  let total = 0;
  nodes.forEach(n => {
    if (n.type === 'dense') {
      const neurons = n.config.neurons ?? 64;
      total += neurons * 64 + neurons; // weights + biases (rough)
    } else if (n.type === 'conv2d') {
      const f = n.config.filters ?? 32;
      const k = n.config.kernelSize ?? 3;
      total += f * k * k * 3 + f;
    } else if (n.type === 'lstm') {
      const u = n.config.units ?? 64;
      total += 4 * (u * u + u * 64 + u);
    }
  });
  return Math.max(total, nodes.length * 32);
}

function formatParams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function estimateJsonKB(nodes: NetworkNode[], connections: NetworkConnection[]): number {
  const json = JSON.stringify({ nodes, connections });
  return Math.round(json.length / 1024 * 10) / 10;
}

// ── Custom chart tooltip ───────────────────────────────────────────────────────
function MetricTooltip({ active, payload, label, isDark }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string; dataKey: string }[];
  label?: number;
  isDark: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: isDark ? '#1E293B' : '#FFFFFF',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0'}`,
      borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      fontSize: 10,
    }}>
      <div style={{ fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 4 }}>
        Epoch {label}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2" style={{ marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: isDark ? '#94A3B8' : '#64748B', textTransform: 'capitalize' }}>
            {p.name === 'accuracy' ? 'Accuracy' : 'Loss'}:
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: p.color }}>
            {p.name === 'accuracy' ? formatPct(p.value) : formatNum(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color, isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{
        background: isDark ? `${color}0D` : `${color}09`,
        border: `1px solid ${color}25`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color, opacity: 0.85 }}>{icon}</span>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: isDark ? '#64748B' : '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#E2E8F0' : '#1E293B',
        fontFamily: 'monospace', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: isDark ? '#475569' : '#94A3B8' }}>{sub}</div>
      )}
    </div>
  );
}

// ── Collapsible Section ───────────────────────────────────────────────────────
function Section({
  title, icon, children, defaultOpen = true, isDark,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2.5 transition-colors"
        style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#3B82F6' }}>{icon}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: isDark ? '#CBD5E1' : '#334155' }}>
            {title}
          </span>
        </div>
        {open
          ? <ChevronUp size={12} style={{ color: isDark ? '#475569' : '#CBD5E1' }} />
          : <ChevronDown size={12} style={{ color: isDark ? '#475569' : '#CBD5E1' }} />
        }
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
}

// ── Main Dashboard Props ───────────────────────────────────────────────────────
interface ResultsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  trainState: TrainAnimState | null;
  fwdResult: ForwardPassResult | null;
  onExport: () => void;
  isDark: boolean;
}

export function ResultsDashboard({
  isOpen,
  onClose,
  nodes,
  connections,
  trainState,
  fwdResult,
  onExport,
  isDark,
}: ResultsDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [chartAnimated, setChartAnimated] = useState(false);
  const [exportPulse, setExportPulse] = useState(false);

  // Animate chart data on open
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const t = setTimeout(() => setChartAnimated(true), 200);
      return () => clearTimeout(t);
    } else {
      // Small delay before unmounting for exit animation
      const t = setTimeout(() => {
        setMounted(false);
        setChartAnimated(false);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleExport = useCallback(() => {
    setExportPulse(true);
    setTimeout(() => setExportPulse(false), 800);
    onExport();
  }, [onExport]);

  if (!mounted && !isOpen) return null;

  const hasTraining = trainState?.isComplete && trainState.history.length > 0;
  const hasFwdPass  = fwdResult !== null;
  const hasSomething = hasTraining || hasFwdPass;

  const finalLoss     = trainState?.currentLoss ?? null;
  const finalAccuracy = trainState?.currentAccuracy ?? null;
  const totalEpochs   = trainState?.totalEpochs ?? 0;
  const totalParams   = estimateParams(nodes);
  const jsonKB        = estimateJsonKB(nodes, connections);

  // Build chart data - use the last 60 points for readability
  const chartData = hasTraining
    ? trainState!.history.slice(-60).map((h, i, arr) => ({
        epoch: h.epoch,
        loss: parseFloat(h.loss.toFixed(4)),
        accuracy: parseFloat(h.accuracy.toFixed(4)),
      }))
    : [];

  // Best epoch
  const bestEpoch = chartData.length > 0
    ? chartData.reduce((best, d) => d.accuracy > best.accuracy ? d : best, chartData[0])
    : null;

  return (
    <>
      {/* ── Backdrop (semi-transparent) ── */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[39]"
          style={{ background: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(1px)' }}
          onClick={onClose}
        />
      )}

      {/* ── Panel ── */}
      <div
        role="complementary"
        aria-label="Results Dashboard"
        className="absolute top-0 right-0 h-full z-[40] flex flex-col overflow-hidden"
        style={{
          width: 380,
          background: isDark ? '#0C1525' : '#FFFFFF',
          borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
          boxShadow: isDark
            ? '-8px 0 40px rgba(0,0,0,0.55)'
            : '-4px 0 32px rgba(30,64,175,0.10)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #0C1844 0%, #0F766E 80%)'
              : 'linear-gradient(135deg, #1E40AF 0%, #0F766E 100%)',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }}
            >
              <BarChart2 size={14} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1 }}>
                Results Dashboard
              </div>
              <div style={{ fontSize: 9.5, color: 'rgba(204,251,241,0.70)', marginTop: 2 }}>
                {hasTraining && `${totalEpochs} epochs trained`}
                {hasFwdPass && !hasTraining && 'Forward pass complete'}
                {!hasSomething && 'No results yet'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasSomething && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                title="Export model as JSON"
                style={{
                  fontSize: 10, fontWeight: 600, color: 'white',
                  background: exportPulse ? 'rgba(245,158,11,0.40)' : 'rgba(255,255,255,0.15)',
                  border: `1px solid ${exportPulse ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.20)'}`,
                  transition: 'all 0.3s ease',
                  transform: exportPulse ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <Share2 size={10} /> Share
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close results dashboard"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.15)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.20)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; }}
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin',
          scrollbarColor: isDark ? '#1E293B #0C1525' : '#E2E8F0 transparent' }}>
          <div className="p-4 space-y-5">

            {/* ── Status Banner ── */}
            {hasSomething && (
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: hasTraining
                    ? (isDark ? 'rgba(15,118,110,0.15)' : '#F0FDF4')
                    : (isDark ? 'rgba(30,64,175,0.15)' : '#EFF6FF'),
                  border: hasTraining
                    ? `1px solid ${isDark ? 'rgba(15,118,110,0.40)' : 'rgba(15,118,110,0.25)'}` 
                    : `1px solid ${isDark ? 'rgba(30,64,175,0.40)' : 'rgba(30,64,175,0.20)'}`,
                  opacity: chartAnimated ? 1 : 0,
                  transform: chartAnimated ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.35s ease, transform 0.35s ease',
                }}
              >
                <CheckCircle2 size={20} color={hasTraining ? '#0F766E' : '#1E40AF'} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700,
                    color: isDark ? '#E2E8F0' : '#1E293B' }}>
                    {hasTraining ? '✓ Training Complete' : '✓ Forward Pass Complete'}
                  </div>
                  <div style={{ fontSize: 10, color: isDark ? '#64748B' : '#64748B', marginTop: 2 }}>
                    {hasTraining
                      ? `${totalEpochs} epochs · best accuracy ${formatPct(bestEpoch?.accuracy ?? finalAccuracy ?? 0)} @ epoch ${bestEpoch?.epoch ?? totalEpochs}`
                      : `${fwdResult?.outputValues.length ?? 0} output values computed`}
                  </div>
                </div>
              </div>
            )}

            {/* ── No Results Placeholder ── */}
            {!hasSomething && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div style={{ fontSize: 48, opacity: 0.12 }}>📊</div>
                <div style={{ fontSize: 13, fontWeight: 600,
                  color: isDark ? '#475569' : '#94A3B8', marginTop: 8 }}>
                  No results yet
                </div>
                <div style={{ fontSize: 11, color: isDark ? '#374151' : '#CBD5E1', marginTop: 4, lineHeight: 1.5 }}>
                  Press <kbd style={{ background: isDark ? '#1E293B' : '#F1F5F9',
                    border: `1px solid ${isDark ? '#374151' : '#E2E8F0'}`,
                    borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>T</kbd> to train
                  &nbsp;or&nbsp;
                  <kbd style={{ background: isDark ? '#1E293B' : '#F1F5F9',
                    border: `1px solid ${isDark ? '#374151' : '#E2E8F0'}`,
                    borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>R</kbd> to run a forward pass
                </div>
              </div>
            )}

            {/* ── Stats Grid ── */}
            {hasSomething && (
              <div
                className="grid grid-cols-2 gap-2.5"
                style={{
                  opacity: chartAnimated ? 1 : 0,
                  transform: chartAnimated ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 0.35s ease 0.08s, transform 0.35s ease 0.08s',
                }}
              >
                <StatCard
                  icon={<Layers size={12} />}
                  label="Layers"
                  value={String(nodes.length)}
                  sub={`${connections.length} connections`}
                  color="#1E40AF"
                  isDark={isDark}
                />
                <StatCard
                  icon={<Activity size={12} />}
                  label="Parameters"
                  value={formatParams(totalParams)}
                  sub="estimated"
                  color="#7C3AED"
                  isDark={isDark}
                />
                {hasTraining && finalLoss !== null && (
                  <StatCard
                    icon={<TrendingDown size={12} />}
                    label="Final Loss"
                    value={formatNum(finalLoss)}
                    sub="cross-entropy"
                    color="#EF4444"
                    isDark={isDark}
                  />
                )}
                {hasTraining && finalAccuracy !== null && (
                  <StatCard
                    icon={<TrendingUp size={12} />}
                    label="Accuracy"
                    value={formatPct(finalAccuracy)}
                    sub={`${totalEpochs} epochs`}
                    color="#0F766E"
                    isDark={isDark}
                  />
                )}
                {!hasTraining && hasFwdPass && (
                  <StatCard
                    icon={<Zap size={12} />}
                    label="Outputs"
                    value={String(fwdResult?.outputValues.length ?? 0)}
                    sub="neurons computed"
                    color="#F59E0B"
                    isDark={isDark}
                  />
                )}
              </div>
            )}

            {/* ── Training Chart ── */}
            {hasTraining && chartData.length > 2 && (
              <Section title="Loss & Accuracy" icon={<TrendingDown size={12} />} isDark={isDark}>
                <div
                  style={{
                    opacity: chartAnimated ? 1 : 0,
                    transition: 'opacity 0.5s ease 0.15s',
                  }}
                >
                  {/* Loss chart */}
                  <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#475569' : '#94A3B8',
                    marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Loss
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3"
                        stroke={isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'} />
                      <XAxis dataKey="epoch" tick={{ fontSize: 8, fill: isDark ? '#374151' : '#CBD5E1' }}
                        tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: isDark ? '#374151' : '#CBD5E1' }}
                        tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip content={<MetricTooltip isDark={isDark} />} />
                      {bestEpoch && (
                        <ReferenceLine x={bestEpoch.epoch} stroke="#F59E0B" strokeDasharray="3 2"
                          strokeWidth={1.5} opacity={0.6} />
                      )}
                      <Area type="monotone" dataKey="loss" stroke="#EF4444" strokeWidth={2}
                        fill="url(#lossGrad)" dot={false} activeDot={{ r: 4, fill: '#EF4444' }}
                        isAnimationActive={chartAnimated} animationDuration={800}
                        animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Accuracy chart */}
                  <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#475569' : '#94A3B8',
                    marginTop: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Accuracy
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3"
                        stroke={isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'} />
                      <XAxis dataKey="epoch" tick={{ fontSize: 8, fill: isDark ? '#374151' : '#CBD5E1' }}
                        tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: isDark ? '#374151' : '#CBD5E1' }}
                        tickLine={false} axisLine={false}
                        tickFormatter={v => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                      <Tooltip content={<MetricTooltip isDark={isDark} />} />
                      {bestEpoch && (
                        <ReferenceLine x={bestEpoch.epoch} stroke="#F59E0B" strokeDasharray="3 2"
                          strokeWidth={1.5} opacity={0.6} label={{
                            value: 'Best', fill: '#F59E0B', fontSize: 8, position: 'top',
                          }} />
                      )}
                      <Area type="monotone" dataKey="accuracy" stroke="#0F766E" strokeWidth={2}
                        fill="url(#accGrad)" dot={false} activeDot={{ r: 4, fill: '#0F766E' }}
                        isAnimationActive={chartAnimated} animationDuration={800}
                        animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Chart legend */}
                  <div className="flex items-center gap-3 mt-2">
                    {[
                      { color: '#F59E0B', label: 'Best epoch' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <div style={{ width: 14, borderTop: `2px dashed ${l.color}` }} />
                        <span style={{ fontSize: 9, color: isDark ? '#475569' : '#94A3B8' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* ── Predicted vs Actual (Forward Pass) ── */}
            {hasFwdPass && fwdResult && fwdResult.outputValues.length > 0 && (
              <Section title="Forward Pass Output" icon={<Zap size={12} />} isDark={isDark}>
                <div className="space-y-2">
                  {fwdResult.outputValues.map((v, i) => {
                    const pct = Math.round(v * 100);
                    const isMax = fwdResult.outputValues.every(x => x <= v);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 p-2 rounded-lg"
                        style={{
                          background: isMax
                            ? (isDark ? 'rgba(15,118,110,0.12)' : '#F0FDF4')
                            : (isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA'),
                          border: isMax
                            ? `1px solid ${isDark ? 'rgba(15,118,110,0.30)' : 'rgba(15,118,110,0.20)'}` 
                            : `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9'}`,
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 600, minWidth: 40,
                          color: isDark ? '#64748B' : '#94A3B8' }}>
                          Output {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden"
                            style={{ background: isDark ? '#1E293B' : '#F1F5F9' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: isMax
                                  ? 'linear-gradient(90deg, #0F766E, #0D9488)'
                                  : 'linear-gradient(90deg, #1E40AF88, #3B82F688)',
                                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                          minWidth: 36, textAlign: 'right',
                          color: isMax ? '#0F766E' : (isDark ? '#475569' : '#94A3B8') }}>
                          {pct}%
                        </div>
                        {isMax && (
                          <CheckCircle2 size={12} color="#0F766E" />
                        )}
                      </div>
                    );
                  })}
                  {/* Node activation heatmap summary */}
                  {Object.keys(fwdResult.nodeActivations).length > 2 && (
                    <div className="mt-3">
                      <div style={{ fontSize: 9.5, fontWeight: 600, color: isDark ? '#475569' : '#94A3B8',
                        marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Layer Activation Heatmap
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(fwdResult.nodeActivations).slice(0, 24).map(([nodeId, v]) => {
                          const intensity = Math.max(0, Math.min(1, v));
                          return (
                            <div
                              key={nodeId}
                              title={`${(intensity * 100).toFixed(0)}%`}
                              style={{
                                width: 18, height: 18, borderRadius: 4,
                                background: `rgba(30,64,175,${0.1 + intensity * 0.85})`,
                                border: `1px solid rgba(30,64,175,${0.2 + intensity * 0.4})`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ── Model Summary ── */}
            <Section title="Model Summary" icon={<Layers size={12} />} defaultOpen={false} isDark={isDark}>
              <div className="space-y-1.5">
                {nodes.map((node, i) => {
                  const typeColors: Record<string, string> = {
                    input: '#1E40AF', dense: '#3B82F6', activation: '#F59E0B',
                    dropout: '#0F766E', output: '#0D9488', conv2d: '#7C3AED',
                    flatten: '#64748B', lstm: '#0D9488', batchnorm: '#059669',
                    embedding: '#D97706',
                  };
                  const color = typeColors[node.type] ?? '#64748B';
                  const configStr = node.config.neurons ? `neurons: ${node.config.neurons}`
                    : node.config.inputShape ? `shape: ${node.config.inputShape}`
                    : node.config.outputShape ? `shape: ${node.config.outputShape}`
                    : node.config.activationFn ? node.config.activationFn
                    : node.config.filters ? `${node.config.filters} filters`
                    : '';

                  return (
                    <div
                      key={node.id}
                      className="flex items-center gap-2.5 py-1.5 rounded-lg px-2"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9'}`,
                      }}
                    >
                      {/* Layer index */}
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: `${color}20`,
                        border: `1px solid ${color}40`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 8, fontWeight: 700, color, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 11, fontWeight: 600,
                          color: isDark ? '#CBD5E1' : '#334155', lineHeight: 1.2 }}>
                          {node.label}
                        </div>
                        {configStr && (
                          <div style={{ fontSize: 9.5, color: isDark ? '#475569' : '#94A3B8' }}>
                            {configStr}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
                        background: `${color}15`, color, border: `1px solid ${color}30`,
                        flexShrink: 0, textTransform: 'capitalize' }}>
                        {node.type}
                      </div>
                    </div>
                  );
                })}
                {nodes.length === 0 && (
                  <p style={{ fontSize: 11, color: isDark ? '#374151' : '#CBD5E1', textAlign: 'center', padding: '16px 0' }}>
                    No layers in the network yet.
                  </p>
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* ── Footer: Export button ── */}
        <div
          className="flex-shrink-0 p-4"
          style={{
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
            background: isDark ? '#0C1525' : '#FAFBFF',
          }}
        >
          {/* File size info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <FileJson size={12} style={{ color: isDark ? '#475569' : '#94A3B8' }} />
              <span style={{ fontSize: 10, color: isDark ? '#475569' : '#94A3B8' }}>
                omnimind_model.json
              </span>
            </div>
            <span style={{ fontSize: 10, fontFamily: 'monospace',
              color: isDark ? '#334155' : '#CBD5E1' }}>
              ~{jsonKB} KB
            </span>
          </div>

          {/* Export button — full width, gradient */}
          <button
            onClick={handleExport}
            disabled={nodes.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all active:scale-[0.98]"
            style={{
              fontSize: 13,
              color: nodes.length > 0 ? 'white' : (isDark ? '#374151' : '#CBD5E1'),
              background: nodes.length > 0
                ? (exportPulse
                    ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                    : 'linear-gradient(135deg, #1E40AF, #2563EB)')
                : (isDark ? '#1E293B' : '#F1F5F9'),
              boxShadow: nodes.length > 0
                ? (exportPulse
                    ? '0 4px 20px rgba(245,158,11,0.45)'
                    : '0 4px 20px rgba(30,64,175,0.40)')
                : 'none',
              cursor: nodes.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              if (nodes.length > 0 && !exportPulse) {
                const el = e.currentTarget as HTMLElement;
                el.style.boxShadow = '0 6px 28px rgba(30,64,175,0.55)';
                el.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = nodes.length > 0 ? '0 4px 20px rgba(30,64,175,0.40)' : 'none';
              el.style.transform = 'translateY(0)';
            }}
          >
            <Download size={15} />
            Export Model as JSON
          </button>

          {/* Timestamp hint */}
          <div style={{ fontSize: 9, color: isDark ? '#1F2937' : '#E2E8F0',
            textAlign: 'center', marginTop: 6 }}>
            Will be saved as omnimind_model_{'{timestamp}'}.json
          </div>
        </div>
      </div>
    </>
  );
}
