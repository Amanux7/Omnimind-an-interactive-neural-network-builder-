/** Omnimind — Collaborative Mode Types */

export type CollabState = 'idle' | 'moving' | 'clicking' | 'dragging' | 'typing';

export interface CollabUser {
  id: string;
  name: string;
  initials: string;
  color: string;          // primary hex
  bgColor: string;        // tinted bg
  cursor: { x: number; y: number }; // 0–1 relative to canvas container
  target: { x: number; y: number };
  state: CollabState;
  action: string;
  lastTargetChangeAt: number;
  targetHoldMs: number;
  clickTs: number;        // last click timestamp for ripple animation
}

export interface CollabMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: Date;
  isMe?: boolean;
  isSystem?: boolean;
}
