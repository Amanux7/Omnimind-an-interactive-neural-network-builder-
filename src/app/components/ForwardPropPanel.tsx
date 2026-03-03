import React, { useState, useMemo } from 'react';
import {
  Zap, Play, SkipForward, RotateCcw, X, AlertCircle,
  AlertTriangle, ChevronDown, ChevronUp, Layers,
} from 'lucide-react';
import { NetworkNode, NetworkConnection } from './types';
import { ForwardPassResult, InputPreset, getInputPreset } from './forwardProp';

// ── Helpers ───────────────────────────────────────────────────────────────────
function activationColor(v: number): string {
  if (v >= 0.75) return '#1D4ED8';
  if (v >= 0.5)  return '#3B82F6';
  if (v >= 0.25) return '#93C5FD';
  return '#94A3B8';
}

function activationBg(v: number): string {
  if (v >= 0.75) return 'bg-blue-700';
  if (v >= 0.5)  return 'bg-blue-500';
  if (v >= 0.25) return 'bg-blue-300';
  return 'bg-slate-400';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ActivationBar({
  label, value, highlight, subLabel,
}: { label: string; value: number; highlight?: boolean; subLabel?: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className={`rounded-lg px-3 py-2 transition-all duration-300 ${highlight ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-slate-600 truncate flex-1">{label}</span>
        {subLabel && <span className="text-[9px] text-slate-400 ml-1">{subLabel}</span>}
        <span className="text-[11px] font-mono font-bold ml-2" style={{ color: activationColor(value) }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${activationColor(value)}99, ${activationColor(value)})` }}
        />
      </div>
    </div>
  );
}

// ── Panel props ───────────────────────────────────────────────────────────────
export interface FwdPropState {
  isRunning: boolean;
  isComplete: boolean;
  currentLayerIdx: number;
  totalLayers: number;
  result: ForwardPassResult | null;
  waveNodeIds: string[];
  doneNodeIds: string[];
  waveConnIds: string[];
  doneConnIds: string[];
  error: string | null;
  warning: string | null;
}

interface ForwardPropPanelProps {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  isOpen: boolean;
  onClose: () => void;
  propState: FwdPropState | null;
  onRunForwardPass: (inputs: number[]) => void;
  onStepForwardPass: () => void;
  onResetForwardPass: () => void;
  speed: number;
  onSpeedChange: (ms: number) => void;
  inputValues: number[];
  onInputChange: (values: number[]) => void;
}

