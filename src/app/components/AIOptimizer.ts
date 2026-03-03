/**
 * Omnimind — AI Optimization Engine
 * Pure rule-based analysis with educational explanations.
 * No React, no side-effects.
 */
import { NetworkNode, NetworkConnection } from './types';
import { SimulationState } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AISeverity  = 'critical' | 'warning' | 'info' | 'tip';
export type AICategory  = 'architecture' | 'activation' | 'regularization' | 'training' | 'performance';
export type AIActionType =
  | 'insert_between'
  | 'append_after'
  | 'prepend_before'
  | 'update_config'
  | 'none';

export interface AIAction {
  type: AIActionType;
  label: string; // human-readable description of what will change
  payload: {
    fromNodeId?: string;   // insert_between: insert after this
    toNodeId?: string;     // insert_between: insert before this
    anchorNodeId?: string; // append_after / prepend_before: reference node
    nodeType?: string;
    nodeLabel?: string;
    nodeConfig?: Record<string, unknown>;
    targetNodeId?: string; // update_config
    configUpdate?: Record<string, unknown>;
  };
}

export interface AISuggestion {
  id: string;
  severity: AISeverity;
  category: AICategory;
  title: string;
  shortDesc: string;
  explanation: string;    // long educational paragraph(s)
  example?: string;       // mini code/math snippet
  proTip?: string;        // extra one-liner
  confidence: number;     // 0–100
  impact: string;         // estimated benefit description
  action?: AIAction;      // auto-fix if available
}

// ── Analysis engine ───────────────────────────────────────────────────────────

let _idSeq = 0;
const uid = () => `aisg-${++_idSeq}-${Date.now()}`;

