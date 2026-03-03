/**
 * Omnimind – Forward Propagation Engine
 * Pure computation: no React, no side-effects.
 */
import { NetworkNode, NetworkConnection } from './types';

// ── Activation functions ──────────────────────────────────────────────────────
export const sigmoid   = (x: number) => 1 / (1 + Math.exp(-x));
export const relu      = (x: number) => Math.max(0, x);
export const leakyRelu = (x: number) => (x > 0 ? x : 0.01 * x);
export const tanhFn    = (x: number) => Math.tanh(x);
export const gelu      = (x: number) =>
  x * 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
export const swish     = (x: number) => x * sigmoid(x);

function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const e = arr.map(v => Math.exp(v - max));
  const s = e.reduce((a, b) => a + b, 1e-9);
  return e.map(v => v / s);
}

function applyActivationFn(x: number, fn: string): number {
  switch (fn) {
    case 'ReLU':      return relu(x);
    case 'Sigmoid':   return sigmoid(x);
    case 'Tanh':      return (tanhFn(x) + 1) / 2;  // mapped to [0,1]
    case 'Softmax':   return sigmoid(x);             // per-element approx
    case 'GELU':      return Math.max(0, Math.min(1, gelu(x)));
    case 'LeakyReLU': return Math.max(0, leakyRelu(x));
    case 'Swish':     return Math.max(0, Math.min(1, swish(x)));
    default:          return relu(x);
  }
}

// ── Topological sort → layers ─────────────────────────────────────────────────
/**
 * Returns an array of "layers", each containing node IDs whose inputs
 * are all fully resolved by previous layers. Useful for wave-front animation.
 */
export function topologicalLayers(
  nodes: NetworkNode[],
  connections: NetworkConnection[],
): string[][] {
  const ids   = new Set(nodes.map(n => n.id));
  const inDeg = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const adj   = new Map<string, string[]>(nodes.map(n => [n.id, []]));

  for (const c of connections) {
    if (!ids.has(c.fromId) || !ids.has(c.toId)) continue;
    inDeg.set(c.toId, inDeg.get(c.toId)! + 1);
    adj.get(c.fromId)!.push(c.toId);
  }

  const layers: string[][] = [];
  const visited = new Set<string>();
  let queue = nodes.filter(n => inDeg.get(n.id) === 0).map(n => n.id);

  while (queue.length > 0) {
    layers.push([...queue]);
    queue.forEach(id => visited.add(id));
    const next: string[] = [];
    for (const id of queue) {
      for (const to of adj.get(id)!) {
        if (visited.has(to)) continue;
        const d = inDeg.get(to)! - 1;
        inDeg.set(to, d);
        if (d === 0) next.push(to);
      }
    }
    queue = next;
  }
  return layers;
}

// ── Validation ────────────────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export function validateNetwork(
  nodes: NetworkNode[],
  connections: NetworkConnection[],
): ValidationResult {
  if (!nodes.length)
    return { valid: false, error: 'Canvas is empty — drag some layers from the sidebar first.' };

  const inputs  = nodes.filter(n => n.type === 'input');
  const outputs = nodes.filter(n => n.type === 'output');

  if (!inputs.length)
    return { valid: false, error: 'No Input Layer found. Add an Input Layer from the sidebar.' };
  if (!outputs.length)
    return { valid: false, error: 'No Output Layer found. Add an Output Layer from the sidebar.' };

  // BFS reachability (active connections only)
  const active = connections.filter(c => c.active !== false);
  const reachable = new Set(inputs.map(n => n.id));
  const queue = [...inputs.map(n => n.id)];
  while (queue.length) {
    const id = queue.shift()!;
    for (const c of active) {
      if (c.fromId === id && !reachable.has(c.toId)) {
        reachable.add(c.toId);
        queue.push(c.toId);
      }
    }
  }

  if (!outputs.some(n => reachable.has(n.id)))
    return {
      valid: false,
      error: 'Output Layer is unreachable. Connect layers by dragging from right ports (◉) to left ports (◉).',
    };

  const islands = nodes.filter(n => n.type !== 'input' && !reachable.has(n.id));
  return {
    valid: true,
    warning: islands.length
      ? `${islands.length} isolated layer${islands.length > 1 ? 's' : ''} will be skipped.`
      : undefined,
  };
}

