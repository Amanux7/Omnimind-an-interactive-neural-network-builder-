/**
 * Omnimind — Collaborative Side Panel
 * User list, live status, chat, and component passing.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, Users, X, Send, Wifi, WifiOff,
  ArrowUpRight, ChevronDown, ChevronUp, CircleDot,
} from 'lucide-react';
import { CollabUser, CollabMessage } from './CollabTypes';
import { NetworkNode } from './types';

// ── Formatters ────────────────────────────────────────────────────────────────
function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ state }: { state: string }) {
  const color = state === 'idle' ? '#22C55E'
    : state === 'clicking' ? '#F59E0B'
    : state === 'dragging' ? '#3B82F6'
    : '#94A3B8';
  return (
    <div style={{
      width: 7, height: 7, borderRadius: '50%',
      background: color,
      boxShadow: `0 0 4px ${color}`,
      animation: 'collabPanelPulse 1.5s ease-in-out infinite',
      flexShrink: 0,
    }} />
  );
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({
  user, selectedNode, onPass,
}: {
  user: CollabUser;
  selectedNode: NetworkNode | null;
  onPass: (userId: string) => void;
}) {
  const [passHovered, setPassHovered] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      borderBottom: '1px solid #F1F5F9',
      transition: 'background 0.15s',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: `linear-gradient(135deg, ${user.color}, ${user.color}bb)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: 'white',
        flexShrink: 0,
        boxShadow: `0 2px 8px ${user.color}40`,
        position: 'relative',
      }}>
        {user.initials}
        {/* Online indicator */}
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 9, height: 9, borderRadius: '50%',
          background: '#22C55E', border: '1.5px solid white',
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{user.name}</span>
          <StatusDot state={user.state} />
        </div>
        <div style={{
          fontSize: 10, color: '#94A3B8',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginTop: 1,
        }}>
          {user.action}
        </div>
      </div>

      {/* Pass button */}
      {selectedNode && (
        <button
          onMouseEnter={() => setPassHovered(true)}
          onMouseLeave={() => setPassHovered(false)}
          onClick={() => onPass(user.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 9px',
            background: passHovered ? user.color : `${user.color}15`,
            border: `1.5px solid ${user.color}`,
            borderRadius: 100,
            color: passHovered ? 'white' : user.color,
            fontSize: 9.5, fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowUpRight size={10} />
          Pass
        </button>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: CollabMessage }) {
  if (msg.isSystem) {
    return (
      <div style={{
        padding: '4px 12px',
        textAlign: 'center',
        fontSize: 9.5, color: '#94A3B8',
        fontStyle: 'italic',
      }}>
        {msg.text}
      </div>
    );
  }

  const isMe = msg.isMe;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMe ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 7,
      padding: '4px 12px',
      animation: 'collabMsgIn 0.2s cubic-bezier(0.34,1.2,0.64,1) both',
    }}>
      {/* Avatar */}
      {!isMe && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: msg.userColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 800, color: 'white',
          flexShrink: 0, marginTop: 2,
        }}>
          {msg.userName.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
      )}

      {/* Bubble */}
      <div style={{ maxWidth: '75%' }}>
        {!isMe && (
          <div style={{
            fontSize: 9.5, fontWeight: 700, color: msg.userColor,
            marginBottom: 2, marginLeft: 2,
          }}>
            {msg.userName}
          </div>
        )}
        <div style={{
          background: isMe
            ? 'linear-gradient(135deg, #3B82F6, #6366F1)'
            : 'white',
          color: isMe ? 'white' : '#334155',
          fontSize: 11, lineHeight: 1.5,
          padding: '7px 11px',
          borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          boxShadow: isMe
            ? '0 2px 8px rgba(59,130,246,0.35)'
            : '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
          wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
        <div style={{
          fontSize: 9, color: '#CBD5E1',
          marginTop: 2,
          textAlign: isMe ? 'right' : 'left',
          marginLeft: isMe ? 0 : 2, marginRight: isMe ? 2 : 0,
        }}>
          {formatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  );
}

// ── Panel tabs ────────────────────────────────────────────────────────────────
type PanelTab = 'users' | 'chat';

// ── Main panel ────────────────────────────────────────────────────────────────
export interface CollabPanelProps {
  isOpen: boolean;
  users: CollabUser[];
  messages: CollabMessage[];
  unreadCount: number;
  selectedNode: NetworkNode | null;
  onClose: () => void;
  onToggle: () => void;
  onSend: (text: string) => void;
  onPass: (userId: string) => void;
  onLeave: () => void;
}

export function CollabPanel({
  isOpen, users, messages, unreadCount,
  selectedNode, onClose, onToggle, onSend, onPass, onLeave,
}: CollabPanelProps) {
  const [tab, setTab] = useState<PanelTab>('chat');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && tab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, tab]);

  const handleSend = useCallback(() => {
    const t = inputText.trim();
    if (!t) return;
    onSend(t);
    setInputText('');
    inputRef.current?.focus();
  }, [inputText, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      <style>{`
        @keyframes collabPanelPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes collabMsgIn {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes collabPanelSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Floating toggle button (always visible when collab is on) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          style={{
            position: 'absolute',
            bottom: 16, right: 16,
            zIndex: 70,
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(59,130,246,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          title="Open collab chat"
        >
          <MessageCircle size={18} color="white" />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 18, height: 18, borderRadius: '50%',
              background: '#EF4444', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: 'white',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 16, right: 16,
            zIndex: 70,
            width: 340,
            height: 480,
            background: 'white',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(99,102,241,0.10)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'collabPanelSlideIn 0.22s cubic-bezier(0.34,1.1,0.64,1) both',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '12px 16px 10px',
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            flexShrink: 0,
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 9,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wifi size={13} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white', lineHeight: 1 }}>
                  Live Session
                </div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1, marginTop: 2 }}>
                  {users.length + 1} collaborators • real-time sync
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(34,197,94,0.2)',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: 100, padding: '3px 8px',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#22C55E',
                  animation: 'collabPanelPulse 1.2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#4ADE80' }}>LIVE</span>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 24, height: 24, borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ChevronDown size={13} color="rgba(255,255,255,0.7)" />
              </button>
            </div>

            {/* Collaborator avatars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Me */}
              <div title="You (host)" style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}>
                Me
              </div>
              {users.map(u => (
                <div key={u.id} title={u.name} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: u.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  flexShrink: 0,
                  position: 'relative',
                }}>
                  {u.initials}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#22C55E', border: '1.5px solid #1E293B',
                  }} />
                </div>
              ))}
              <div style={{ flex: 1 }} />
              {/* Tabs */}
              <div style={{
                display: 'flex', gap: 2,
                background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 2,
              }}>
                {(['chat', 'users'] as PanelTab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 10, fontWeight: 700,
                      background: tab === t ? 'rgba(255,255,255,0.2)' : 'transparent',
                      color: tab === t ? 'white' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {t === 'chat' ? (
                      <>
                        <MessageCircle size={9} />
                        Chat
                        {unreadCount > 0 && tab !== 'chat' && (
                          <span style={{
                            background: '#EF4444', borderRadius: '50%',
                            width: 14, height: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8,
                          }}>
                            {unreadCount}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Users size={9} />
                        Users
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tab: Users ── */}
          {tab === 'users' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* "Pass selected" hint */}
              {selectedNode && (
                <div style={{
                  margin: '10px 12px 0',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)',
                  border: '1px solid #BFDBFE',
                  borderRadius: 12,
                  fontSize: 10.5, color: '#1E40AF',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <ArrowUpRight size={12} />
                  <span>
                    <strong>{selectedNode.label}</strong> selected — press Pass to hand it off
                  </span>
                </div>
              )}

              {/* Me row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px',
                borderBottom: '1px solid #F1F5F9',
                background: '#F8FAFC',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0,
                }}>
                  Me
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>You (host)</span>
                    <div style={{
                      padding: '1px 6px', borderRadius: 100,
                      background: '#DCFCE7', fontSize: 9, fontWeight: 700, color: '#16A34A',
                    }}>
                      HOST
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>building network</div>
                </div>
              </div>

              {users.map(u => (
                <UserRow key={u.id} user={u} selectedNode={selectedNode} onPass={onPass} />
              ))}

              {/* Leave session */}
              <div style={{ padding: '12px 16px' }}>
                <button
                  onClick={onLeave}
                  style={{
                    width: '100%', padding: '8px',
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: 10, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, color: '#EF4444',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                >
                  <WifiOff size={12} /> Leave Session
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Chat ── */}
          {tab === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {messages.length === 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    height: '100%', color: '#CBD5E1', padding: 20,
                    textAlign: 'center',
                  }}>
                    <MessageCircle size={28} style={{ marginBottom: 8 }} />
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>
                      No messages yet — your collaborators will chime in soon!
                    </p>
                  </div>
                )}
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '10px 12px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex', gap: 8, alignItems: 'center',
                flexShrink: 0,
                background: '#FAFAFA',
              }}>
                <input
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message collaborators…"
                  style={{
                    flex: 1, padding: '8px 12px',
                    background: 'white',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 12, outline: 'none',
                    fontSize: 11, color: '#334155',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#3B82F6'; }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: inputText.trim()
                      ? 'linear-gradient(135deg, #3B82F6, #6366F1)'
                      : '#F1F5F9',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: inputText.trim() ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    boxShadow: inputText.trim() ? '0 2px 8px rgba(59,130,246,0.35)' : 'none',
                  }}
                >
                  <Send size={13} color={inputText.trim() ? 'white' : '#CBD5E1'} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
