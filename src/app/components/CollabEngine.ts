/**
 * Omnimind — Collaborative Simulation Engine
 * Produces realistic cursor movement, scripted chat and event reactions.
 * Pure TypeScript, no React dependencies.
 */
import { CollabUser, CollabMessage } from './CollabTypes';

// ── Canvas waypoints (0-1 relative to canvas container) ───────────────────────
const WAYPOINTS = [
  { x: 0.06, y: 0.38 },   // Input layer zone
  { x: 0.22, y: 0.36 },   // Dense 1 zone
  { x: 0.37, y: 0.40 },   // Activation 1 zone
  { x: 0.50, y: 0.36 },   // Dropout/Dense zone
  { x: 0.64, y: 0.36 },   // Dense 2 zone
  { x: 0.78, y: 0.40 },   // Activation 2 zone
  { x: 0.91, y: 0.36 },   // Output zone
  { x: 0.33, y: 0.68 },   // Below-nodes empty area
  { x: 0.57, y: 0.20 },   // Above-nodes empty area
  { x: 0.14, y: 0.58 },   // Bottom-left empty
  { x: 0.72, y: 0.62 },   // Bottom-right empty
];

const ALEX_WAYPOINTS  = WAYPOINTS.slice(0, 7);  // left-to-center
const MAYA_WAYPOINTS  = WAYPOINTS.slice(2, 10); // center-to-right

const ACTIONS = [
  'reviewing architecture', 'checking weights', 'analyzing connections',
  'reading layer config', 'evaluating topology', 'mapping gradients',
  'inspecting activations', 'noting patterns', 'auditing flow',
];

function pickFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Scripted message timelines ────────────────────────────────────────────────
const TIMELINE: Array<{ delay: number; user: string; text: string }> = [
  { delay:  1400, user: 'alex', text: "Hey! Just joined the session 👋" },
  { delay:  3100, user: 'maya', text: "Hi! Love the network setup so far 🧠" },
  { delay:  8000, user: 'alex', text: "Should we add BatchNorm after Dense 128? Might stabilize convergence" },
  { delay: 13500, user: 'maya', text: "Good idea! Also noticed Sigmoid before the multi-class output — Softmax better here?" },
  { delay: 21000, user: 'alex', text: "Great catch, the AI Optimize panel flagged that too 🤖" },
  { delay: 29000, user: 'maya', text: "Let's run a forward pass to visualize the activations ⚡" },
  { delay: 37000, user: 'alex', text: "Loss is decreasing nicely 📉 Architecture looks solid!" },
  { delay: 49000, user: 'maya', text: "Think we need more epochs. I'll bump training to 100" },
  { delay: 58000, user: 'alex', text: "Agreed. Dense 256 → ReLU → Dense 64 funnel pattern for next iteration?" },
  { delay: 72000, user: 'maya', text: "Yes! Classic and battle-tested. Let me sketch it out 💯" },
  { delay: 88000, user: 'alex', text: "This is why I love building with others — way faster iteration 🙌" },
];

const REACTIONS: Record<string, Array<{ user: string; text: string }>> = {
  node_added: [
    { user: 'alex', text: "New layer added! What are you building? 🔥" },
    { user: 'maya', text: "Nice addition to the architecture!" },
  ],
  connection_made: [
    { user: 'maya', text: "Connection made! Wiring looks clean 👍" },
    { user: 'alex', text: "Good link — that'll help gradient flow" },
  ],
  training_started: [
    { user: 'alex', text: "Training started! Watching the metrics live... 📈" },
    { user: 'maya', text: "Let's gooo 🚀 I'll monitor the loss curve" },
  ],
  node_deleted: [
    { user: 'maya', text: "Pruning! Respect the lean architecture 🎯" },
    { user: 'alex', text: "Less is more sometimes — good call" },
  ],
  forward_pass: [
    { user: 'alex', text: "Watching the wave propagate... cool visualization!" },
    { user: 'maya', text: "The activations in hidden layers look healthy 👀" },
  ],
};

// ── Engine class ──────────────────────────────────────────────────────────────

export class CollabEngine {
  private users: CollabUser[];
  private moveTimer: ReturnType<typeof setInterval> | null = null;
  private msgTimers: ReturnType<typeof setTimeout>[] = [];
  private onUpdate: (users: CollabUser[]) => void;
  private onMessage: (msg: CollabMessage) => void;
  private startedAt = 0;