export function analyzeNetwork(
  nodes: NetworkNode[],
  connections: NetworkConnection[],
  simulation: SimulationState,
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  const denseNodes      = nodes.filter(n => n.type === 'dense');
  const activationNodes = nodes.filter(n => n.type === 'activation');
  const dropoutNodes    = nodes.filter(n => n.type === 'dropout');
  const inputNodes      = nodes.filter(n => n.type === 'input');
  const outputNodes     = nodes.filter(n => n.type === 'output');
  const batchNormNodes  = nodes.filter(n => n.type === 'batchnorm');
  const lstmNodes       = nodes.filter(n => n.type === 'lstm');
  const embeddingNodes  = nodes.filter(n => n.type === 'embedding');

  const trained   = simulation.epoch > 0;
  const acc       = simulation.accuracy;
  const loss      = simulation.loss;
  const epochs    = simulation.epoch;

  // helper: find direct connection between two nodes
  const hasDirectConn = (fromId: string, toId: string) =>
    connections.some(c => c.fromId === fromId && c.toId === toId);

  // helper: node sort by x (left to right, approximate network order)
  const sortedNodes = [...nodes].sort((a, b) => a.x - b.x);

  // ── 1. Missing output layer ────────────────────────────────────────────────
  if (outputNodes.length === 0 && nodes.length > 0) {
    const last = sortedNodes[sortedNodes.length - 1];
    suggestions.push({
      id: uid(), severity: 'critical', category: 'architecture',
      title: 'Missing Output Layer',
      shortDesc: 'The network has no output layer — it cannot produce predictions.',
      explanation:
        `Every feed-forward network needs an output layer to map internal representations to predictions. Without it, forward propagation has no terminus and loss cannot be computed.\n\n` +
        `The output neuron count must match your task:\n` +
        `• Binary classification → 1 neuron + Sigmoid\n` +
        `• Multi-class (K classes) → K neurons + Softmax\n` +
        `• Regression → 1 neuron + Linear (no activation)\n\n` +
        `Think of the output layer as the "translation layer" — it converts the abstract feature vector learned by hidden layers into the actual answer format your loss function expects.`,
      example: `# Multi-class (e.g. MNIST)\nDense(10) + Softmax  →  probabilities for 10 digits\n\n# Binary\nDense(1) + Sigmoid   →  P(positive class)`,
      proTip: 'Match output_shape to your number of target classes, not the dataset size.',
      confidence: 99,
      impact: '🔴 Network non-functional — cannot train or predict',
      action: {
        type: 'append_after',
        label: 'Add Output Layer at the end',
        payload: {
          anchorNodeId: last?.id,
          nodeType: 'output', nodeLabel: 'Output',
          nodeConfig: { outputShape: '10' },
        },
      },
    });
  }

  // ── 2. Missing input layer ─────────────────────────────────────────────────
  if (inputNodes.length === 0 && nodes.length > 0) {
    const first = sortedNodes[0];
    suggestions.push({
      id: uid(), severity: 'critical', category: 'architecture',
      title: 'Missing Input Layer',
      shortDesc: 'No input layer — the data has no entry point into the network.',
      explanation:
        `The input layer defines the shape of data entering the network. It doesn't have trainable weights — it simply acts as a dimensionality declaration that shapes the first weight matrix.\n\n` +
        `Common input shapes:\n` +
        `• Flat images (MNIST 28×28): 784\n` +
        `• Tabular data with 30 features: 30\n` +
        `• RGB image flattened (32×32×3): 3072\n\n` +
        `Without this layer, the first Dense layer has no defined input dimensionality, which breaks the forward pass.`,
      example: `input_shape = (784,)   # flat MNIST\ninput_shape = (30,)    # 30 tabular features`,
      confidence: 99,
      impact: '🔴 Network non-functional — cannot define weight shapes',
      action: {
        type: 'prepend_before',
        label: 'Add Input Layer at the start',
        payload: {
          anchorNodeId: first?.id,
          nodeType: 'input', nodeLabel: 'Input Layer',
          nodeConfig: { inputShape: '784' },
        },
      },
    });
  }

  // ── 3. Network too shallow ─────────────────────────────────────────────────
  const hiddenLayers = nodes.filter(n => n.type !== 'input' && n.type !== 'output');
  if (nodes.length >= 2 && hiddenLayers.length < 2 && denseNodes.length < 2
      && !lstmNodes.length && !nodes.find(n => n.type === 'conv2d')) {
    const refNode = outputNodes[0] ?? sortedNodes[sortedNodes.length - 1];
    suggestions.push({
      id: uid(), severity: 'warning', category: 'architecture',
      title: 'Network Too Shallow',
      shortDesc: 'A single hidden layer limits the network to simple decision boundaries.',
      explanation:
        `The Universal Approximation Theorem guarantees one hidden layer can theoretically approximate any function — but with exponentially more neurons than a deep equivalent.\n\n` +
        `Deeper networks learn hierarchical feature representations:\n` +
        `• Layer 1: detects low-level patterns (edges, n-grams)\n` +
        `• Layer 2: combines them into mid-level features\n` +
        `• Layer 3+: assembles high-level semantic concepts\n\n` +
        `Rule of thumb for starting depth:\n` +
        `• Simple tabular data: 2–3 layers\n` +
        `• Image classification: 4–8 layers (or use Conv2D)\n` +
        `• NLP tasks: 6–12 layers (or use LSTM/Transformer)\n\n` +
        `Always follow the "funnel" principle: gradually reduce width layer by layer (e.g., 512 → 256 → 128 → 10).`,
      example: `# Shallow — limited expressivity\nLinear(784, 512) → ReLU → Linear(512, 10)\n\n# Deep — hierarchical features\nLinear(784, 512) → ReLU\n→ Linear(512, 256) → ReLU\n→ Linear(256, 64) → ReLU\n→ Linear(64, 10)`,
      proTip: 'When widening fails to improve accuracy, adding depth is usually more effective.',
      confidence: 79,
      impact: '📈 +8–15% accuracy potential on complex datasets',
      action: {
        type: 'prepend_before',
        label: 'Insert Dense(128) + ReLU hidden block',
        payload: {
          anchorNodeId: refNode?.id,
          nodeType: 'dense', nodeLabel: 'Dense 128',
          nodeConfig: { neurons: 128 },
        },
      },
    });
  }

  // ── 4. Dense→Dense without activation (linearity collapse) ────────────────
  for (const c of connections) {
    const from = nodes.find(n => n.id === c.fromId);
    const to   = nodes.find(n => n.id === c.toId);
    if (from?.type === 'dense' && to?.type === 'dense') {
      suggestions.push({
        id: uid(), severity: 'warning', category: 'activation',
        title: 'Linear Bottleneck: Dense → Dense',
        shortDesc: `"${from.label}" connects directly to "${to.label}" — stacking linear layers collapses to one.`,
        explanation:
          `Without a non-linearity between two dense layers, the composition W₂(W₁x + b₁) + b₂ = (W₂W₁)x + (W₂b₁+b₂) — it's just one bigger matrix multiply. No matter how many layers you stack, they remain equivalent to a single linear transformation.\n\n` +
          `Adding ReLU (or another activation) "breaks" this equivalence by introducing a piecewise non-linear function:\n` +
          `• f(x) = max(0, x) creates "bent hyperplane" decision boundaries\n` +
          `• Each layer now learns genuinely different features\n` +
          `• Backpropagation can exploit these non-linearities for better gradients\n\n` +
          `ReLU is preferred in hidden layers for its computational simplicity and resistance to vanishing gradients.`,
        example: `# ❌ Equivalent to single layer:\nLinear(512, 256) → Linear(256, 64)\n\n# ✅ Genuine two layers:\nLinear(512, 256) → ReLU → Linear(256, 64)`,
        proTip: 'Use ReLU/GELU for hidden layers; reserve Sigmoid/Softmax for the output layer.',
        confidence: 96,
        impact: '📈 Unlocks true non-linear learning — often a large accuracy jump',
        action: {
          type: 'insert_between',
          label: `Insert ReLU between ${from.label} and ${to.label}`,
          payload: {
            fromNodeId: from.id, toNodeId: to.id,
            nodeType: 'activation', nodeLabel: 'ReLU',
            nodeConfig: { activationFn: 'ReLU' },
          },
        },
      });
      break; // report once
    }
  }

  // ── 5. No dropout — overfitting risk ──────────────────────────────────────
  if (denseNodes.length >= 2 && dropoutNodes.length === 0 && activationNodes.length > 0) {
    const anchor = activationNodes[0];
    suggestions.push({
      id: uid(), severity: 'warning', category: 'regularization',
      title: 'Missing Dropout — Overfitting Risk',
      shortDesc: `${denseNodes.length} dense layers with no regularization can memorize training data.`,
      explanation:
        `Dropout stochastically zeroes neurons during each training step (rate p = 0.2–0.5), preventing units from co-adapting — each neuron is forced to be independently useful.\n\n` +
        `At inference, dropout is disabled and all weights are used (scaled by 1−p automatically in modern frameworks).\n\n` +
        `Key placement rules:\n` +
        `• Place after ReLU activations in hidden layers ✅\n` +
        `• Never after the final output layer ❌\n` +
        `• Use lower rates (0.1–0.2) for early layers, higher (0.4–0.5) for large layers\n\n` +
        `Mathematically, dropout approximates training an ensemble of 2ⁿ sub-networks, averaged at inference — similar to bagging but with shared weights.`,
      example: `# Correct placement:\nDense(512) → ReLU → Dropout(0.3)\n→ Dense(256) → ReLU → Dropout(0.2)\n→ Dense(10)  → Softmax`,
      proTip: 'If using BatchNorm, you may not need Dropout — they can conflict. Use one or the other.',
      confidence: 83,
      impact: '🛡️ Reduces overfitting; better generalization on unseen data',
      action: {
        type: 'append_after',
        label: `Add Dropout(0.3) after first activation`,
        payload: {
          anchorNodeId: anchor?.id,
          nodeType: 'dropout', nodeLabel: 'Dropout 0.3',
          nodeConfig: { dropoutRate: 0.3 },
        },
      },
    });
  }

  // ── 6. Low accuracy → underfitting ────────────────────────────────────────
  if (trained && acc < 0.75 && denseNodes.length > 0) {
    const thin = denseNodes.reduce(
      (min, n) => (n.config.neurons ?? 64) < (min.config.neurons ?? 64) ? n : min,
      denseNodes[0],
    );
    const cur = thin.config.neurons ?? 64;
    if (cur < 512) {
      const newN = Math.min(cur * 2, 512);
      suggestions.push({
        id: uid(), severity: 'info', category: 'performance',
        title: `Underfitting — Accuracy ${(acc * 100).toFixed(1)}%`,
        shortDesc: `After ${epochs} epochs, accuracy is still below 75%. "${thin.label}" may be under-capacity.`,
        explanation:
          `An accuracy of ${(acc * 100).toFixed(1)}% after ${epochs} epochs strongly suggests underfitting — the model lacks sufficient capacity to learn the data distribution.\n\n` +
          `Capacity can be increased via:\n` +
          `1. More neurons per layer (immediate effect)\n` +
          `2. More layers (better for complex tasks)\n` +
          `3. Fewer constraints (e.g., lower dropout rate)\n` +
          `4. Longer training with a lower learning rate\n\n` +
          `Heuristic starting widths:\n` +
          `• Simple tasks: hidden ≈ (input + output) / 2\n` +
          `• Medium tasks: hidden ≈ input × 2\n` +
          `• Complex tasks: hidden = 2^n where n=8–10 (256–1024)\n\n` +
          `After widening, monitor train vs. validation loss — if val diverges from train, you've crossed into overfitting territory.`,
        example: `# Before: ${thin.label}\nLinear(?, ${cur})   # too narrow\n\n# After: doubled capacity\nLinear(?, ${newN})  # +${newN - cur} neurons`,
        proTip: 'Always train for at least 2× more epochs after increasing capacity before evaluating.',
        confidence: 75,
        impact: `📈 Estimated +${Math.round((0.85 - acc) * 40)}–${Math.round((0.85 - acc) * 80)}% accuracy`,
        action: {
          type: 'update_config',
          label: `Increase "${thin.label}" to ${newN} neurons`,
          payload: { targetNodeId: thin.id, configUpdate: { neurons: newN } },
        },
      });
    }
  }

  // ── 7. High loss after many epochs ────────────────────────────────────────
  if (trained && loss > 0.55 && epochs > 15) {
    suggestions.push({
      id: uid(), severity: 'info', category: 'training',
      title: `High Loss (${loss.toFixed(3)}) After ${epochs} Epochs`,
      shortDesc: 'Loss remains elevated — possible causes: LR too high, too few neurons, or poor arch.',
      explanation:
        `Cross-entropy loss of ${loss.toFixed(3)} after ${epochs} epochs is above the threshold for good convergence (< 0.2 excellent, < 0.4 acceptable). Common causes:\n\n` +
        `• Learning rate too high: loss oscillates instead of smoothly decreasing → try 10× lower LR\n` +
        `• Learning rate too low: loss decreases but very slowly → try 5× higher LR\n` +
        `• Architecture bottleneck: model can't represent the data → widen or deepen\n` +
        `• Activation saturation: Sigmoid/Tanh at hidden layers can saturate → switch to ReLU\n` +
        `• Vanishing gradients in deep nets → add BatchNorm or use Residual connections\n\n` +
        `Diagnostic tip: if training loss is low but val loss is high → overfitting. If both are high → underfitting.`,
      example: `# Loss diagnostics\nloss > 0.5 after 20 epochs → check LR\nloss plateau after epoch 10 → reduce LR by 10x\nloss NaN → LR too high, clip gradients`,
      proTip: 'Try learning rate warmup: start at lr/10 for first 5 epochs, then increase to lr.',
      confidence: 71,
      impact: '⚡ Better convergence, lower final loss',
      action: { type: 'none', label: 'Adjust LR in the Training Panel', payload: {} },
    });
  }

  // ── 8. BatchNorm suggestion for large networks ─────────────────────────────
  const bigLayers = denseNodes.filter(n => (n.config.neurons ?? 0) >= 128);
  if (bigLayers.length > 0 && batchNormNodes.length === 0 && denseNodes.length >= 2) {
    const anchor = bigLayers[0];
    suggestions.push({
      id: uid(), severity: 'tip', category: 'performance',
      title: 'Batch Normalization for Faster Training',
      shortDesc: `Large layer "${anchor.label}" (${anchor.config.neurons} neurons) could converge faster with BatchNorm.`,
      explanation:
        `Batch Normalization normalizes layer activations to zero mean / unit variance using the current mini-batch statistics, then applies learnable scale (γ) and shift (β).\n\n` +
        `Benefits:\n` +
        `• 3–10× faster convergence (smoother loss landscape)\n` +
        `• Acts as implicit regularization — can replace Dropout\n` +
        `• Allows significantly higher learning rates\n` +
        `• Reduces internal covariate shift\n\n` +
        `Correct placement:\nDense → BatchNorm → ReLU (BN before activation)\n\n` +
        `Note: BatchNorm is less effective with batch_size < 8. For very small batches, use LayerNorm or GroupNorm instead.`,
      example: `# Without BN — covariate shift\nDense(512) → ReLU\n\n# With BN — stable distributions\nDense(512) → BatchNorm → ReLU`,
      proTip: 'BatchNorm and Dropout can conflict — use one or the other, not both in the same block.',
      confidence: 69,
      impact: '⚡ Faster convergence, smoother loss curve, often +2–5% accuracy',
      action: {
        type: 'append_after',
        label: `Add BatchNorm after "${anchor.label}"`,
        payload: {
          anchorNodeId: anchor.id,
          nodeType: 'batchnorm', nodeLabel: 'Batch Norm',
          nodeConfig: {},
        },
      },
    });
  }

  // ── 9. Sigmoid on multi-class output ──────────────────────────────────────
  const sigmoidNodes = activationNodes.filter(n => n.config.activationFn === 'Sigmoid');
  if (sigmoidNodes.length > 0 && outputNodes.length > 0) {
    const outClasses = parseInt(outputNodes[0].config.outputShape ?? '2', 10);
    if (!isNaN(outClasses) && outClasses > 2) {
      suggestions.push({
        id: uid(), severity: 'warning', category: 'activation',
        title: 'Sigmoid on Multi-class Output',
        shortDesc: `${outClasses} output classes detected but Sigmoid activation is present — use Softmax.`,
        explanation:
          `Sigmoid maps each neuron independently to (0,1), treating each class as a binary decision. This is correct for multi-label classification (multiple classes can be true simultaneously).\n\n` +
          `But for standard multi-class classification (exactly one class is true), you need Softmax — it enforces that all output probabilities sum to 1:\n\n` +
          `softmax(xᵢ) = exp(xᵢ) / Σⱼ exp(xⱼ)\n\n` +
          `With Sigmoid, your ${outClasses} output neurons could all output 0.9, which is incoherent for a single-label problem. Softmax "competes" the classes against each other, giving you a true probability distribution.\n\n` +
          `Use Sigmoid when: multi-label (a photo can be "cat" AND "outdoor" AND "daytime")\n` +
          `Use Softmax when: multi-class (a digit is exactly one of 0–9)`,
        example: `# Multi-label (can be multiple): Sigmoid\noutput = Dense(${outClasses}) → Sigmoid\n\n# Multi-class (exactly one): Softmax\noutput = Dense(${outClasses}) → Softmax`,
        proTip: 'Softmax + categorical_crossentropy is the standard for multi-class classification.',
        confidence: 87,
        impact: '📈 Proper probability calibration — correct loss computation',
        action: {
          type: 'update_config',
          label: `Switch "${sigmoidNodes[0].label}" to Softmax`,
          payload: {
            targetNodeId: sigmoidNodes[0].id,
            configUpdate: { activationFn: 'Softmax' },
          },
        },
      });
    }
  }

  // ── 10. LSTM without Embedding ─────────────────────────────────────────────
  if (lstmNodes.length > 0 && embeddingNodes.length === 0) {
    const firstLstm = lstmNodes[0];
    suggestions.push({
      id: uid(), severity: 'tip', category: 'architecture',
      title: 'LSTM Without Embedding Layer',
      shortDesc: 'LSTM works best with a learned word/token embedding — raw one-hot vectors waste capacity.',
      explanation:
        `When processing text or sequences, feeding raw one-hot encoded token vectors directly into an LSTM is inefficient — each token becomes a high-dimensional sparse vector.\n\n` +
        `An Embedding layer learns a dense low-dimensional representation (e.g., 64-dim) for each token, capturing semantic similarity:\n` +
        `• "king" - "man" + "woman" ≈ "queen" (the famous Word2Vec result)\n` +
        `• Similar words have similar embedding vectors\n` +
        `• The embedding is learned jointly with the rest of the network\n\n` +
        `Architecture: Embedding(vocab_size, embed_dim) → LSTM(units) → Dense(output)\n` +
        `Typical values: vocab_size=10000–50000, embed_dim=64–256`,
      example: `# Without: sparse, no semantic structure\nOneHot(10000) → LSTM(64)\n\n# With: dense, learned semantics\nEmbedding(10000, 64) → LSTM(64)`,
      proTip: 'Freeze a pre-trained embedding (GloVe, FastText) to dramatically speed up training.',
      confidence: 74,
      impact: '📈 Better sequence understanding, faster convergence on text tasks',
      action: {
        type: 'prepend_before',
        label: 'Add Embedding(10000, 64) before LSTM',
        payload: {
          anchorNodeId: firstLstm.id,
          nodeType: 'embedding', nodeLabel: 'Embedding',
          nodeConfig: { vocabSize: 10000, embedDim: 64 },
        },
      },
    });
  }

  // ── 11. All-ReLU activation monoculture ───────────────────────────────────
  const allFns = activationNodes.map(n => n.config.activationFn ?? 'ReLU');
  const uniqueFns = new Set(allFns);
  if (activationNodes.length >= 3 && uniqueFns.size === 1 && uniqueFns.has('ReLU')) {
    suggestions.push({
      id: uid(), severity: 'tip', category: 'activation',
      title: 'Consider GELU for Deeper Layers',
      shortDesc: 'All activations are ReLU — modern deep networks often benefit from GELU in later layers.',
      explanation:
        `ReLU is excellent and widely used, but it has two known issues:\n` +
        `1. Dying ReLU: neurons stuck at 0 if inputs stay negative → gradients become 0\n` +
        `2. Not smooth at x=0: can cause oscillations in gradient flow\n\n` +
        `GELU (Gaussian Error Linear Unit), used in GPT/BERT/ViT, addresses both:\n` +
        `• Smooth everywhere — no gradient discontinuity\n` +
        `• Allows small negative outputs (probabilistic gating)\n` +
        `• Empirically outperforms ReLU on many modern architectures\n\n` +
        `A common pattern: use ReLU in early layers (fast, sparse, good feature selection), switch to GELU in deeper layers (smoother gradient flow).`,
      example: `# Classic deep network pattern:\nLayer 1: Dense → ReLU   (fast, sparse early features)\nLayer 2: Dense → ReLU\nLayer 3: Dense → GELU   (smooth in deep layers)\nLayer 4: Dense → GELU`,
      proTip: 'Swish (x·σ(x)) is another strong alternative to GELU with similar properties.',
      confidence: 60,
      impact: '📈 Potential +1–3% accuracy in deeper networks, smoother training',
      action: { type: 'none', label: 'Change activations via the hover switcher on each node', payload: {} },
    });
  }

  // ── 12. Healthy network ────────────────────────────────────────────────────
  const criticalOrWarning = suggestions.filter(s => s.severity === 'critical' || s.severity === 'warning');
  if (criticalOrWarning.length === 0 && nodes.length >= 4) {
    suggestions.push({
      id: uid(), severity: 'tip', category: 'performance',
      title: 'Architecture Looks Solid! 🎉',
      shortDesc: 'No critical issues detected. Your network passes the key architectural checks.',
      explanation:
        `Great work! Your network meets the key quality criteria:\n\n` +
        `✅ Input and output layers are present\n` +
        `✅ Non-linear activations separate dense layers\n` +
        `✅ Sufficient depth for the task\n\n` +
        `For further gains, consider these advanced techniques:\n` +
        `• Learning rate scheduling: reduce LR by 0.1× on plateau\n` +
        `• Weight initialization: He init for ReLU, Glorot for Tanh/Sigmoid\n` +
        `• Residual connections: skip-connect layers to help gradient flow in deep networks\n` +
        `• Data augmentation: artificially expand your training set\n` +
        `• Ensembles: train 3–5 models and average predictions (+2–4% typical)\n\n` +
        `Use the Forward Pass visualizer to inspect how different inputs activate each layer — this is the best way to develop intuition for what your network has learned.`,
      example: `# Learning rate schedule (PyTorch)\nscheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(\n  optimizer, mode='min', patience=3, factor=0.1\n)`,
      proTip: 'Try the Forward Pass visualizer with extreme inputs (all-zeros, all-ones) to spot dead neurons.',
      confidence: 91,
      impact: '🌟 Ready for training experiments — focus on data quality next',
      action: { type: 'none', label: '', payload: {} },
    });
  }

  // Sort: critical → warning → info → tip
  const ORDER: Record<AISeverity, number> = { critical: 0, warning: 1, info: 2, tip: 3 };
  return suggestions.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
