/**
 * Omnimind — NodePulse
 *
 * An absolutely-positioned overlay that fires the `om-node-pulse` animation
 * every time a canvas neuron enters its forward-propagation wave-front.
 *
 * Design intent
 * ─────────────
 * The ring expands outward from the node border (like an action potential),
 * peaks with an amber glow, then fades — taking ~720 ms total.
 *
 * Usage inside CanvasNodeComponent:
 *   <NodePulse isFiring={!!inPropWave} />
 *
 * The component uses a "key-bump" pattern: each time `isFiring` transitions
 * from false → true, `fireKey` increments, which forces React to unmount and
 * remount the ring <span>. This restarts the CSS animation cleanly regardless
 * of how quickly successive activations arrive.
 *
 * Performance notes
 * ─────────────────
 * • `om-node-pulse-ring` animates only `transform`, `opacity`, `border-color`,
 *   and `box-shadow` — no layout-triggering properties.
 * • `will-change: transform, opacity, box-shadow` is set in CSS.
 * • The component renders null (no DOM node) when not firing AND before the
 *   first fire event, keeping quiet nodes zero-cost.
 * • `prefers-reduced-motion` in icon-animations.css disables the keyframe.
 */

import React, { useEffect, useRef, useState } from 'react';

// ── Props ────────────────────────────────────────────────────────────────────

interface NodePulseProps {
  /**
   * True while this neuron is part of the current forward-prop wave-front.
   * A false → true edge triggers one animation cycle.
   */
  isFiring: boolean;
  /**
   * Optional: keep the ring visible in a looping "active" state while true.
   * Useful for nodes that remain highlighted after the wave passes.
   * Defaults to false.
   */
  isPersistent?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders a zero-width amber ring around the parent canvas node.
 * The ring is `position: absolute; inset: -5px`, so the parent must be
 * `position: relative` (or `absolute` — both work for absolute children).
 */
export function NodePulse({ isFiring, isPersistent = false }: NodePulseProps) {
  // Counter that increments on each false → true transition.
  // Changing the key of the ring <span> forces a React remount, which
  // restarts the CSS @keyframes animation from 0%.
  const [fireKey, setFireKey] = useState(0);
  const prevFiringRef = useRef<boolean>(false);

  useEffect(() => {
    // Detect rising edge: isFiring just became true
    if (isFiring && !prevFiringRef.current) {
      setFireKey(k => k + 1);
    }
    prevFiringRef.current = isFiring;
  }, [isFiring]);

  // Render nothing before first activation and when not firing (unless persistent)
  if (fireKey === 0 && !isPersistent) return null;
  if (!isFiring && !isPersistent) return null;

  return (
    // key={fireKey} forces unmount → remount on each new activation,
    // restarting the CSS animation cleanly.
    <span
      key={fireKey}
      className="om-node-pulse-ring"
      // Announce to screen readers that the neuron is activating
      role="status"
      aria-label="Neuron activating"
      aria-live="polite"
      aria-atomic="true"
    />
  );
}

// ── NodeFireGlow ───────────────────────────────────────────────────────────────
// Companion: a softer radial inner glow that complements the outer ring.
// Shown while `isFiring` is true (not one-shot).

interface NodeFireGlowProps {
  /** Whether to show the inner radial glow */
  isActive: boolean;
  /** Node's primary dot color (hex) — used for tinted radial gradient */
  dotColor: string;
  /** Activation magnitude [0–1] — controls glow intensity */
  activation?: number;
}

/**
 * Inner radial glow overlay — sits at z-index 1 inside the node body.
 * Should be rendered as a direct child of the node body div:
 *   <div className="absolute inset-0 rounded-xl ...">
 *     <NodeFireGlow isActive={!!inPropWave} dotColor={style.dot} activation={propActivation} />
 *     ...
 *   </div>
 */
export function NodeFireGlow({ isActive, dotColor, activation = 0.5 }: NodeFireGlowProps) {
  if (!isActive) return null;

  // Scale glow intensity: low activation → cool blue tint, high → amber peak
  const useAmber    = activation >= 0.65;
  const innerColor  = useAmber
    ? `rgba(245,158,11,${(0.28 + activation * 0.20).toFixed(2)})`
    : `${dotColor}${Math.round((0.16 + activation * 0.18) * 255).toString(16).padStart(2,'0')}`;
  const outerStop   = useAmber ? 'rgba(245,158,11,0.05)' : 'transparent';

  return (
    <div
      className="absolute inset-0 rounded-xl pointer-events-none"
      aria-hidden="true"
      style={{
        background: `radial-gradient(ellipse at center, ${innerColor} 0%, ${outerStop} 68%)`,
        zIndex: 1,
        transition: 'background 0.25s ease',
      }}
    />
  );
}