// ── Forward pass ──────────────────────────────────────────────────────────────
export interface ForwardPassResult {
  /** Normalised [0, 1] activation per node */
  nodeActivations: Record<string, number>;
  /** Signed signal on each connection (fromAct × weight) */
  connectionSignals: Record<string, number>;
  /** Topological layers used for animation */
  layers: string[][];
  /** Final activation of each output node, post-softmax if >1 */
  outputValues: number[];
  /** IDs of output nodes, in layer order */
  outputNodeIds: string[];
}

export function computeForwardPass(
  nodes: NetworkNode[],
  connections: NetworkConnection[],
  inputValues: number[],
): ForwardPassResult {
  const act: Record<string, number> = {};
  const sig: Record<string, number> = {};

  const active = connections.filter(c => c.active !== false);
  const layers = topologicalLayers(nodes, active);

  // Assign input activations
  nodes
    .filter(n => n.type === 'input')
    .forEach((n, i) => { act[n.id] = Math.max(0, Math.min(1, inputValues[i] ?? 0.5)); });

  // Process every layer in order
  for (const ids of layers) {
    for (const nodeId of ids) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node || node.type === 'input') continue;

      const inc = active.filter(c => c.toId === nodeId);
      if (!inc.length) { act[nodeId] = 0; continue; }

      // Weighted sum
      let sum = 0;
      for (const c of inc) {
        const s = (act[c.fromId] ?? 0) * (c.weight ?? 0.5);
        sig[c.id] = s;
        sum += s;
      }

      // Layer-type transform → result in [0, 1]
      let out: number;
      switch (node.type) {
        case 'dense': {
          const scale = 128 / Math.max(8, node.config.neurons ?? 128);
          out = sigmoid(sum * scale + 0.1);
          break;
        }
        case 'activation':
          out = applyActivationFn(sum, node.config.activationFn ?? 'ReLU');
          break;
        case 'dropout':
          out = Math.max(0, Math.min(1, sigmoid(sum * (1 - (node.config.dropoutRate ?? 0.5)))));
          break;
        case 'conv2d':
          out = Math.min(1, relu(sum * 2));
          if (out < 0.02) out = sigmoid(sum * 3);
          break;
        case 'lstm':
          out = (tanhFn(sum) + 1) / 2;
          break;
        case 'batchnorm':
          out = sigmoid(sum * 3);
          break;
        case 'flatten':
        case 'embedding':
          out = sigmoid(sum);
          break;
        case 'output':
          out = sigmoid(sum);
          break;
        default:
          out = sigmoid(sum);
      }
      act[nodeId] = out;
    }
  }

  // Softmax across multiple output nodes (classification)
  const outputNodes = nodes.filter(n => n.type === 'output');
  let outputValues: number[];
  if (outputNodes.length > 1) {
    const logits = outputNodes.map(n => (act[n.id] ?? 0.5 - 0.5) * 6);
    const sm = softmax(logits);
    outputNodes.forEach((n, i) => { act[n.id] = sm[i]; });
    outputValues = sm;
  } else {
    outputValues = outputNodes.map(n => act[n.id] ?? 0);
  }

  return {
    nodeActivations: act,
    connectionSignals: sig,
    layers,
    outputValues,
    outputNodeIds: outputNodes.map(n => n.id),
  };
}

// ── Input presets ─────────────────────────────────────────────────────────────
export type InputPreset =
  | 'xor-00' | 'xor-01' | 'xor-10' | 'xor-11'
  | 'zeros' | 'ones' | 'half' | 'random' | 'ascending';

export function getInputPreset(preset: InputPreset, dim: number): number[] {
  const pad = (arr: number[]) => [
    ...arr.slice(0, dim),
    ...Array(Math.max(0, dim - arr.length)).fill(0),
  ];
  switch (preset) {
    case 'xor-00':    return pad([0, 0]);
    case 'xor-01':    return pad([0, 1]);
    case 'xor-10':    return pad([1, 0]);
    case 'xor-11':    return pad([1, 1]);
    case 'zeros':     return Array(dim).fill(0);
    case 'ones':      return Array(dim).fill(1);
    case 'half':      return Array(dim).fill(0.5);
    case 'ascending': return Array(dim).fill(0).map((_, i) => i / Math.max(1, dim - 1));
    case 'random':    return Array(dim).fill(0).map(() => Math.round(Math.random() * 100) / 100);
    default:          return Array(dim).fill(0.5);
  }
}
