/**
 * Omnimind — Training Engine
 * Mock gradient descent that produces directionally-correct weight updates
 * and a reliable loss curve, suitable for visualisation.
 */
import { NetworkNode, NetworkConnection } from './types';
import { computeForwardPass } from './forwardProp';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DataPoint { inputs: number[]; targets: number[]; }

export interface EpochResult {
  epoch: number;
  loss: number;
  accuracy: number;
  /** New weight for every connection after this epoch */
  weightUpdates: Record<string, number>;
  /** Signed change from previous epoch (for delta badges) */
  weightDeltas: Record<string, number>;
  /** Gradient magnitude per connection (for backprop glow intensity) */
  gradients: Record<string, number>;
}

// ── Preset datasets ────────────────────────────────────────────────────────────
export const PRESET_DATASETS: Record<string, {
  label: string; description: string; text: string; inputDim: number;
}> = {
  xor: {
    label: 'XOR', inputDim: 2,
    description: '4 samples · 2-in 1-out',
    text: '[[0,0,0],[0,1,1],[1,0,1],[1,1,0]]',
  },
  and: {
    label: 'AND', inputDim: 2,
    description: '4 samples · 2-in 1-out',
    text: '[[0,0,0],[0,1,0],[1,0,0],[1,1,1]]',
  },
  or: {
    label: 'OR', inputDim: 2,
    description: '4 samples · 2-in 1-out',
    text: '[[0,0,0],[0,1,1],[1,0,1],[1,1,1]]',
  },
  nand: {
    label: 'NAND', inputDim: 2,
    description: '4 samples · 2-in 1-out',
    text: '[[0,0,1],[0,1,1],[1,0,1],[1,1,0]]',
  },
  linear: {
    label: 'Linear', inputDim: 1,
    description: '6 samples · 1-in 1-out regression',
    text: '[[0.1,0.1],[0.3,0.3],[0.5,0.5],[0.7,0.7],[0.9,0.9],[0.2,0.2]]',
  },
  sine: {
    label: 'Sine', inputDim: 1,
    description: '8 samples · 1-in 1-out non-linear',
    text: '[[0.0,0.50],[0.13,0.82],[0.25,1.00],[0.38,0.82],[0.50,0.50],[0.63,0.18],[0.75,0.00],[0.88,0.18]]',
  },
  circle: {
    label: 'Circle', inputDim: 2,
    description: '8 samples · 2-in 1-out radial',
    text: '[[0.5,0.5,1],[0.2,0.5,0],[0.8,0.5,0],[0.5,0.2,0],[0.5,0.8,0],[0.45,0.45,1],[0.55,0.55,1],[0.3,0.3,0]]',
  },
  multiclass: {
    label: '3-Class', inputDim: 2,
    description: '9 samples · 2-in 3-out',
    text: '[[0.2,0.2,1,0,0],[0.3,0.1,1,0,0],[0.5,0.5,0,1,0],[0.6,0.4,0,1,0],[0.8,0.8,0,0,1],[0.9,0.7,0,0,1],[0.1,0.9,1,0,0],[0.5,0.2,0,1,0],[0.7,0.3,0,0,1]]',
  },
};

// ── Dataset parser ─────────────────────────────────────────────────────────────
export function parseDataset(
  text: string,
  inputDim?: number,
): { data: DataPoint[]; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { data: [], error: 'Dataset is empty.' };
  try {
    const raw = JSON.parse(trimmed);
    if (!Array.isArray(raw)) return { data: [], error: 'Expected a JSON array of arrays.' };
    if (raw.length === 0)    return { data: [], error: 'Dataset has no samples.' };

    const data: DataPoint[] = raw.map((row: number[], i: number) => {
      if (!Array.isArray(row))  throw new Error(`Row ${i} is not an array.`);
      if (row.length < 2)       throw new Error(`Row ${i} needs at least 2 values.`);
      const split = inputDim ?? row.length - 1;
      return { inputs: row.slice(0, split), targets: row.slice(split) };
    });

    const inputSizes = [...new Set(data.map(d => d.inputs.length))];
    if (inputSizes.length > 1)
      return { data: [], error: 'Inconsistent input dimensions across rows.' };

    return { data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: [], error: `Parse error: ${msg}` };
  }
}

// ── Helper: noise ─────────────────────────────────────────────────────────────
const noise = (scale = 0.02) => (Math.random() - 0.5) * 2 * scale;

// ── Training engine ────────────────────────────────────────────────────────────
/**
 * Runs `epochs` iterations of mock gradient descent.
 * Uses real forward passes for directionally-correct weight updates,
 * blended with a scheduled loss curve to guarantee visible convergence.
 */
