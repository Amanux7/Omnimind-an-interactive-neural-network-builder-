import React, { useState, useMemo } from 'react';
import {
  GraduationCap, Play, Square, RotateCcw, X,
  AlertCircle, AlertTriangle, ChevronDown, ChevronUp,
  Database, Settings2, TrendingDown, CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { NetworkNode, NetworkConnection } from './types';
import { DataPoint, PRESET_DATASETS, parseDataset } from './training';

// ── Training state passed from parent ────────────────────────────────────────
export interface TrainAnimState {
  isRunning: boolean;
  isComplete: boolean;
  currentEpoch: number;
  totalEpochs: number;
  history: Array<{ epoch: number; loss: number; accuracy: number }>;
  currentLoss: number;
  currentAccuracy: number;
  phase: 'idle' | 'forward' | 'backprop' | 'update';
  trainActiveConnIds?: string[];
  weightDeltas: Record<string, number>;
  error: string | null;
  warning: string | null;
}

// ── Speed options ─────────────────────────────────────────────────────────────
export const TRAIN_SPEEDS = [
  { label: 'Instant', value: 0,    desc: 'No animation' },
  { label: '2×',      value: 200,  desc: '200ms/epoch' },
  { label: '1×',      value: 450,  desc: '450ms/epoch' },
  { label: '0.5×',    value: 900,  desc: '900ms/epoch' },
];

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number; name: string; color: string}[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 shadow-lg text-[10px]">
      <div className="font-semibold text-slate-600 mb-1">Epoch {label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500 capitalize">{p.name}:</span>
          <span className="font-mono font-bold" style={{ color: p.color }}>
            {p.name === 'accuracy' ? `${(p.value * 100).toFixed(1)}%` : p.value.toFixed(4)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Phase pill ────────────────────────────────────────────────────────────────
function PhasePill({ phase }: { phase: TrainAnimState['phase'] }) {
  const config = {
    idle:     { label: 'Idle',     color: 'bg-slate-100 text-slate-500' },
    forward:  { label: '→ Forward', color: 'bg-blue-100 text-blue-700 animate-pulse' },
    backprop: { label: '← Backprop', color: 'bg-orange-100 text-orange-700 animate-pulse' },
    update:   { label: '⚡ Updating weights', color: 'bg-green-100 text-green-700 animate-pulse' },
  }[phase];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface TrainingPanelProps {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  isOpen: boolean;
  onClose: () => void;
  trainState: TrainAnimState | null;
  onTrain: (data: DataPoint[], epochs: number, lr: number, speed: number) => void;
  onStop: () => void;
  onReset: () => void;
  onAutoAddDropout: () => void;
}

export function TrainingPanel({
  nodes, connections, isOpen, onClose,
  trainState, onTrain, onStop, onReset, onAutoAddDropout,
}: TrainingPanelProps) {
  // ── Local config state ──────────────────────────────────────────────────
  const [selectedPreset, setSelectedPreset] = useState<string>('xor');
  const [datasetText, setDatasetText] = useState(PRESET_DATASETS.xor.text);
  const [epochs, setEpochs] = useState(10);
  const [lr, setLr] = useState(0.3);
  const [speedValue, setSpeedValue] = useState(450);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDeltas, setShowDeltas] = useState(true);

  const inputNodes  = useMemo(() => nodes.filter(n => n.type === 'input'), [nodes]);
  const inputDim    = inputNodes.length || undefined;

  // Parse dataset to get stats
  const parsed = useMemo(
    () => parseDataset(datasetText, inputDim),
    [datasetText, inputDim],
  );

  const isRunning   = trainState?.isRunning ?? false;
  const isComplete  = trainState?.isComplete ?? false;
  const progress    = trainState
    ? (trainState.currentEpoch / trainState.totalEpochs) * 100
    : 0;

  // Top weight-delta connections for display
  const topDeltas = useMemo(() => {
    if (!trainState?.weightDeltas) return [];
    return Object.entries(trainState.weightDeltas)
      .filter(([, d]) => Math.abs(d) > 0.0005)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 6)
      .map(([id, delta]) => ({
        id,
        delta,
        conn: connections.find(c => c.id === id),
        newWeight: trainState.weightDeltas
          ? (connections.find(c => c.id === id)?.weight ?? 0.5) + delta
          : 0,
      }));
  }, [trainState?.weightDeltas, connections]);

  const handlePreset = (key: string) => {
    setSelectedPreset(key);
    setDatasetText(PRESET_DATASETS[key].text);
  };

  const handleTrain = () => {
    if (parsed.error || !parsed.data.length) return;
    onTrain(parsed.data, epochs, lr, speedValue);
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-3 left-3 z-50 w-[340px] max-h-[calc(100vh-180px)] flex flex-col rounded-2xl bg-white border border-slate-200 overflow-hidden"
      style={{ boxShadow: '0 20px 60px rgba(16,185,129,0.10), 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-600 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          <GraduationCap size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-white">Training Mode</div>
          <div className="text-[10px] text-emerald-100">Mock gradient descent · updates weights</div>
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

        {/* ── Error / Warning ─────────────────────────────────────────────── */}
        {trainState?.error && (
          <div className="mx-3 mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-600">{trainState.error}</p>
          </div>
        )}
        {trainState?.warning && !trainState.error && (
          <div className="mx-3 mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">{trainState.warning}</p>
          </div>
        )}

        {/* ── Dataset ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Database size={11} className="text-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Dataset</span>
            {parsed.data.length > 0 && !parsed.error && (
              <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                {parsed.data.length} samples
              </span>
            )}
          </div>

          {/* Preset chips */}
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(PRESET_DATASETS).map(([key, ds]) => (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                  selectedPreset === key
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                }`}
                title={ds.description}
              >
                {ds.label}
              </button>
            ))}
          </div>

          {/* Text input */}
          <textarea
            value={datasetText}
            onChange={e => { setDatasetText(e.target.value); setSelectedPreset(''); }}
            rows={3}
            spellCheck={false}
            className="w-full text-[11px] font-mono px-3 py-2 border rounded-xl resize-none focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-slate-50"
            style={{
              borderColor: parsed.error ? '#FCA5A5' : parsed.data.length ? '#6EE7B7' : '#E2E8F0',
            }}
            placeholder={'[[0,0,0],[0,1,1],[1,0,1],[1,1,0]]'}
          />
          {parsed.error ? (
            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle size={9} /> {parsed.error}
            </p>
          ) : parsed.data.length > 0 ? (
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 size={9} />
              {parsed.data.length} samples · {parsed.data[0].inputs.length} inputs → {parsed.data[0].targets.length} targets
            </p>
          ) : null}
        </div>

        {/* ── Hyperparameters ──────────────────────────────────────────────── */}
        <div className="px-4 pt-4">
          <button
            className="flex items-center justify-between w-full mb-2"
            onClick={() => setShowAdvanced(v => !v)}
          >
            <div className="flex items-center gap-1.5">
              <Settings2 size={11} className="text-emerald-500" />
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Hyperparameters</span>
            </div>
            {showAdvanced ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
          </button>

          {/* Always-visible: Epochs + LR */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-medium text-slate-500">Epochs</label>
                <span className="text-[11px] font-mono font-bold text-emerald-600">{epochs}</span>
              </div>
              <input type="range" min={3} max={50} step={1} value={epochs}
                onChange={e => setEpochs(Number(e.target.value))}
                className="w-full" style={{ accentColor: '#10B981' }} />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>3</span><span>50</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-medium text-slate-500">Learning Rate</label>
                <span className="text-[11px] font-mono font-bold text-emerald-600">{lr.toFixed(2)}</span>
              </div>
              <input type="range" min={0.01} max={1.0} step={0.01} value={lr}
                onChange={e => setLr(Number(e.target.value))}
                className="w-full" style={{ accentColor: '#10B981' }} />
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>0.01 (conservative)</span><span>1.0 (aggressive)</span>
              </div>
            </div>
          </div>

          {/* Collapsible: Speed */}
          {showAdvanced && (
            <div className="mt-3">
              <label className="text-[10px] font-medium text-slate-500 block mb-1.5">Animation Speed</label>
              <div className="grid grid-cols-4 gap-1">
                {TRAIN_SPEEDS.map(s => (
                  <button key={s.value}
                    onClick={() => setSpeedValue(s.value)}
                    title={s.desc}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                      speedValue === s.value
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-1">
          <div className="flex gap-2">
            {isRunning ? (
              <button onClick={onStop}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[12px] font-semibold transition-all">
                <Square size={12} /> Stop Training
              </button>
            ) : (
              <button
                onClick={handleTrain}
                disabled={!!parsed.error || !parsed.data.length}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-[12px] font-semibold shadow-sm shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Play size={12} className="fill-white" />
                {isComplete ? 'Train Again' : 'Train Model'}
              </button>
            )}
            <button onClick={onReset}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-all"
              title="Reset training">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* ── Progress ────────────────────────────────────────────────────── */}
        {trainState && (trainState.isRunning || trainState.isComplete || trainState.currentEpoch > 0) && (
          <div className="px-4 pt-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {isComplete ? '✓ Training Complete' : 'Training…'}
                  </span>
                  <PhasePill phase={trainState.phase} />
                </div>
                <span className="text-[11px] font-mono text-emerald-600">
                  {trainState.currentEpoch} / {trainState.totalEpochs}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-teal-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Live metrics */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Loss', value: trainState.currentLoss.toFixed(4), color: '#EF4444', icon: <TrendingDown size={10} />, better: 'lower' },
                  { label: 'Accuracy', value: `${(trainState.currentAccuracy * 100).toFixed(1)}%`, color: '#10B981', icon: <CheckCircle2 size={10} />, better: 'higher' },
                ].map(m => (
                  <div key={m.label} className="bg-white rounded-lg px-2.5 py-2 border border-slate-100">
                    <div className="flex items-center gap-1 mb-0.5" style={{ color: m.color }}>
                      {m.icon}
                      <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">{m.label}</span>
                    </div>
                    <div className="text-[14px] font-bold font-mono" style={{ color: m.color }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Loss / Accuracy Chart ────────────────────────────────────────── */}
        {(trainState?.history?.length ?? 0) > 1 && (
          <div className="px-4 pt-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Training Curves
            </p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={trainState!.history} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="epoch" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" domain={[0, 0.8]} tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={32} />
                  <YAxis yAxisId="right" orientation="right" domain={[0.4, 1]} tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine yAxisId="left" y={0.1} stroke="#10B98133" strokeDasharray="3 3" />
                  <Line yAxisId="left" type="monotone" dataKey="loss" stroke="#EF4444" strokeWidth={2} dot={false} name="loss" isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} dot={false} name="accuracy" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-red-400 rounded" />
                  <span className="text-[9px] text-slate-400">Loss (↓)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-emerald-400 rounded" />
                  <span className="text-[9px] text-slate-400">Accuracy (↑)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Weight deltas ────────────────────────────────────────────────── */}
        {topDeltas.length > 0 && (
          <div className="px-4 pt-3 pb-4">
            <button
              className="flex items-center justify-between w-full mb-2"
              onClick={() => setShowDeltas(v => !v)}
            >
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <ArrowLeft size={9} className="text-orange-400" />
                Weight Updates (last epoch)
              </span>
              {showDeltas ? <ChevronUp size={11} className="text-slate-400" /> : <ChevronDown size={11} className="text-slate-400" />}
            </button>

            {showDeltas && (
              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                {topDeltas.map(({ id, delta, conn }, i) => {
                  const fromNode = nodes.find(n => n.id === conn?.fromId);
                  const toNode   = nodes.find(n => n.id === conn?.toId);
                  const isPos    = delta > 0;
                  return (
                    <div key={id}
                      className={`flex items-center gap-2 px-3 py-2 text-[10px] ${i > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="w-1.5 h-5 rounded-full flex-shrink-0"
                        style={{ background: isPos ? '#10B981' : '#EF4444' }} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-slate-600 font-medium">
                          {fromNode?.label?.slice(0, 10) ?? '?'} → {toNode?.label?.slice(0, 10) ?? '?'}
                        </div>
                        <div className="text-slate-400 font-mono text-[9px]">
                          {(conn?.weight ?? 0.5).toFixed(3)} → {((conn?.weight ?? 0.5) + delta).toFixed(3)}
                        </div>
                      </div>
                      <span className={`font-mono font-bold flex-shrink-0 ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isPos ? '+' : ''}{delta.toFixed(4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!trainState && (
          <div className="px-4 pb-5 text-center mt-2">
            <div className="text-4xl mb-2 opacity-25">🎓</div>
            <p className="text-[12px] text-slate-400">
              Select a dataset, set hyperparameters, then click <strong>Train Model</strong>.
              Weights update each epoch and are saved automatically.
            </p>
          </div>
        )}

        {/* Complete badge */}
        {isComplete && (
          <div className="mx-4 mb-4">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-emerald-700">Training complete!</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  Final loss: <strong>{trainState!.currentLoss.toFixed(4)}</strong> · Accuracy: <strong>{(trainState!.currentAccuracy * 100).toFixed(1)}%</strong>
                </p>
                <p className="text-[10px] text-emerald-500 mt-1">Weights saved · Run Forward Pass to test inference</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
        <div className="text-[9px] text-slate-400 text-center">
          Mock gradient descent: Δw ≈ −η·(output_error·input_activation) · weights persist to localStorage
        </div>
      </div>
    </div>
  );
}