  constructor(
    onUpdate: (users: CollabUser[]) => void,
    onMessage: (msg: CollabMessage) => void,
  ) {
    this.onUpdate = onUpdate;
    this.onMessage = onMessage;

    this.users = [
      {
        id: 'alex', name: 'Alex Chen', initials: 'AC',
        color: '#3B82F6', bgColor: '#EFF6FF',
        cursor: { x: 0.28, y: 0.36 }, target: { x: 0.28, y: 0.36 },
        state: 'idle', action: 'reviewing architecture',
        lastTargetChangeAt: 0, targetHoldMs: 3000, clickTs: 0,
      },
      {
        id: 'maya', name: 'Maya Patel', initials: 'MP',
        color: '#8B5CF6', bgColor: '#F5F3FF',
        cursor: { x: 0.68, y: 0.40 }, target: { x: 0.68, y: 0.40 },
        state: 'idle', action: 'analyzing connections',
        lastTargetChangeAt: 200, targetHoldMs: 2700, clickTs: 0,
      },
    ];
  }

  start() {
    this.startedAt = Date.now();

    // Cursor movement at ~30 fps
    this.moveTimer = setInterval(() => this.tick(), 33);

    // Schedule all scripted messages
    TIMELINE.forEach(({ delay, user, text }) => {
      const t = setTimeout(() => this.addMsg(user, text), delay);
      this.msgTimers.push(t);
    });
  }

  stop() {
    if (this.moveTimer) { clearInterval(this.moveTimer); this.moveTimer = null; }
    this.msgTimers.forEach(clearTimeout);
    this.msgTimers = [];
  }

  // Trigger contextual reactions on network events
  triggerEvent(type: keyof typeof REACTIONS) {
    const pool = REACTIONS[type];
    if (!pool?.length) return;
    const { user, text } = pickFrom(pool);
    const delay = 600 + Math.random() * 1400;
    const t = setTimeout(() => this.addMsg(user, text), delay);
    this.msgTimers.push(t);

    // Move a random user toward the "action" area
    const mover = this.users[Math.floor(Math.random() * this.users.length)];
    mover.target = pickFrom(WAYPOINTS);
    mover.state = 'moving';
  }

  // Called when the local user passes a node to a collaborator
  receiveNode(userId: string, nodeName: string) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    user.action = `receiving "${nodeName}"…`;
    user.state = 'clicking';
    user.clickTs = Date.now();

    const t1 = setTimeout(() => {
      user.action = `got "${nodeName}" ✓`;
      user.state = 'idle';
      this.addMsg(userId, `Got "${nodeName}" — I'll work on the config 💪`);
      this.onUpdate([...this.users]);
    }, 1300);
    const t2 = setTimeout(() => {
      user.action = 'reviewing';
      this.onUpdate([...this.users]);
    }, 4500);
    this.msgTimers.push(t1, t2);
    this.onUpdate([...this.users]);
  }

  // Return a snapshot for UI rendering (avoids exposing internals)
  getUsers(): CollabUser[] { return [...this.users]; }

  // ── Private ─────────────────────────────────────────────────────────────────

  private tick() {
    const now = Date.now() - this.startedAt;
    let dirty = false;

    this.users.forEach(user => {
      // Pick new target when hold-time expires
      if (now - user.lastTargetChangeAt > user.targetHoldMs) {
        const pool = user.id === 'alex' ? ALEX_WAYPOINTS : MAYA_WAYPOINTS;
        user.target = { ...pickFrom(pool) };
        // add slight random jitter so cursors don't exactly overlap nodes
        user.target.x += (Math.random() - 0.5) * 0.04;
        user.target.y += (Math.random() - 0.5) * 0.04;
        user.lastTargetChangeAt = now;
        user.targetHoldMs = 1800 + Math.random() * 3800;
        user.action = pickFrom(ACTIONS);
        user.state = 'moving';
        dirty = true;
      }

      // Smooth lerp (faster approach)
      const LERP = 0.10;
      const dx = user.target.x - user.cursor.x;
      const dy = user.target.y - user.cursor.y;
      if (Math.abs(dx) > 0.0008 || Math.abs(dy) > 0.0008) {
        user.cursor = {
          x: user.cursor.x + dx * LERP,
          y: user.cursor.y + dy * LERP,
        };
        dirty = true;
      } else if (user.state === 'moving') {
        // Arrived — occasionally trigger a click
        if (Math.random() > 0.6) {
          user.state = 'clicking';
          user.clickTs = Date.now();
          const t = setTimeout(() => {
            user.state = 'idle';
            this.onUpdate([...this.users]);
          }, 350);
          this.msgTimers.push(t);
        } else {
          user.state = 'idle';
        }
        dirty = true;
      }
    });

    if (dirty) this.onUpdate([...this.users]);
  }

  private addMsg(userId: string, text: string) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;
    this.onMessage({
      id: `msg-${Date.now()}-${Math.random().toFixed(6)}`,
      userId, text,
      userName: user.name, userColor: user.color,
      timestamp: new Date(),
    });
  }
}