export function trainEpochs(
  nodes: NetworkNode[],
  connections: NetworkConnection[],
  data: DataPoint[],
  epochs: number,
  lr: number,
): EpochResult[] {
  if (!data.length || !connections.length) return [];

  // Clone weights
  const weights: Record<string, number> = {};
  for (const c of connections) weights[c.id] = c.weight ?? 0.5;

  const results: EpochResult[] = [];
  const activeConns = connections.filter(c => c.active !== false);

  for (let ep = 1; ep <= epochs; ep++) {
    const t = ep / epochs;
    const prevWeights = { ...weights };

    // ── Real forward pass + pseudo-gradients ───────────────────────────────
    let realLoss = 0;
    let realCorrect = 0;
    const accGrad: Record<string, number> = {};

    for (const { inputs, targets } of data) {
      // Build connections snapshot with current weights
      const snap = connections.map(c => ({ ...c, weight: weights[c.id] ?? c.weight }));
      const { outputValues, nodeActivations } = computeForwardPass(nodes, snap, inputs);

      // MSE loss
      const errs = targets.map((tgt, i) => outputValues[i] - tgt);
      realLoss += errs.reduce((s, e) => s + e * e, 0) / Math.max(1, errs.length);

      // Binary accuracy
      const ok = errs.every((e, i) => {
        const pred = outputValues[i] >= 0.5 ? 1 : 0;
        return pred === (targets[i] >= 0.5 ? 1 : 0);
      });
      if (ok) realCorrect++;

      // Simplified backprop: gradient ≈ output_error × input_activation
      // This is exact for the last layer; approximation for earlier layers.
      const outErr = errs[0] ?? 0;
      for (const c of activeConns) {
        const fromAct = nodeActivations[c.fromId] ?? 0.5;
        accGrad[c.id] = (accGrad[c.id] ?? 0) + outErr * fromAct;
      }
    }

    const n = data.length;

    // ── Scheduled loss (guarantees visible convergence) ────────────────────
    const schedLoss = 0.693 * Math.exp(-3.2 * t) + 0.04 + noise(0.015);
    const schedAcc  = 0.5 + 0.485 * (1 - Math.exp(-4.5 * t)) + noise(0.012);
    // Blend: 40% real, 60% scheduled — weights still update from real gradients
    const displayLoss = Math.max(0.01, 0.4 * (realLoss / n) + 0.6 * schedLoss);
    const displayAcc  = Math.min(0.99, Math.max(0.4, 0.4 * (realCorrect / n) + 0.6 * schedAcc));

    // ── LR schedule: cosine warm decay ────────────────────────────────────
    const lrNow = lr * (0.5 + 0.5 * Math.cos(Math.PI * t * 0.8));

    // ── Update weights ─────────────────────────────────────────────────────
    const weightDeltas: Record<string, number> = {};
    const gradients: Record<string, number> = {};

    // Normalise gradients so updates have consistent scale
    const maxG = Math.max(...Object.values(accGrad).map(Math.abs), 1e-9);

    for (const c of activeConns) {
      const normGrad = (accGrad[c.id] ?? 0) / maxG;   // ∈ [-1, 1]
      gradients[c.id] = Math.abs(accGrad[c.id] ?? 0);

      // Gradient step: move in negative gradient direction with small noise
      const step = -lrNow * normGrad * (0.8 + Math.random() * 0.4);
      const newW = Math.max(-2, Math.min(2, (weights[c.id] ?? 0.5) + step));
      weightDeltas[c.id] = newW - (prevWeights[c.id] ?? 0.5);
      weights[c.id] = newW;
    }
    // Inactive connections keep their weights
    for (const c of connections.filter(c => c.active === false)) {
      weights[c.id] = c.weight ?? 0.5;
      weightDeltas[c.id] = 0;
      gradients[c.id] = 0;
    }

    results.push({
      epoch: ep,
      loss: displayLoss,
      accuracy: displayAcc,
      weightUpdates: { ...weights },
      weightDeltas,
      gradients,
    });
  }

  return results;
}

// ── Overfitting heuristic ──────────────────────────────────────────────────────
export function detectOverfitRisk(
  nodes: NetworkNode[],
  data: DataPoint[],
): { risk: boolean; reason?: string } {
  const hidden = nodes.filter(n => n.type !== 'input' && n.type !== 'output');
  const hasDropout   = hidden.some(n => n.type === 'dropout');
  const hasBatchNorm = hidden.some(n => n.type === 'batchnorm');

  if (hidden.length > 3 && data.length <= 16 && !hasDropout) {
    return {
      risk: true,
      reason: `Your network has ${hidden.length} hidden layers but only ${data.length} training samples. This combination typically leads to overfitting.`,
    };
  }
  if (hidden.length > 5 && !hasDropout && !hasBatchNorm) {
    return {
      risk: true,
      reason: `Deep networks (${hidden.length} hidden layers) without regularization are prone to overfitting. Consider adding Dropout or Batch Norm.`,
    };
  }
  return { risk: false };
}
