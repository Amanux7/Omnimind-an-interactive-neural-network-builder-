/**
 * Omnimind — IconButton  (animated icon-button system)
 *
 * States: normal · hover · active/pressed · animating · disabled
 * All transitions respect prefers-reduced-motion via CSS.
 * ARIA attributes surface current state to assistive technology.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';

/* ── Types ──────────────────────────────────────────────────────────────── */
export type IconBtnVariant =
  | 'ghost-header'   // white-on-dark (app header)
  | 'ghost-light'    // slate-on-white (SimulationBar)
  | 'primary'        // indigo filled
  | 'amber'          // amber filled
  | 'teal'           // teal filled
  | 'ghost-amber'    // amber outline (inactive AI Optimize)
  | 'ghost-teal'     // teal outline  (inactive Multiplayer)
  | 'danger';        // red outline (clear canvas)

export type IconBtnSize =
  | 'xs' | 'sm' | 'md' | 'lg'              // square icon-only
  | 'pill-xs' | 'pill-sm' | 'pill-md' | 'pill-lg'; // pill (icon + label)

export type AnimationType =
  | 'fire'      // amber action-potential burst   (AI Optimize running)
  | 'flow'      // signal x-drift                 (forward prop active)
  | 'pulse'     // heartbeat scale                (training in progress)
  | 'orbit'     // spinning ring overlay          (loading / searching)
  | 'spark'     // one-shot completion burst      (success)
  | 'breathe'   // slow scale idle                (attention)
  | 'none';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Colour scheme */
  variant?: IconBtnVariant;
  /** Size preset (square = icon-only; pill = icon + label) */
  size?: IconBtnSize;
  /** Currently toggled / pressed state (affects background) */
  isActive?: boolean;
  /** Whether the "animating" motion should run */
  isAnimating?: boolean;
  /** Which animation pattern to use while isAnimating is true */
  animationType?: AnimationType;
  /**
   * Icon element(s) to wrap in the .om-btn__icon scale target.
   * For pill buttons, icon goes here; label text goes in `children`.
   */
  icon?: React.ReactNode;
  /**
   * For square (icon-only) buttons: put icon directly as children.
   * For pill buttons: icon prop + children = label text.
   */
  children?: React.ReactNode;
  /**
   * Spoken state suffix appended to aria-label when animating.
   * e.g. "Running" → aria-label becomes "Play — Running"
   */
  statusLabel?: string;
  /** Extra CSS class(es) forwarded to the button element */
  className?: string;
}

/* ── Component ──────────────────────────────────────────────────────────── */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      variant = 'ghost-header',
      size    = 'md',
      isActive      = false,
      isAnimating   = false,
      animationType = 'pulse',
      icon,
      children,
      statusLabel,
      className = '',
      disabled,
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) {
    /* ── Spark one-shot: fire class then remove ── */
    const [sparkActive, setSparkActive] = useState(false);
    const sparkPrevRef = useRef(false);

    useEffect(() => {
      if (animationType === 'spark' && isAnimating && !sparkPrevRef.current) {
        setSparkActive(true);
        const t = setTimeout(() => setSparkActive(false), 650);
        sparkPrevRef.current = true;
        return () => clearTimeout(t);
      }
      if (!isAnimating) sparkPrevRef.current = false;
    }, [animationType, isAnimating]);

    /* ── Build animation class ── */
    const animClass = useCallback((): string => {
      if (disabled || !isAnimating) return '';
      if (animationType === 'spark') return sparkActive ? 'om-anim-spark' : '';
      const map: Record<AnimationType, string> = {
        fire:    'om-anim-fire',
        flow:    'om-anim-flow',
        pulse:   'om-anim-pulse',
        orbit:   '',              // orbit uses a separate overlay span
        breathe: 'om-anim-breathe',
        spark:   '',
        none:    '',
      };
      return map[animationType] ?? '';
    }, [disabled, isAnimating, animationType, sparkActive]);

    /* ── Build variant class (override with isActive when toggled) ── */
    const variantClass = (): string => {
      if (isActive) {
        // Promote ghost variants to filled when toggled on
        if (variant === 'ghost-amber') return 'om-btn--amber';
        if (variant === 'ghost-teal')  return 'om-btn--teal';
        if (variant === 'ghost-header') return 'om-btn--primary';
      }
      return `om-btn--${variant}`;
    };

    /* ── Compose final class string ── */
    const cls = [
      'om-btn',
      `om-btn--${size}`,
      variantClass(),
      animClass(),
      disabled ? 'om-btn--disabled' : '',
      className,
    ].filter(Boolean).join(' ');

    /* ── ARIA label with state annotation ── */
    const computedAriaLabel = (() => {
      if (!ariaLabel) return undefined;
      const parts = [ariaLabel];
      if (isActive && !statusLabel)     parts.push('(active)');
      if (isAnimating && statusLabel)   parts.push(`— ${statusLabel}`);
      return parts.join(' ');
    })();

    /* ── Render ── */
    const isPill = size.startsWith('pill');

    return (
      <button
        ref={ref}
        className={cls}
        disabled={disabled}
        aria-label={computedAriaLabel}
        aria-pressed={isActive !== undefined ? isActive : undefined}
        aria-disabled={disabled ? true : undefined}
        {...rest}
      >
        {/* Orbit ring overlay (only for orbit animation type) */}
        {isAnimating && animationType === 'orbit' && !disabled && (
          <>
            <span className="om-orbit-ring"       aria-hidden="true" />
            <span className="om-orbit-ring-inner" aria-hidden="true" />
          </>
        )}

        {isPill && icon ? (
          /* ── Pill mode: icon + label side-by-side ── */
          <>
            <span className="om-btn__icon" aria-hidden="true">{icon}</span>
            <span className="om-btn__label">{children}</span>
          </>
        ) : (
          /* ── Square icon-only mode: entire children = icon ── */
          <span className="om-btn__icon" aria-hidden={!children ? 'true' : undefined}>
            {children ?? icon}
          </span>
        )}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';


/* ─────────────────────────────────────────────────────────────────────────
   NeuralIcon — standalone icon wrapper (no button, just animation states)
   Use this for icons inside custom interactive elements.
   ───────────────────────────────────────────────────────────────────────── */
interface NeuralIconProps {
  /** Icon element */
  children: React.ReactNode;
  /** Active animation */
  animType?: AnimationType;
  isAnimating?: boolean;
  className?: string;
  /** ARIA role override (default: none — aria-hidden by parent) */
  role?: string;
  'aria-label'?: string;
}

export function NeuralIcon({
  children,
  animType    = 'none',
  isAnimating = false,
  className   = '',
  role,
  'aria-label': ariaLabel,
}: NeuralIconProps) {
  const animClass = (() => {
    if (!isAnimating) return '';
    const map: Record<AnimationType, string> = {
      fire:    'om-anim-fire',
      flow:    'om-anim-flow',
      pulse:   'om-anim-pulse',
      breathe: 'om-anim-breathe',
      spark:   'om-anim-spark',
      orbit:   '',
      none:    '',
    };
    return map[animType] ?? '';
  })();

  return (
    <span
      className={`om-btn__icon ${animClass} ${className}`.trim()}
      role={role}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel ? 'true' : undefined}
    >
      {children}
    </span>
  );
}
