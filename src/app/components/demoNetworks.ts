/**
 * Omnimind — Pre-loaded Demo Networks
 * Three realistic starter architectures with full metadata.
 */
import type { NetworkNode, NetworkConnection } from './types';

export interface DemoNetwork {
  id: 'xor' | 'digit' | 'regression';
  name: string;
  tagline: string;
  description: string;
  task: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  accentColor: string;
  bgFrom: string;
  bgTo: string;
  emoji: string;
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  // Topology summary for the mini-preview
  topology: { label: string; count: number; color: string }[];
}

export const DEMO_NETWORKS: DemoNetwork[] = [
  // ── 1. XOR Classifier ────────────────────────────────────────────────────────
  {
    id: 'xor',
    name: 'XOR Classifier',
    tagline: 'Classic non-linear boundary',
    description:
      'Solves the XOR problem — a famous challenge that a single-layer perceptron cannot separate without a hidden layer.',
    task: 'Binary Classification',
    difficulty: 'Beginner',
    tags: ['Dense', 'Sigmoid', '2-layer'],
    accentColor: '#1E40AF',
    bgFrom: '#EFF6FF',
    bgTo: '#DBEAFE',
    emoji: '⊕',
    nodes: [
      { id: 'xor_in',  type: 'input',      x: 80,  y: 220, label: 'Input (2)',   config: { inputShape: '2' } },
      { id: 'xor_h1',  type: 'dense',      x: 360, y: 180, label: 'Hidden (2)', config: { neurons: 2 } },
      { id: 'xor_a1',  type: 'activation', x: 600, y: 190, label: 'Sigmoid',    config: { activationFn: 'Sigmoid' } },
      { id: 'xor_out', type: 'output',     x: 860, y: 220, label: 'Output (1)', config: { outputShape: '1' } },
    ],
    connections: [
      { id: 'xor_c1', fromId: 'xor_in',  toId: 'xor_h1',  weight: 0.65, active: true },
      { id: 'xor_c2', fromId: 'xor_h1',  toId: 'xor_a1',  weight: 0.42, active: true },
      { id: 'xor_c3', fromId: 'xor_a1',  toId: 'xor_out', weight: 0.78, active: true },
    ],
    topology: [
      { label: 'In',   count: 2, color: '#1E40AF' },
      { label: 'H',    count: 2, color: '#3B82F6' },
      { label: 'Out',  count: 1, color: '#0F766E' },
    ],
  },

  // ── 2. Digit Classifier ──────────────────────────────────────────────────────
  {
    id: 'digit',
    name: 'Digit Classifier',
    tagline: 'MNIST-style recognition',
    description:
      'Recognises handwritten digits from flattened 8×8 pixel images. Uses Dense layers, Dropout regularisation, and Softmax output.',
    task: 'Multi-class Classification',
    difficulty: 'Intermediate',
    tags: ['Dense', 'Dropout', 'Softmax', '10-class'],
    accentColor: '#D97706',
    bgFrom: '#FFFBEB',
    bgTo: '#FEF3C7',
    emoji: '✏️',
    nodes: [
      { id: 'dig_in',  type: 'input',      x: 80,   y: 220, label: 'Input (64)',   config: { inputShape: '64' } },
      { id: 'dig_d1',  type: 'dense',      x: 340,  y: 220, label: 'Dense 32',     config: { neurons: 32 } },
      { id: 'dig_a1',  type: 'activation', x: 580,  y: 230, label: 'ReLU',         config: { activationFn: 'ReLU' } },
      { id: 'dig_dr',  type: 'dropout',    x: 800,  y: 230, label: 'Dropout 0.3',  config: { dropoutRate: 0.3 } },
      { id: 'dig_d2',  type: 'dense',      x: 1040, y: 220, label: 'Dense 16',     config: { neurons: 16 } },
      { id: 'dig_a2',  type: 'activation', x: 1280, y: 230, label: 'Softmax',      config: { activationFn: 'Softmax' } },
      { id: 'dig_out', type: 'output',     x: 1520, y: 220, label: 'Output (10)',  config: { outputShape: '10' } },
    ],
    connections: [
      { id: 'dig_c1', fromId: 'dig_in',  toId: 'dig_d1', weight: 0.50, active: true },
      { id: 'dig_c2', fromId: 'dig_d1',  toId: 'dig_a1', weight: 0.50, active: true },
      { id: 'dig_c3', fromId: 'dig_a1',  toId: 'dig_dr', weight: 0.50, active: true },
      { id: 'dig_c4', fromId: 'dig_dr',  toId: 'dig_d2', weight: 0.50, active: true },
      { id: 'dig_c5', fromId: 'dig_d2',  toId: 'dig_a2', weight: 0.50, active: true },
      { id: 'dig_c6', fromId: 'dig_a2',  toId: 'dig_out',weight: 0.50, active: true },
    ],
    topology: [
      { label: 'In',    count: 64, color: '#1E40AF' },
      { label: 'D32',   count: 32, color: '#3B82F6' },
      { label: 'Drop',  count: 0,  color: '#0F766E' },
      { label: 'D16',   count: 16, color: '#3B82F6' },
      { label: 'Out',   count: 10, color: '#0F766E' },
    ],
  },

  // ── 3. Regression Predictor ──────────────────────────────────────────────────
  {
    id: 'regression',
    name: 'Regression Predictor',
    tagline: 'Continuous function fitting',
    description:
      'Learns to map a single continuous input to a continuous output via three hidden layers with ReLU and Tanh activations.',
    task: 'Regression',
    difficulty: 'Beginner',
    tags: ['Dense', 'ReLU', 'Tanh', '1D'],
    accentColor: '#0F766E',
    bgFrom: '#F0FDF4',
    bgTo: '#DCFCE7',
    emoji: '📈',
    nodes: [
      { id: 'reg_in',  type: 'input',      x: 80,   y: 220, label: 'Input (1)',  config: { inputShape: '1' } },
      { id: 'reg_d1',  type: 'dense',      x: 340,  y: 180, label: 'Dense 8',   config: { neurons: 8 } },
      { id: 'reg_a1',  type: 'activation', x: 580,  y: 190, label: 'ReLU',      config: { activationFn: 'ReLU' } },
      { id: 'reg_d2',  type: 'dense',      x: 800,  y: 180, label: 'Dense 4',   config: { neurons: 4 } },
      { id: 'reg_a2',  type: 'activation', x: 1040, y: 190, label: 'Tanh',      config: { activationFn: 'Tanh' } },
      { id: 'reg_d3',  type: 'dense',      x: 1260, y: 180, label: 'Dense 2',   config: { neurons: 2 } },
      { id: 'reg_out', type: 'output',     x: 1500, y: 220, label: 'Output (1)',config: { outputShape: '1' } },
    ],
    connections: [
      { id: 'reg_c1', fromId: 'reg_in',  toId: 'reg_d1',  weight: 0.70, active: true },
      { id: 'reg_c2', fromId: 'reg_d1',  toId: 'reg_a1',  weight: 0.55, active: true },
      { id: 'reg_c3', fromId: 'reg_a1',  toId: 'reg_d2',  weight: 0.62, active: true },
      { id: 'reg_c4', fromId: 'reg_d2',  toId: 'reg_a2',  weight: 0.48, active: true },
      { id: 'reg_c5', fromId: 'reg_a2',  toId: 'reg_d3',  weight: 0.73, active: true },
      { id: 'reg_c6', fromId: 'reg_d3',  toId: 'reg_out', weight: 0.51, active: true },
    ],
    topology: [
      { label: 'In',  count: 1, color: '#1E40AF' },
      { label: 'H8',  count: 8, color: '#3B82F6' },
      { label: 'H4',  count: 4, color: '#3B82F6' },
      { label: 'H2',  count: 2, color: '#3B82F6' },
      { label: 'Out', count: 1, color: '#0F766E' },
    ],
  },
];
