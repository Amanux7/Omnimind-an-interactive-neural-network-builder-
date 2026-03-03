export type NodeType =
  | 'input'
  | 'dense'
  | 'activation'
  | 'dropout'
  | 'output'
  | 'conv2d'
  | 'flatten'
  | 'lstm'
  | 'batchnorm'
  | 'embedding';

export interface NodeConfig {
  neurons?: number;
  activationFn?: string;
  dropoutRate?: number;
  filters?: number;
  kernelSize?: number;
  inputShape?: string;
  outputShape?: string;
  units?: number;
  vocabSize?: number;
  embedDim?: number;
  poolSize?: number;
}

export const NODE_DIMS: Record<NodeType, { w: number; h: number }> = {
  input:     { w: 160, h: 80 },
  dense:     { w: 160, h: 80 },
  activation:{ w: 140, h: 60 },
  dropout:   { w: 140, h: 60 },
  output:    { w: 160, h: 80 },
  conv2d:    { w: 160, h: 80 },
  flatten:   { w: 140, h: 60 },
  lstm:      { w: 160, h: 80 },
  batchnorm: { w: 140, h: 60 },
  embedding: { w: 160, h: 80 },
};

export const NODE_STYLE: Record<NodeType, {
  bg: string; border: string; text: string; accent: string; dot: string;
  glowColor: string; borderHex: string;
}> = {
  // ── Primary family: trust / computation ────────────────────────────────
  // #1E40AF deep blue → #3B82F6 lighter blue
  input:     { bg: 'bg-blue-50',   border: 'border-blue-700',   text: 'text-blue-950',
               accent: 'bg-blue-700',   dot: '#1E40AF', glowColor: 'rgba(30,64,175,0.40)',   borderHex: '#1D4ED8' },
  dense:     { bg: 'bg-blue-50',   border: 'border-blue-500',   text: 'text-blue-900',
               accent: 'bg-blue-500',   dot: '#3B82F6', glowColor: 'rgba(59,130,246,0.38)',   borderHex: '#3B82F6' },
  conv2d:    { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-900',
               accent: 'bg-indigo-600', dot: '#4F46E5', glowColor: 'rgba(79,70,229,0.35)',    borderHex: '#6366F1' },
  // ── Accent family: insight / non-linearity ─────────────────────────────
  // #F59E0B amber → glowing insights
  activation:{ bg: 'bg-amber-50',  border: 'border-amber-400',  text: 'text-amber-950',
               accent: 'bg-amber-500',  dot: '#F59E0B', glowColor: 'rgba(245,158,11,0.45)',   borderHex: '#F59E0B' },
  embedding: { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-900',
               accent: 'bg-amber-400',  dot: '#D97706', glowColor: 'rgba(217,119,6,0.40)',    borderHex: '#FCD34D' },
  // ── Secondary family: regularization / output ──────────────────────────
  // #0F766E teal → protective / result
  dropout:   { bg: 'bg-teal-50',   border: 'border-teal-600',   text: 'text-teal-950',
               accent: 'bg-teal-600',   dot: '#0F766E', glowColor: 'rgba(15,118,110,0.38)',   borderHex: '#0F766E' },
  output:    { bg: 'bg-teal-50',   border: 'border-teal-700',   text: 'text-teal-950',
               accent: 'bg-teal-700',   dot: '#0F766E', glowColor: 'rgba(15,118,110,0.45)',   borderHex: '#134E4A' },
  lstm:      { bg: 'bg-teal-50',   border: 'border-teal-400',   text: 'text-teal-900',
               accent: 'bg-teal-500',   dot: '#0D9488', glowColor: 'rgba(13,148,136,0.38)',   borderHex: '#14B8A6' },
  batchnorm: { bg: 'bg-emerald-50',border: 'border-emerald-500',text: 'text-emerald-900',
               accent: 'bg-emerald-600',dot: '#059669', glowColor: 'rgba(5,150,105,0.35)',    borderHex: '#10B981' },
  // ── Neutral: utility operations ────────────────────────────────────────
  flatten:   { bg: 'bg-slate-50',  border: 'border-slate-400',  text: 'text-slate-800',
               accent: 'bg-slate-500',  dot: '#475569', glowColor: 'rgba(71,85,105,0.30)',    borderHex: '#94A3B8' },
};

export interface NetworkNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  w?: number; // custom width (overrides NODE_DIMS default)
  h?: number; // custom height (overrides NODE_DIMS default)
  label: string;
  config: NodeConfig;
}

export interface NetworkConnection {
  id: string;
  fromId: string;
  toId: string;
  weight?: number;   // default 0.5 — signed [-2, 2]; visual encodes magnitude+sign
  active?: boolean;  // default true; false = user-disabled, always dashed + dimmed
}

export interface Particle {
  id: string;
  connectionId: string;
  progress: number;
  speed: number;
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  speed: number;
  history: Array<{ epoch: number; loss: number; accuracy: number }>;
}

export interface ComponentTemplate {
  type: NodeType;
  label: string;
  description: string;
  defaultConfig: NodeConfig;
  category: 'Layers' | 'Activations' | 'Regularization' | 'Sequence';
}

export const COMPONENT_LIBRARY: ComponentTemplate[] = [
  { type: 'input',      label: 'Input Layer',  description: 'Network entry point',        defaultConfig: { inputShape: '784' },              category: 'Layers' },
  { type: 'dense',      label: 'Dense Layer',  description: 'Fully connected layer',       defaultConfig: { neurons: 128 },                   category: 'Layers' },
  { type: 'conv2d',     label: 'Conv2D',       description: '2D convolution layer',        defaultConfig: { filters: 32, kernelSize: 3 },     category: 'Layers' },
  { type: 'output',     label: 'Output Layer', description: 'Final prediction layer',      defaultConfig: { outputShape: '10' },               category: 'Layers' },
  { type: 'flatten',    label: 'Flatten',      description: 'Flatten to 1D tensor',        defaultConfig: {},                                  category: 'Layers' },
  { type: 'activation', label: 'ReLU',         description: 'Rectified linear unit',       defaultConfig: { activationFn: 'ReLU' },            category: 'Activations' },
  { type: 'activation', label: 'Sigmoid',      description: 'Sigmoid activation fn',       defaultConfig: { activationFn: 'Sigmoid' },         category: 'Activations' },
  { type: 'activation', label: 'Tanh',         description: 'Hyperbolic tangent fn',       defaultConfig: { activationFn: 'Tanh' },            category: 'Activations' },
  { type: 'activation', label: 'Softmax',      description: 'Probability distribution',    defaultConfig: { activationFn: 'Softmax' },         category: 'Activations' },
  { type: 'dropout',    label: 'Dropout',      description: 'Regularization via dropout',  defaultConfig: { dropoutRate: 0.5 },                category: 'Regularization' },
  { type: 'batchnorm',  label: 'Batch Norm',   description: 'Normalize activations',       defaultConfig: {},                                  category: 'Regularization' },
  { type: 'lstm',       label: 'LSTM',         description: 'Long short-term memory',      defaultConfig: { units: 64 },                       category: 'Sequence' },
  { type: 'embedding',  label: 'Embedding',    description: 'Learns word representations', defaultConfig: { vocabSize: 10000, embedDim: 64 }, category: 'Sequence' },
];