/**
 * Omnimind — Collaborative Canvas Overlay
 * Renders simulated collaborator cursors, ripple effects,
 * and "Pass Component" drop-zones on the canvas.
 */
import React, { useRef, useEffect, useState } from 'react';
import { CollabUser } from './CollabTypes';
import { NetworkNode } from './types';

// ── SVG cursor shape ───────────────────────────────────────────────────────────
function CursorSVG({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <svg
      width={14 * scale} height={18 * scale}
      viewBox="0 0 14 18"
      fill="none"
      style={{ filter: `drop-shadow(0 2px 4px ${color}66)` }}
    >
      <path
        d="M1.5 1.5 L1.5 14.5 L5 10.8 L7.2 17.2 L9.4 16.3 L7.2 9.8 L12 9.8 Z"
        fill={color}
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Click ripple ───────────────────────────────────────────────────────────────
function ClickRipple({ color }: { color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: -12, left: -12,
        width: 24, height: 24,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        pointerEvents: 'none',
        animation: 'collabRipple 0.5s cubic-bezier(0.2,0.7,0.5,1) forwards',
      }}
    />
  );
}

// ── State-dependent cursor ring ────────────────────────────────────────────────
function CursorStateRing({ state, color }: { state: string; color: string }) {
  if (state !== 'dragging') return null;
  return (
    <div style={{
      position: 'absolute',
      top: -4, left: -4,
      width: 22, height: 22,
      borderRadius: '50%',
      border: `1.5px dashed ${color}`,
      animation: 'collabSpin 2s linear infinite',
      pointerEvents: 'none',
    }} />
  );
}

// ── Single collaborator cursor ────────────────────────────────────────────────
interface CursorProps {
  user: CollabUser;
  x: number; // px
  y: number; // px
}

function CollabCursorEl({ user, x, y }: CursorProps) {
  const [showRipple, setShowRipple] = useState(false);
  const lastClickTs = useRef(0);

  // Trigger ripple when clickTs changes
  useEffect(() => {
    if (user.clickTs && user.clickTs !== lastClickTs.current) {
      lastClickTs.current = user.clickTs;
      setShowRipple(true);
      const t = setTimeout(() => setShowRipple(false), 520);
      return () => clearTimeout(t);
    }
  }, [user.clickTs]);

  const isTyping = user.state === 'typing';

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(0, 0)',
        transition: 'left 0.12s linear, top 0.12s linear',
        pointerEvents: 'none',
        zIndex: 65,
        userSelect: 'none',
      }}
    >
      {/* Cursor arrow */}
      <div style={{ position: 'relative' }}>
        <CursorSVG color={user.color} scale={user.state === 'dragging' ? 1.15 : 1} />
        <CursorStateRing state={user.state} color={user.color} />
        {showRipple && <ClickRipple color={user.color} />}
      </div>

      {/* Name + action chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginTop: 4,
          background: 'white',
          border: `1.5px solid ${user.color}30`,
          borderRadius: 100,
          padding: '3px 8px 3px 4px',
          boxShadow: `0 2px 8px ${user.color}20, 0 0 0 1px rgba(0,0,0,0.04)`,
          whiteSpace: 'nowrap',
          maxWidth: 220,
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 18, height: 18,
          borderRadius: '50%',
          background: user.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700, color: 'white',
          flexShrink: 0,
        }}>
          {user.initials}
        </div>

        {/* Name */}
        <span style={{ fontSize: 10, fontWeight: 600, color: '#1E293B' }}>
          {user.name}
        </span>

        {/* Separator + action */}
        <span style={{ fontSize: 10, color: '#CBD5E1', margin: '0 1px' }}>·</span>
        <span style={{
          fontSize: 9.5, color: '#64748B',
          overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120,
        }}>
          {user.action}
        </span>

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginLeft: 2 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: '50%',
                background: user.color,
                animation: `collabTyping 1.2s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pass-zone drop target ─────────────────────────────────────────────────────
interface PassZoneProps {
  user: CollabUser;
  x: number; y: number;
  nodeName: string;
  onPass: (userId: string) => void;
}

function PassZone({ user, x, y, nodeName, onPass }: PassZoneProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 44,
        top: y + 28,
        pointerEvents: 'auto',
        zIndex: 66,
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onPass(user.id)}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: hovered ? user.color : 'white',
        border: `2px solid ${user.color}`,
        borderRadius: 100,
        padding: '4px 10px 4px 6px',
        boxShadow: hovered
          ? `0 4px 16px ${user.color}50`
          : `0 2px 8px rgba(0,0,0,0.08)`,
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        animation: 'collabPassPulse 2s ease-in-out infinite',
      }}>
        {/* Arrow icon */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: hovered ? 'rgba(255,255,255,0.2)' : `${user.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: hovered ? 'white' : user.color,
        }}>
          ↗
        </div>
        <span style={{
          fontSize: 9.5, fontWeight: 700,
          color: hovered ? 'white' : user.color,
          letterSpacing: '0.01em',
        }}>
          Pass to {user.name.split(' ')[0]}
        </span>
      </div>
    </div>
  );
}

// ── Join notification banner ──────────────────────────────────────────────────
export function JoinBanner({ user, onDone }: { user: CollabUser; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        pointerEvents: 'none',
        animation: 'collabJoinBanner 3.5s cubic-bezier(0.34,1.1,0.64,1) forwards',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'white',
        border: `1.5px solid ${user.color}30`,
        borderRadius: 16,
        padding: '10px 18px',
        boxShadow: `0 8px 32px ${user.color}25, 0 0 0 1px rgba(0,0,0,0.04)`,
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: `linear-gradient(135deg, ${user.color}, ${user.bgColor})`,
          border: `2px solid ${user.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: 'white',
        }}>
          {user.initials}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
            {user.name} joined the session
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
            Now collaborating live 🎉
          </div>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#22C55E',
          animation: 'collabPulse 1s ease-in-out infinite',
        }} />
      </div>
    </div>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────
export interface CollabOverlayProps {
  users: CollabUser[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedNodeId: string | null;
  nodes: NetworkNode[];
  onPassNode: (targetUserId: string) => void;
}

export function CollabOverlay({
  users, containerRef, selectedNodeId, nodes, onPassNode,
}: CollabOverlayProps) {
  const [dims, setDims] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setDims({ w: r.width, h: r.height });
    });
    obs.observe(el);
    // Initial
    const r = el.getBoundingClientRect();
    setDims({ w: r.width, h: r.height });
    return () => obs.disconnect();
  }, [containerRef]);

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <>
      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes collabRipple {
          from { transform: scale(0.3); opacity: 1; }
          to   { transform: scale(2.8); opacity: 0; }
        }
        @keyframes collabSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes collabTyping {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes collabPassPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes collabJoinBanner {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.95); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
        }
        @keyframes collabPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>

      {/* ── Overlay (pointer-events none by default) ── */}
      <div
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          zIndex: 62,
          overflow: 'hidden',
        }}
      >
        {users.map(user => {
          const px = user.cursor.x * dims.w;
          const py = user.cursor.y * dims.h;

          return (
            <div key={user.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <CollabCursorEl user={user} x={px} y={py} />

              {/* Pass zones — only when a node is selected */}
              {selectedNode && (
                <PassZone
                  user={user}
                  x={px} y={py}
                  nodeName={selectedNode.label}
                  onPass={onPassNode}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}