export function ForwardPropPanel({
  nodes, connections, isOpen, onClose,
  propState, onRunForwardPass, onStepForwardPass, onResetForwardPass,
  speed, onSpeedChange, inputValues, onInputChange,
}: ForwardPropPanelProps) {
  const [showInputs, setShowInputs] = useState(true);
  const [showOutputs, setShowOutputs] = useState(true);

  const inputNodes  = useMemo(() => nodes.filter(n => n.type === 'input'), [nodes]);
  const outputNodes = useMemo(() => nodes.filter(n => n.type === 'output'), [nodes]);
  const inputDim    = inputNodes.length;

  // Ensure inputValues has enough entries
  const safeInputs: number[] = Array(Math.max(1, inputDim))
    .fill(0.5)
    .map((_, i) => inputValues[i] ?? 0.5);

  const applyPreset = (preset: InputPreset) => {
    const vals = getInputPreset(preset, Math.max(1, inputDim));
    onInputChange(vals);
  };

  const presets: { label: string; preset: InputPreset; color: string }[] = [
    { label: '[0,0]', preset: 'xor-00', color: 'text-slate-600' },
    { label: '[0,1]', preset: 'xor-01', color: 'text-blue-600'  },
    { label: '[1,0]', preset: 'xor-10', color: 'text-indigo-600'},
    { label: '[1,1]', preset: 'xor-11', color: 'text-violet-600'},
    { label: 'Rand',  preset: 'random',     color: 'text-teal-600'  },
    { label: '0.5s',  preset: 'half',       color: 'text-orange-600'},
    { label: '↑',     preset: 'ascending',  color: 'text-pink-600'  },
  ];

  const isRunning = propState?.isRunning ?? false;
  const isComplete = propState?.isComplete ?? false;
  const hasResult  = !!propState?.result;

  // Progress
  const progressPct = propState && propState.totalLayers > 0
    ? Math.round((propState.currentLayerIdx + 1) / propState.totalLayers * 100)
    : 0;

  // Best output
  const outputVals = propState?.result?.outputValues ?? [];
  const outputIds  = propState?.result?.outputNodeIds ?? [];
  const bestIdx    = outputVals.indexOf(Math.max(...outputVals, 0));
  const bestOutputNode = outputIds[bestIdx] ? nodes.find(n => n.id === outputIds[bestIdx]) : null;

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-3 right-3 z-50 w-80 max-h-[calc(100vh-180px)] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 20px 60px rgba(59,130,246,0.12), 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-white">Forward Propagation</div>
          <div className="text-[10px] text-blue-100">Mock inference visualiser</div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white/80 hover:text-white transition-all"
        >
          <X size={12} />
        </button>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Error */}
        {propState?.error && (
          <div className="mx-3 mt-3 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-semibold text-red-700 mb-0.5">Network Error</div>
              <div className="text-[11px] text-red-600">{propState.error}</div>
            </div>
          </div>
        )}

        {/* Warning */}
        {propState?.warning && !propState.error && (
          <div className="mx-3 mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-700">{propState.warning}</div>
          </div>
        )}

        {/* ── Input Sample ────────────────────────────────────────────────── */}
        <div className="px-4 pt-3">
          <button
            className="flex items-center justify-between w-full mb-2"
            onClick={() => setShowInputs(v => !v)}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <Layers size={11} className="text-blue-500" /> Input Sample
              <span className="font-normal text-slate-400 normal-case ml-1">
                ({inputDim} input{inputDim !== 1 ? 's' : ''})
              </span>
            </div>
            {showInputs ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
          </button>

          {showInputs && (
            <>
              {/* Presets */}
              <div className="flex flex-wrap gap-1 mb-3">
                {presets.map(({ label, preset, color }) => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-lg bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Input sliders (max 6 shown) */}
              <div className="space-y-2">
                {safeInputs.slice(0, 6).map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 w-5 text-right">x{i + 1}</span>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={val}
                      onChange={e => {
                        const next = [...safeInputs];
                        next[i] = parseFloat(e.target.value);
                        onInputChange(next);
                      }}
                      className="flex-1 h-2 appearance-none rounded-full outline-none cursor-pointer"
                      style={{ accentColor: activationColor(val) }}
                    />
                    <span
                      className="text-[10px] font-mono font-bold w-8 text-right"
                      style={{ color: activationColor(val) }}
                    >
                      {val.toFixed(2)}
                    </span>
                  </div>
                ))}
                {safeInputs.length > 6 && (
                  <div className="text-[10px] text-slate-400 text-center py-1">
                    +{safeInputs.length - 6} more inputs (preset controlled)
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Speed ───────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Animation Speed</span>
            <span className="text-[11px] font-mono text-blue-600 font-bold">{speed} ms/layer</span>
          </div>
          <input
            type="range" min={100} max={2000} step={100}
            value={speed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#3B82F6' }}
          />
          <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
            <span>Fast (100ms)</span>
            <span>Slow (2s)</span>
          </div>
        </div>

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => onRunForwardPass(safeInputs)}
              disabled={isRunning}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-[12px] font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow:'0 2px 8px rgba(245,158,11,0.35)' }}
            >
              {isRunning ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play size={12} className="fill-white" />
                  {isComplete ? 'Run Again' : 'Run Forward Pass'}
                </>
              )}
            </button>
            <button
              onClick={onStepForwardPass}
              disabled={isRunning || (isComplete && !hasResult)}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Step one layer"
            >
              <SkipForward size={14} />
            </button>
            <button
              onClick={onResetForwardPass}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* ── Progress ────────────────────────────────────────────────────── */}
        {(isRunning || isComplete || propState?.currentLayerIdx !== undefined) && propState && propState.totalLayers > 0 && (
          <div className="px-4 pb-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  {isComplete ? '✓ Complete' : isRunning ? '⚡ Propagating…' : 'Ready'}
                </span>
                <span className="text-[11px] font-mono text-blue-600">
                  Layer {Math.min(propState.currentLayerIdx + 1, propState.totalLayers)} / {propState.totalLayers}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-teal-500' : 'bg-blue-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {/* Layer breadcrumb */}
              {propState.result && (
                <div className="flex items-center flex-wrap gap-0.5">
                  {propState.result.layers.map((ids, li) => {
                    const lNode = nodes.find(n => n.id === ids[0]);
                    const isDone = li <= propState.currentLayerIdx;
                    const isCurrent = li === propState.currentLayerIdx;
                    return (
                      <React.Fragment key={li}>
                        {li > 0 && <span className="text-slate-300 text-[9px]">→</span>}
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-all ${
                            isCurrent ? 'bg-blue-100 text-blue-700' :
                            isDone    ? 'bg-slate-100 text-slate-500' :
                                        'text-slate-300'
                          }`}
                        >
                          {lNode?.label?.slice(0, 8) ?? `L${li}`}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Output Predictions ──────────────────────────────────────────── */}
        {hasResult && propState?.result && (
          <div className="px-4 pb-4">
            <button
              className="flex items-center justify-between w-full mb-2"
              onClick={() => setShowOutputs(v => !v)}
            >
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isComplete ? 'bg-teal-400' : 'bg-blue-400 animate-pulse'}`} />
                Output Predictions
              </div>
              {showOutputs ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
            </button>

            {showOutputs && (
              <div className="space-y-2">
                {outputVals.map((v, i) => {
                  const outNode = nodes.find(n => n.id === outputIds[i]);
                  const isTop   = i === bestIdx;
                  return (
                    <ActivationBar
                      key={i}
                      label={outNode?.label ?? `Output ${i}`}
                      value={v}
                      highlight={isTop}
                      subLabel={isTop ? '← top' : undefined}
                    />
                  );
                })}

                {/* Summary */}
                {isComplete && outputVals.length > 0 && (
                  <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px]">🎯</span>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-blue-800">
                          Predicted: {bestOutputNode?.label ?? `Class ${bestIdx}`}
                        </div>
                        <div className="text-[10px] text-blue-600 mt-0.5">
                          Confidence: {(outputVals[bestIdx] * 100).toFixed(1)}%
                          {outputVals.length > 1 && (
                            <span className="ml-1.5 text-blue-400">
                              (softmax across {outputVals.length} classes)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-node activations (non-output nodes that are done) */}
                {propState.result.layers.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Hidden layer activations
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {nodes
                        .filter(n => n.type !== 'input' && n.type !== 'output')
                        .filter(n => propState.result!.nodeActivations[n.id] !== undefined)
                        .map(n => {
                          const a = propState.result!.nodeActivations[n.id];
                          return (
                            <div key={n.id} className="flex items-center gap-2 group">
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: activationColor(a) }}
                              />
                              <span className="text-[10px] text-slate-500 truncate flex-1">{n.label}</span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${a * 100}%`, background: activationColor(a) }} />
                              </div>
                              <span className="text-[9px] font-mono w-8 text-right"
                                style={{ color: activationColor(a) }}>
                                {a.toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasResult && !propState?.error && (
          <div className="px-4 pb-4 text-center">
            <div className="text-4xl mb-2 mt-2 opacity-30">⚡</div>
            <div className="text-[12px] text-slate-400">
              Set your inputs above, then click <strong>Run Forward Pass</strong> to see data flow through your network.
            </div>
            {nodes.length > 0 && (
              <div className="mt-2 text-[11px] text-slate-400">
                {nodes.filter(n => n.type === 'input').length} input{' '}
                → {nodes.filter(n => n.type !== 'input' && n.type !== 'output').length} hidden{' '}
                → {nodes.filter(n => n.type === 'output').length} output layers
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
        <div className="text-[9px] text-slate-400 text-center">
          output = sigmoid(Σ(activation × weight)) • blue = active (≥0.5)
        </div>
      </div>
    </div>
  );
}
