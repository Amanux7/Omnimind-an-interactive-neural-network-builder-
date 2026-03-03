import React, { memo } from 'react';
import {
  Play, Pause, Square, SkipForward, Zap, TrendingDown,
  Target, Activity, ChevronUp, ChevronDown, GraduationCap,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { SimulationState } from './types';
import { IconButton, NeuralIcon } from './IconButton';

interface SimulationBarProps {
  simulation: SimulationState;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onStep: () => void;
  onSpeedChange: (speed: number) => void;
  onEpochsChange: (epochs: number) => void;
  nodeCount: number;
  connectionCount: number;
  onRunForwardPass: () => void;
  fwdPropOpen: boolean;
  fwdIsRunning: boolean;
  fwdIsComplete: boolean;
  onOpenTraining: () => void;
  trainOpen: boolean;
  trainIsRunning: boolean;
  trainIsComplete: boolean;
}

// ── Metric badge ──────────────────────────────────────────────────────────────
const MetricBadge = memo(function MetricBadge({
  label, value, colorClass, icon, ariaLabel,
}: {
  label: string;
  value: string;
  colorClass: string;
  icon: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl
        bg-white dark:bg-slate-800
        border dark:border-slate-700/60 ${colorClass}
        shadow-[var(--shadow-xs)]
        min-w-[108px] flex-shrink-0
      `}
    >
      <div aria-hidden="true">{icon}</div>
      <div>
        <div className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium leading-none mb-0.5">
          {label}
        </div>
        <div className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums leading-none">
          {value}
        </div>
      </div>
    </div>
  );
});

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="h-10 w-px bg-slate-100 dark:bg-slate-700/60 flex-shrink-0 hidden sm:block" aria-hidden="true" />;
}

// ── Main bar ──────────────────────────────────────────────────────────────────
export const SimulationBar = memo(function SimulationBar({
  simulation, onStart, onPause, onStop, onStep, onSpeedChange, onEpochsChange,
  nodeCount, connectionCount,
  onRunForwardPass, fwdPropOpen, fwdIsRunning, fwdIsComplete,
  onOpenTraining, trainOpen, trainIsRunning, trainIsComplete,
}: SimulationBarProps) {
  const { isRunning, isPaused, epoch, totalEpochs, loss, accuracy, speed, history } = simulation;
  const progress   = totalEpochs > 0 ? (epoch / totalEpochs) * 100 : 0;
  const isComplete = epoch >= totalEpochs && totalEpochs > 0;
  const speedOptions = [0.5, 1, 2, 5, 10];

  const statusText  = isRunning && !isPaused ? 'Training'
    : isComplete ? 'Complete' : isPaused ? 'Paused' : 'Idle';
  const statusColor = isRunning && !isPaused
    ? 'bg-teal-400 om-status-dot om-status-dot--live'
    : isComplete ? 'bg-amber-400 om-status-dot' : 'bg-slate-300 dark:bg-slate-600 om-status-dot';

  return (
    <div
      role="toolbar"
      aria-label="Simulation controls"
      className="
        bg-white dark:bg-slate-900
        border-t border-slate-200 dark:border-slate-700/60
        shadow-[0_-2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.25)]
        flex-shrink-0
      "
    >
      {/* Scrollable inner row */}
      <div className="h-[88px] flex items-center px-3 gap-3 overflow-x-auto overscroll-x-contain">

        {/* ── Transport controls ── */}
        <div className="flex items-center gap-1.5 flex-shrink-0" role="group" aria-label="Playback controls">

          {/* Stop */}
          <IconButton
            variant="ghost-light"
            size="md"
            onClick={onStop}
            disabled={!isRunning && epoch === 0}
            aria-label="Stop training"
            title="Stop (resets epoch counter)"
            className="hover:!bg-red-50 dark:hover:!bg-red-950/30 hover:!border-red-300 dark:hover:!border-red-700 hover:!text-red-500"
          >
            <Square size={14} className="text-slate-500 dark:text-slate-400" />
          </IconButton>

          {/* Play / Pause */}
          {isRunning && !isPaused ? (
            <IconButton
              variant="amber"
              size="md"
              onClick={onPause}
              isAnimating
              animationType="pulse"
              aria-label="Pause training"
              statusLabel="Running"
              title="Pause"
            >
              <Pause size={14} />
            </IconButton>
          ) : (
            <IconButton
              variant="primary"
              size="md"
              onClick={onStart}
              disabled={nodeCount === 0 || isComplete}
              isAnimating={isComplete}
              animationType="spark"
              aria-label={isPaused ? 'Resume training' : 'Start training'}
              statusLabel={isPaused ? 'Paused' : undefined}
              title={isPaused ? 'Resume' : 'Start training'}
            >
              <Play size={14} className="ml-0.5" />
            </IconButton>
          )}

          {/* Step */}
          <IconButton
            variant="ghost-light"
            size="md"
            onClick={onStep}
            disabled={isRunning && !isPaused}
            aria-label="Step one epoch"
            title="Step one epoch"
          >
            <SkipForward size={14} />
          </IconButton>
        </div>

        {/* ── Forward Pass button ── */}
        <IconButton
          variant={fwdPropOpen ? 'amber' : fwdIsComplete ? 'teal' : 'ghost-light'}
          size="pill-sm"
          onClick={onRunForwardPass}
          isAnimating={fwdIsRunning}
          animationType="flow"
          isActive={fwdPropOpen}
          aria-label="Open forward propagation visualiser"
          aria-pressed={fwdPropOpen}
          title="Forward propagation (R)"
          statusLabel={fwdIsRunning ? 'Running' : undefined}
          icon={
            <Zap
              size={13}
              style={{ fill: fwdPropOpen ? 'white' : fwdIsComplete ? '#0D9488' : 'none' }}
            />
          }
        >
          <span className="hidden sm:inline">
            {fwdIsRunning ? 'Running…' : fwdIsComplete ? 'View Results' : 'Forward Pass'}
          </span>
          <span className="sm:hidden">Fwd</span>
          {fwdPropOpen && (
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 om-status-dot om-status-dot--live" aria-hidden="true" />
          )}
        </IconButton>

        {/* ── Train Model button ── */}
        <IconButton
          variant={trainOpen ? 'teal' : trainIsComplete ? 'teal' : trainIsRunning ? 'teal' : 'ghost-light'}
          size="pill-sm"
          onClick={onOpenTraining}
          isAnimating={trainIsRunning}
          animationType="pulse"
          isActive={trainOpen}
          aria-label="Open training mode"
          aria-pressed={trainOpen}
          title="Train model with gradient descent (T)"
          statusLabel={trainIsRunning ? 'Training' : undefined}
          icon={<GraduationCap size={13} />}
        >
          <span className="hidden sm:inline">
            {trainIsRunning ? 'Training…' : trainIsComplete ? 'Trained ✓' : 'Train Model'}
          </span>
          <span className="sm:hidden">Train</span>
          {trainOpen && (
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 om-status-dot om-status-dot--live" aria-hidden="true" />
          )}
        </IconButton>

        <Divider />

        {/* ── Epoch progress ── */}
        <div className="flex-shrink-0 min-w-[150px]">
          <div className="flex items-center justify-between mb-1.5">
            <span
              role="status"
              aria-live="polite"
              className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium"
            >
              {isComplete ? 'Complete ✓' : isRunning ? 'Training…' : epoch > 0 ? 'Paused' : 'Ready'}
            </span>
            <span className="text-[10.5px] text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
              {epoch} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {totalEpochs}</span>
            </span>
          </div>

          {/* Progress track */}
          <div
            role="progressbar"
            aria-valuenow={epoch}
            aria-valuemin={0}
            aria-valuemax={totalEpochs}
            aria-label="Training progress"
            className="w-full h-2 bg-slate-100 dark:bg-slate-700/70 rounded-full overflow-hidden"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: isComplete
                  ? 'linear-gradient(90deg,#0F766E,#14B8A6)'
                  : isRunning
                    ? 'linear-gradient(90deg,#1E40AF,#3B82F6,#F59E0B)'
                    : 'linear-gradient(90deg,#1E40AF,#3B82F6)',
                backgroundSize: isRunning ? '200% 100%' : '100% 100%',
              }}
            />
          </div>

          {/* Epoch stepper */}
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9.5px] text-slate-400 dark:text-slate-500">Epochs:</span>
            <button
              onClick={() => onEpochsChange(Math.max(10, totalEpochs - 10))}
              aria-label="Decrease total epochs"
              className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-slate-300 transition-colors"
            >
              <ChevronDown size={11} />
            </button>
            <span className="text-[10.5px] text-slate-600 dark:text-slate-300 font-semibold tabular-nums min-w-[28px] text-center">
              {totalEpochs}
            </span>
            <button
              onClick={() => onEpochsChange(Math.min(500, totalEpochs + 10))}
              aria-label="Increase total epochs"
              className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-slate-300 transition-colors"
            >
              <ChevronUp size={11} />
            </button>
          </div>
        </div>

        {/* ── Speed selector ── */}
        <div className="flex-shrink-0">
          <div className="text-[9.5px] text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-medium">
            Speed
          </div>
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Training speed"
          >
            {speedOptions.map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                aria-label={`${s}× speed`}
                aria-pressed={speed === s}
                className={`
                  om-speed-pill
                  px-2 py-1 rounded-lg text-[10.5px] font-semibold tabular-nums
                  nf-bevel
                  ${speed === s
                    ? 'om-speed-pill--active text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-700'
                  }
                `}
                style={speed === s
                  ? { background:'linear-gradient(135deg,#1E40AF,#2563EB)', boxShadow:'0 2px 6px rgba(30,64,175,0.30)' }
                  : {}}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* ── Metrics ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <MetricBadge
            label="Loss"
            value={loss.toFixed(4)}
            colorClass="border-red-100 dark:border-red-900/50"
            icon={
              <NeuralIcon animType="pulse" isAnimating={isRunning && !isPaused}>
                <TrendingDown size={14} className="text-red-500" />
              </NeuralIcon>
            }
            ariaLabel={`Current loss: ${loss.toFixed(4)}`}
          />
          <MetricBadge
            label="Accuracy"
            value={`${(accuracy * 100).toFixed(1)}%`}
            colorClass="border-teal-200 dark:border-teal-900/50"
            icon={
              <NeuralIcon animType="pulse" isAnimating={isRunning && !isPaused}>
                <Target size={14} className="text-teal-600 dark:text-teal-400" />
              </NeuralIcon>
            }
            ariaLabel={`Current accuracy: ${(accuracy * 100).toFixed(1)} percent`}
          />
        </div>

        {/* ── Mini loss chart ── */}
        <div className="flex-shrink-0 w-[148px] hidden md:block">
          <div className="text-[9.5px] text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1 font-medium">
            <NeuralIcon animType="flow" isAnimating={isRunning && !isPaused}>
              <Activity size={10} />
            </NeuralIcon>
            Loss curve
          </div>
          {history.length > 2 ? (
            <ResponsiveContainer width="100%" height={44}>
              <LineChart data={history} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line type="monotone" dataKey="loss"     stroke="#EF4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="accuracy" stroke="#0D9488" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Tooltip
                  contentStyle={{
                    fontSize: 10, padding: '3px 8px',
                    borderRadius: 8, border: '1px solid #E2E8F0',
                    background: 'rgba(255,255,255,0.96)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  formatter={(v: number, name: string) => [
                    name === 'loss' ? v.toFixed(4) : `${(v*100).toFixed(1)}%`,
                    name === 'loss' ? 'Loss' : 'Acc',
                  ]}
                  labelFormatter={() => ''}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-11 flex items-center justify-center text-[9.5px] text-slate-300 dark:text-slate-600 italic">
              Train to see curve
            </div>
          )}
        </div>

        <Divider />

        {/* ── Model stats ── */}
        <div className="flex-shrink-0 space-y-1 hidden sm:block">
          <div className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
            Model
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-bold text-blue-700 dark:text-blue-400 tabular-nums">{nodeCount}</span>
              <span className="text-slate-400 dark:text-slate-500"> layers</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{connectionCount}</span>
              <span className="text-slate-400 dark:text-slate-500"> conns</span>
            </div>
          </div>
          {isComplete && (
            <div className="flex items-center gap-1 text-[9.5px] text-teal-600 dark:text-teal-400">
              <NeuralIcon animType="spark" isAnimating>
                <Zap size={9} />
              </NeuralIcon>
              <span>Training complete!</span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" aria-hidden="true" />

        {/* ── Status pill ── */}
        <div
          role="status"
          aria-live="polite"
          aria-label={`Status: ${statusText}`}
          className="flex items-center gap-2 flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} aria-hidden="true" />
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">{statusText}</span>
        </div>
      </div>
    </div>
  );
});