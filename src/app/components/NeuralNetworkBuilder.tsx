import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  BookOpen, Users, Layers,
  Trash2, HelpCircle, Info, Sparkles,
  Undo2, Redo2, Zap, Wand2, Radio, MessageCircle,
  Moon, Sun, Menu, BarChart2, Download,
} from 'lucide-react';
import { OmnimindLogo } from './OmnimindLogo';
import { IconButton, NeuralIcon } from './IconButton';
import { Sidebar } from './Sidebar';
import { NetworkCanvas } from './NetworkCanvas';
import { SimulationBar } from './SimulationBar';
import { ForwardPropPanel, FwdPropState } from './ForwardPropPanel';
import { TrainingPanel, TrainAnimState } from './TrainingPanel';
import { OverfitWarningModal } from './OverfitWarningModal';
import { AIOptimizePanel } from './AIOptimizePanel';
import { CollabOverlay, JoinBanner } from './CollabOverlay';
import { CollabPanel } from './CollabPanel';
import { CollabEngine } from './CollabEngine';
import type { AISuggestion } from './AIOptimizer';
import type { CollabUser, CollabMessage } from './CollabTypes';
import {
  validateNetwork, computeForwardPass, ForwardPassResult, getInputPreset,
} from './forwardProp';
import {
  DataPoint, EpochResult, trainEpochs, detectOverfitRisk,
} from './training';
import {
  NetworkNode, NetworkConnection, Particle, SimulationState,
  NodeType, NodeConfig,
} from './types';
import { WelcomeScreen } from './WelcomeScreen';
import { TourOverlay } from './TourOverlay';
import { ResultsDashboard } from './ResultsDashboard';
import { DEMO_NETWORKS, type DemoNetwork } from './demoNetworks';

// ── Initial example network ──────────────────────────────────────────────────
const INITIAL_NODES: NetworkNode[] = [
  { id: 'n1', type: 'input',      x: 80,   y: 240, label: 'Input Layer',  config: { inputShape: '784' } },
  { id: 'n2', type: 'dense',      x: 340,  y: 240, label: 'Dense 128',   config: { neurons: 128 } },
  { id: 'n3', type: 'activation', x: 600,  y: 250, label: 'ReLU',        config: { activationFn: 'ReLU' } },
  { id: 'n4', type: 'dropout',    x: 840,  y: 250, label: 'Dropout 0.3', config: { dropoutRate: 0.3 } },
  { id: 'n5', type: 'dense',      x: 1080, y: 240, label: 'Dense 64',    config: { neurons: 64 } },
  { id: 'n6', type: 'activation', x: 1340, y: 250, label: 'Sigmoid',     config: { activationFn: 'Sigmoid' } },
  { id: 'n7', type: 'output',     x: 1580, y: 240, label: 'Output',      config: { outputShape: '10' } },
];
const INITIAL_CONNECTIONS: NetworkConnection[] = [
  { id: 'c1', fromId: 'n1', toId: 'n2' },
  { id: 'c2', fromId: 'n2', toId: 'n3' },
  { id: 'c3', fromId: 'n3', toId: 'n4' },
  { id: 'c4', fromId: 'n4', toId: 'n5' },
  { id: 'c5', fromId: 'n5', toId: 'n6' },
  { id: 'c6', fromId: 'n6', toId: 'n7' },
];
const INITIAL_SIMULATION: SimulationState = {
  isRunning: false, isPaused: false,
  epoch: 0, totalEpochs: 50,
  loss: 0.693, accuracy: 0.5,
  speed: 1, history: [],
};
const STORAGE_KEY = 'omnimind-v1';

// ── Helpers ───────────────────────────────────────────────────────────────────
let _nodeId = 100;
let _connId = 100;
const newNodeId = () => `n${++_nodeId}`;
const newConnId = () => `c${++_connId}`;

function loadState(): { nodes: NetworkNode[]; connections: NetworkConnection[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.nodes?.length) return p;
  } catch {}
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NeuralNetworkBuilder() {
  const saved = loadState();
  const [nodes,        setNodes]       = useState<NetworkNode[]>(saved?.nodes ?? INITIAL_NODES);
  const [connections,  setConnections] = useState<NetworkConnection[]>(saved?.connections ?? INITIAL_CONNECTIONS);
  const [selectedNodeId,  setSelectedNodeId]  = useState<string | null>(null);
  const [connectingFrom,  setConnectingFrom]  = useState<string | null>(null);
  const [simulation,      setSimulation]      = useState<SimulationState>(INITIAL_SIMULATION);
  const [particles,       setParticles]       = useState<Particle[]>([]);
  // First-load: show welcome unless user has seen it before
  const [showWelcome,     setShowWelcome]     = useState(() => {
    try { return !localStorage.getItem('omnimind-onboarded'); } catch { return true; }
  });
  const [showTour,        setShowTour]        = useState(false);
  const [showDashboard,   setShowDashboard]   = useState(false);
  const [showModelInfo,   setShowModelInfo]   = useState(false);
  const [showAIOptimize,  setShowAIOptimize]  = useState(false);

  // ── Collaboration ─────────────────────────────────────────────────────────
  const [collabEnabled,  setCollabEnabled]  = useState(false);
  const [collabUsers,    setCollabUsers]    = useState<CollabUser[]>([]);
  const [collabMessages, setCollabMessages] = useState<CollabMessage[]>([]);
  const [chatOpen,       setChatOpen]       = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [joinBanners,    setJoinBanners]    = useState<CollabUser[]>([]);
  const engineRef          = useRef<CollabEngine | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleToggleCollab = useCallback(() => {
    if (collabEnabled) {
      engineRef.current?.stop();
      engineRef.current = null;
      setCollabUsers([]);
      setCollabMessages([]);
      setCollabEnabled(false);
      setChatOpen(false);
      setUnreadCount(0);
      setJoinBanners([]);
    } else {
      const engine = new CollabEngine(
        users => setCollabUsers(users),
        msg => {
          setCollabMessages(prev => [...prev.slice(-99), msg]);
          setUnreadCount(prev => (chatOpen ? 0 : prev + 1));
        },
      );
      engineRef.current = engine;
      engine.start();
      setCollabEnabled(true);
      setChatOpen(true);
      setUnreadCount(0);
      // Show join banners for each user with slight delay
      setTimeout(() => {
        engine.getUsers().forEach((u, i) => {
          setTimeout(() => {
            setJoinBanners(prev => [...prev, u]);
          }, i * 1200);
        });
      }, 400);
    }
  }, [collabEnabled, chatOpen]);

  const handlePassNode = useCallback((targetUserId: string) => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;
    engineRef.current?.receiveNode(targetUserId, node.label);
    const target = collabUsers.find(u => u.id === targetUserId);
    setCollabMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      userId: 'system', userName: 'System', userColor: '#94A3B8',
      text: `You passed "${node.label}" to ${target?.name ?? targetUserId}`,
      timestamp: new Date(), isSystem: true,
    }]);
  }, [selectedNodeId, nodes, collabUsers]);

  const handleSendMessage = useCallback((text: string) => {
    setCollabMessages(prev => [...prev, {
      id: `me-${Date.now()}`,
      userId: 'me', userName: 'You', userColor: '#10B981',
      text, timestamp: new Date(), isMe: true,
    }]);
  }, []);

  // Reset unread when chat opens
  useEffect(() => { if (chatOpen) setUnreadCount(0); }, [chatOpen]);

  // Trigger engine events on network mutations
  const collabTrigger = useCallback((evt: Parameters<CollabEngine['triggerEvent']>[0]) => {
    engineRef.current?.triggerEvent(evt);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { engineRef.current?.stop(); }, []);

  // ── Forward Propagation ────────────────────────────────────────────────────
  const [fwdOpen,      setFwdOpen]      = useState(false);
  const [fwdSpeed,     setFwdSpeed]     = useState(600);
  const [fwdInputs,    setFwdInputs]    = useState<number[]>([0.7, 0.3]);
  const [fwdResult,    setFwdResult]    = useState<ForwardPassResult | null>(null);
  const [fwdPropState, setFwdPropState] = useState<FwdPropState | null>(null);

  const fwdSpeedRef    = useRef(600);
  const fwdStepRef     = useRef(0);
  const fwdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fwdTimelineRef = useRef<{ type: 'node'|'conn'; ids: string[] }[]>([]);
  const advanceStepRef = useRef<() => void>(() => {});

  useEffect(() => { fwdSpeedRef.current = fwdSpeed; }, [fwdSpeed]);

  useEffect(() => {
    advanceStepRef.current = () => {
      const idx = fwdStepRef.current;
      const timeline = fwdTimelineRef.current;
      if (idx >= timeline.length) {
        setFwdPropState(prev => {
          if (!prev) return prev;
          const allNodeIds = timeline.filter(s => s.type === 'node').flatMap(s => s.ids);
          const allConnIds = timeline.filter(s => s.type === 'conn').flatMap(s => s.ids);
          return { ...prev, isRunning: false, isComplete: true, waveNodeIds: [], waveConnIds: [], doneNodeIds: allNodeIds, doneConnIds: allConnIds };
        });
        return;
      }
      const step = timeline[idx];
      fwdStepRef.current = idx + 1;
      if (step.type === 'node') {
        setFwdPropState(prev => {
          if (!prev) return prev;
          const done = [...prev.doneNodeIds, ...prev.waveNodeIds];
          return { ...prev, currentLayerIdx: prev.currentLayerIdx + 1, waveNodeIds: step.ids, doneNodeIds: done };
        });
        fwdTimerRef.current = setTimeout(advanceStepRef.current, fwdSpeedRef.current);
      } else {
        setFwdPropState(prev => {
          if (!prev) return prev;
          const done = [...prev.doneConnIds, ...prev.waveConnIds];
          return { ...prev, waveConnIds: step.ids, doneConnIds: done };
        });
        fwdTimerRef.current = setTimeout(advanceStepRef.current, fwdSpeedRef.current * 0.55);
      }
    };
  });

  const stopFwdTimers = useCallback(() => {
    if (fwdTimerRef.current) { clearTimeout(fwdTimerRef.current); fwdTimerRef.current = null; }
  }, []);

  const handleRunForwardPass = useCallback((inputs: number[]) => {
    stopFwdTimers();
    const validation = validateNetwork(nodes, connections);
    if (!validation.valid) {
      setFwdPropState(prev => ({
        ...(prev ?? { isRunning:false, isComplete:false, currentLayerIdx:-1, totalLayers:0, result:null, waveNodeIds:[], doneNodeIds:[], waveConnIds:[], doneConnIds:[], warning:null }),
        error: validation.error ?? null,
      }));
      return;
    }
    const result = computeForwardPass(nodes, connections, inputs);
    setFwdResult(result);
    const timeline: { type: 'node'|'conn'; ids: string[] }[] = [];
    for (let li = 0; li < result.layers.length; li++) {
      timeline.push({ type: 'node', ids: result.layers[li] });
      if (li < result.layers.length - 1) {
        const nextLayer = new Set(result.layers[li + 1]);
        const curLayer  = new Set(result.layers[li]);
        const connIds = connections
          .filter(c => curLayer.has(c.fromId) && nextLayer.has(c.toId) && c.active !== false)
          .map(c => c.id);
        if (connIds.length) timeline.push({ type: 'conn', ids: connIds });
      }
    }
    fwdTimelineRef.current = timeline;
    fwdStepRef.current = 0;
    setFwdPropState({
      isRunning: true, isComplete: false, currentLayerIdx: -1,
      totalLayers: result.layers.length, result,
      waveNodeIds: [], doneNodeIds: [], waveConnIds: [], doneConnIds: [],
      error: null, warning: validation.warning ?? null,
    });
    fwdTimerRef.current = setTimeout(advanceStepRef.current, 80);
    collabTrigger('forward_pass');
  }, [nodes, connections, stopFwdTimers, collabTrigger]);

  const handleStepForwardPass = useCallback(() => {
    stopFwdTimers();
    if (!fwdPropState || !fwdResult) return;
    advanceStepRef.current();
  }, [fwdPropState, fwdResult, stopFwdTimers]);

  const handleResetForwardPass = useCallback(() => {
    stopFwdTimers();
    setFwdPropState(null);
    setFwdResult(null);
    fwdStepRef.current = 0;
    fwdTimelineRef.current = [];
  }, [stopFwdTimers]);

  useEffect(() => () => stopFwdTimers(), [stopFwdTimers]);

  // ── Training ───────────────────────────────────────────────────────────────
  const [trainOpen,       setTrainOpen]       = useState(false);
  const [showOverfitWarn, setShowOverfitWarn] = useState(false);
  const [overfitReason,   setOverfitReason]   = useState('');
  const [trainAnimState,  setTrainAnimState]  = useState<TrainAnimState | null>(null);

  const trainTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trainEpochIdxRef   = useRef(0);
  const allEpochResultsRef = useRef<EpochResult[]>([]);
  const pendingTrainRef    = useRef<{ data: DataPoint[]; epochs: number; lr: number; speed: number } | null>(null);
  const trainSpeedRef      = useRef(450);
  const animateEpochRef    = useRef<() => void>(() => {});

  const stopTrainTimers = useCallback(() => {
    if (trainTimerRef.current) { clearTimeout(trainTimerRef.current); trainTimerRef.current = null; }
  }, []);

  useEffect(() => {
    animateEpochRef.current = () => {
      const idx     = trainEpochIdxRef.current;
      const results = allEpochResultsRef.current;
      const spd     = trainSpeedRef.current;
      if (idx >= results.length) {
        const final = results[results.length - 1];
        if (final) setConnections(prev => prev.map(c => ({ ...c, weight: final.weightUpdates[c.id] ?? c.weight })));
        setTrainAnimState(prev => prev ? { ...prev, isRunning: false, isComplete: true, phase: 'idle', trainActiveConnIds: [] } : null);
        return;
      }
      const result = results[idx];
      const activeConns = Object.keys(result.weightUpdates).filter(id => Math.abs(result.weightDeltas[id] ?? 0) > 0.0001);
      trainEpochIdxRef.current = idx + 1;
      setTrainAnimState(prev => prev ? { ...prev, phase: 'forward', trainActiveConnIds: activeConns } : null);
      trainTimerRef.current = setTimeout(() => {
        setTrainAnimState(prev => prev ? { ...prev, phase: 'backprop' } : null);
        trainTimerRef.current = setTimeout(() => {
          setConnections(prev => prev.map(c => ({ ...c, weight: result.weightUpdates[c.id] ?? c.weight })));
          setTrainAnimState(prev => prev ? {
            ...prev, phase: 'update',
            currentEpoch: result.epoch, currentLoss: result.loss, currentAccuracy: result.accuracy,
            history: [...prev.history, { epoch: result.epoch, loss: result.loss, accuracy: result.accuracy }],
            weightDeltas: result.weightDeltas,
          } : null);
          trainTimerRef.current = setTimeout(() => {
            setTrainAnimState(prev => prev ? { ...prev, phase: 'idle', weightDeltas: {} } : null);
            if (spd > 0) trainTimerRef.current = setTimeout(animateEpochRef.current, 30);
            else animateEpochRef.current();
          }, Math.round(spd * 0.4));
        }, Math.round(spd * 0.3));
      }, Math.round(spd * 0.3));
    };
  });

  const startTraining = useCallback((data: DataPoint[], totalEpochs: number, lr: number, speed: number) => {
    stopTrainTimers();
    const validation = validateNetwork(nodes, connections);
    if (!validation.valid) {
      setTrainAnimState(prev => ({
        ...(prev ?? { isRunning:false, isComplete:false, currentEpoch:0, totalEpochs, history:[], currentLoss:0.693, currentAccuracy:0.5, phase:'idle' as const, weightDeltas:{}, warning:null }),
        error: validation.error ?? 'Network is invalid.',
      }));
      return;
    }
    const results = trainEpochs(nodes, connections, data, totalEpochs, lr);
    allEpochResultsRef.current = results;
    trainEpochIdxRef.current   = 0;
    trainSpeedRef.current      = speed;
    setTrainAnimState({ isRunning:true, isComplete:false, currentEpoch:0, totalEpochs, history:[], currentLoss:0.693, currentAccuracy:0.5, phase:'idle', weightDeltas:{}, error:null, warning: validation.warning ?? null });
    trainTimerRef.current = setTimeout(animateEpochRef.current, speed > 0 ? 80 : 0);
    collabTrigger('training_started');
  }, [nodes, connections, stopTrainTimers, collabTrigger]);

  const handleTrainModel = useCallback((data: DataPoint[], epochs: number, lr: number, speed: number) => {
    const risk = detectOverfitRisk(nodes, data);
    if (risk.risk) { pendingTrainRef.current = { data, epochs, lr, speed }; setOverfitReason(risk.reason ?? ''); setShowOverfitWarn(true); return; }
    startTraining(data, epochs, lr, speed);
  }, [nodes, startTraining]);

  const handleTrainStop  = useCallback(() => { stopTrainTimers(); setTrainAnimState(prev => prev ? { ...prev, isRunning:false, phase:'idle' } : null); }, [stopTrainTimers]);
  const handleTrainReset = useCallback(() => { stopTrainTimers(); setTrainAnimState(null); allEpochResultsRef.current = []; trainEpochIdxRef.current = 0; }, [stopTrainTimers]);

  useEffect(() => () => stopTrainTimers(), [stopTrainTimers]);

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  type Snap = { nodes: NetworkNode[]; connections: NetworkConnection[] };
  const [undoStack, setUndoStack] = useState<Snap[]>([]);
  const [redoStack, setRedoStack] = useState<Snap[]>([]);
  const pushHistory = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-49), { nodes, connections }]);
    setRedoStack([]);
  }, [nodes, connections]);

  const handleAddDropoutAndTrain = useCallback(() => {
    setShowOverfitWarn(false);
    const denseNodes = nodes.filter(n => n.type === 'dense');
    if (denseNodes.length > 0) {
      pushHistory();
      const nn: NetworkNode[] = [];
      const nc: NetworkConnection[] = [];
      denseNodes.forEach((dn, i) => {
        const id = `auto-drop-${i}-${Date.now()}`;
        nn.push({ id, type:'dropout', x: dn.x+200, y: dn.y, label:'Dropout 0.3', config:{ dropoutRate:0.3 } });
        nc.push({ id:`auto-dc-${i}-${Date.now()}`, fromId: dn.id, toId: id, weight:0.5, active:true });
      });
      setNodes(prev => [...prev, ...nn]);
      setConnections(prev => [...prev, ...nc]);
    }
    if (pendingTrainRef.current) {
      const { data, epochs, lr, speed } = pendingTrainRef.current;
      pendingTrainRef.current = null;
      setTimeout(() => startTraining(data, epochs, lr, speed), 100);
    }
  }, [nodes, pushHistory, startTraining]);

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, { nodes, connections }]);
    setUndoStack(u => u.slice(0, -1));
    setNodes(prev.nodes); setConnections(prev.connections);
    setSelectedNodeId(null); setConnectingFrom(null);
  }, [undoStack, nodes, connections]);

  const handleRedo = useCallback(() => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, { nodes, connections }]);
    setRedoStack(r => r.slice(0, -1));
    setNodes(next.nodes); setConnections(next.connections);
    setSelectedNodeId(null); setConnectingFrom(null);
  }, [redoStack, nodes, connections]);

  // ── Simulation loop ────────────────────────────────────────────────────────
  const animRef        = useRef<number>(0);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpawnRef   = useRef<number>(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

      if (e.key === 'Escape') { setConnectingFrom(null); setSelectedNodeId(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !inInput) handleDeleteNode(selectedNodeId);

      // Note: Spacebar is no longer a simulation shortcut here.
      // It is now the Hand Tool handled entirely inside NetworkCanvas.tsx.

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !inInput) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y') && !inInput) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodeId && !inInput) { e.preventDefault(); handleDuplicateNode(selectedNodeId); }

      // ── Simulation keyboard shortcuts (T / R) ──────────────────────────────
      // Guard: skip if Ctrl/Meta is held (to avoid clashing with browser combos)
      //        and skip when typing in any input/select/textarea.
      const noMod = !e.ctrlKey && !e.metaKey && !e.altKey;

      // T → toggle Training panel  (same as clicking "Train Model" button)
      if ((e.key === 't' || e.key === 'T') && noMod && !inInput) {
        e.preventDefault();
        setTrainOpen(v => !v);
      }

      // R → toggle Forward-Prop panel  (same as clicking "Run Simulation" button)
      if ((e.key === 'r' || e.key === 'R') && noMod && !inInput) {
        e.preventDefault();
        setFwdOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedNodeId, undoStack, redoStack]);

  useEffect(() => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    if (simulation.isRunning && !simulation.isPaused) {
      simIntervalRef.current = setInterval(() => {
        setSimulation(prev => {
          if (!prev.isRunning || prev.isPaused) return prev;
          const ne = prev.epoch + 1;
          if (ne > prev.totalEpochs) return { ...prev, isRunning:false, epoch: prev.totalEpochs };
          const t = ne / prev.totalEpochs;
          const noise = () => (Math.random() - 0.5) * 0.025;
          const loss = Math.max(0.03, 0.68 * Math.exp(-3.8*t) + 0.04 + noise());
          const accuracy = Math.min(0.992, 0.5 + 0.49*(1 - Math.exp(-4*t)) + noise());
          return { ...prev, epoch:ne, loss, accuracy, history:[...prev.history,{epoch:ne,loss,accuracy}].slice(-80) };
        });
      }, 1000 / simulation.speed);
    }
    return () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current); };
  }, [simulation.isRunning, simulation.isPaused, simulation.speed]);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    if (!simulation.isRunning || simulation.isPaused || !connections.length) { setParticles([]); return; }
    const animate = (time: number) => {
      setParticles(prev => {
        const updated = prev.map(p => ({ ...p, progress: p.progress + p.speed * simulation.speed })).filter(p => p.progress < 1);
        if (time - lastSpawnRef.current > 120/simulation.speed && connections.length) {
          lastSpawnRef.current = time;
          const conn = connections[Math.floor(Math.random()*connections.length)];
          return [...updated, { id:`p${Date.now()}-${Math.random()}`, connectionId:conn.id, progress:0, speed: 0.006+Math.random()*0.004 }];
        }
        return updated;
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [simulation.isRunning, simulation.isPaused, simulation.speed, connections]);

  const handleStart = useCallback(() => {
    if (!nodes.length) return;
    setSimulation(prev => {
      const isResume = prev.isPaused || (prev.epoch > 0 && prev.epoch < prev.totalEpochs);
      return { ...prev, isRunning:true, isPaused:false, epoch: isResume?prev.epoch:0, loss: isResume?prev.loss:0.693, accuracy: isResume?prev.accuracy:0.5, history: isResume?prev.history:[] };
    });
  }, [nodes.length]);
  const handlePause = useCallback(() => setSimulation(prev => ({ ...prev, isPaused:true })), []);
  const handleStop  = useCallback(() => { setSimulation(prev => ({ ...prev, isRunning:false, isPaused:false })); setParticles([]); }, []);
  const handleStep  = useCallback(() => {
    setSimulation(prev => {
      if (prev.epoch >= prev.totalEpochs) return prev;
      const ne = prev.epoch+1;
      const t  = ne/prev.totalEpochs;
      const noise = () => (Math.random()-0.5)*0.025;
      const loss = Math.max(0.03, 0.68*Math.exp(-3.8*t)+0.04+noise());
      const accuracy = Math.min(0.992, 0.5+0.49*(1-Math.exp(-4*t))+noise());
      return { ...prev, epoch:ne, loss, accuracy, history:[...prev.history,{epoch:ne,loss,accuracy}].slice(-80) };
    });
  }, []);
  const handleSpeedChange  = useCallback((speed: number) => setSimulation(prev => ({ ...prev, speed })), []);
  const handleEpochsChange = useCallback((totalEpochs: number) => setSimulation(prev => ({ ...prev, totalEpochs })), []);

  // ── Node management ────────────────────────────────────────────────────────
  const handleDropNewNode = useCallback((type: NodeType, label: string, config: NodeConfig, x: number, y: number) => {
    pushHistory();
    const n: NetworkNode = { id: newNodeId(), type, x, y, label, config };
    setNodes(prev => [...prev, n]);
    setSelectedNodeId(n.id);
    collabTrigger('node_added');
  }, [pushHistory, collabTrigger]);

  const handleDeleteNode = useCallback((id: string) => {
    pushHistory();
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    setSelectedNodeId(null);
    collabTrigger('node_deleted');
  }, [pushHistory, collabTrigger]);

  const handleConfigChange = useCallback((id: string, config: Partial<NodeConfig>) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const newLabel = (n.type === 'activation' && config.activationFn) ? config.activationFn : n.label;
      return { ...n, config: { ...n.config, ...config }, label: newLabel };
    }));
  }, []);

  const handleConnectionCreate = useCallback((fromId: string, toId: string) => {
    pushHistory();
    setConnections(prev => [...prev, { id: newConnId(), fromId, toId, weight:0.5, active:true }]);
    collabTrigger('connection_made');
  }, [pushHistory, collabTrigger]);

  const handleConnectionDelete      = useCallback((id: string) => { pushHistory(); setConnections(prev => prev.filter(c => c.id !== id)); }, [pushHistory]);
  const handleConnectionWeightChange = useCallback((id: string, weight: number) => { pushHistory(); setConnections(prev => prev.map(c => c.id === id ? { ...c, weight } : c)); }, [pushHistory]);
  const handleConnectionActiveToggle = useCallback((id: string) => { pushHistory(); setConnections(prev => prev.map(c => c.id === id ? { ...c, active: !(c.active !== false) } : c)); }, [pushHistory]);

  const handleClearCanvas = useCallback(() => {
    if (!nodes.length) return;
    if (window.confirm('Clear all nodes and connections?')) {
      setNodes([]); setConnections([]); setSelectedNodeId(null); setConnectingFrom(null); handleStop();
    }
  }, [nodes.length, handleStop]);

  const handleLoadExample = useCallback((example: 'mnist'|'binary'|'conv') => {
    handleStop(); setSelectedNodeId(null); setConnectingFrom(null);
    if (example === 'mnist') { setNodes(INITIAL_NODES); setConnections(INITIAL_CONNECTIONS); }
    else if (example === 'binary') {
      setNodes([
        { id:'b1',type:'input',x:80,y:240,label:'Input',config:{inputShape:'30'} },
        { id:'b2',type:'dense',x:340,y:240,label:'Dense 16',config:{neurons:16} },
        { id:'b3',type:'activation',x:600,y:250,label:'ReLU',config:{activationFn:'ReLU'} },
        { id:'b4',type:'dense',x:840,y:240,label:'Dense 8',config:{neurons:8} },
        { id:'b5',type:'activation',x:1100,y:250,label:'Sigmoid',config:{activationFn:'Sigmoid'} },
        { id:'b6',type:'output',x:1360,y:240,label:'Output',config:{outputShape:'1'} },
      ]);
      setConnections([{id:'bc1',fromId:'b1',toId:'b2'},{id:'bc2',fromId:'b2',toId:'b3'},{id:'bc3',fromId:'b3',toId:'b4'},{id:'bc4',fromId:'b4',toId:'b5'},{id:'bc5',fromId:'b5',toId:'b6'}]);
    } else {
      setNodes([
        { id:'v1',type:'input',x:80,y:200,label:'Image Input',config:{inputShape:'28×28×1'} },
        { id:'v2',type:'conv2d',x:340,y:200,label:'Conv2D 32',config:{filters:32,kernelSize:3} },
        { id:'v3',type:'activation',x:600,y:210,label:'ReLU',config:{activationFn:'ReLU'} },
        { id:'v4',type:'conv2d',x:840,y:200,label:'Conv2D 64',config:{filters:64,kernelSize:3} },
        { id:'v5',type:'activation',x:1100,y:210,label:'ReLU',config:{activationFn:'ReLU'} },
        { id:'v6',type:'flatten',x:1340,y:210,label:'Flatten',config:{} },
        { id:'v7',type:'dense',x:1580,y:200,label:'Dense 128',config:{neurons:128} },
        { id:'v8',type:'output',x:1840,y:200,label:'Output',config:{outputShape:'10'} },
      ]);
      setConnections([{id:'vc1',fromId:'v1',toId:'v2'},{id:'vc2',fromId:'v2',toId:'v3'},{id:'vc3',fromId:'v3',toId:'v4'},{id:'vc4',fromId:'v4',toId:'v5'},{id:'vc5',fromId:'v5',toId:'v6'},{id:'vc6',fromId:'v6',toId:'v7'},{id:'vc7',fromId:'v7',toId:'v8'}]);
    }
    setSimulation({ ...INITIAL_SIMULATION });
  }, [handleStop]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, connections })); } catch {}
  }, [nodes, connections]);

  const handleDuplicateNode = useCallback((id: string) => {
    const src = nodes.find(n => n.id === id);
    if (!src) return;
    pushHistory();
    const n = { ...src, id: newNodeId(), x: src.x+20, y: src.y+20 };
    setNodes(prev => [...prev, n]);
    setSelectedNodeId(n.id);
  }, [nodes, pushHistory]);

  const handleNodeDragStart   = useCallback(() => pushHistory(), [pushHistory]);
  const handleResizeNodeStart = useCallback(() => pushHistory(), [pushHistory]);

  // ── AI Optimize ────────────────────────────────────────────────────────────
  const handleApplySuggestion = useCallback((s: AISuggestion) => {
    if (!s.action || s.action.type === 'none') return;
    pushHistory();
    const { type, payload } = s.action;
    const sorted = [...nodes].sort((a, b) => a.x - b.x);

    if (type === 'update_config') {
      const { targetNodeId, configUpdate } = payload;
      if (targetNodeId && configUpdate)
        setNodes(prev => prev.map(n => n.id === targetNodeId ? { ...n, config:{ ...n.config, ...configUpdate as Partial<NodeConfig> } } : n));
      return;
    }
    if (type === 'insert_between') {
      const { fromNodeId, toNodeId, nodeType, nodeLabel, nodeConfig } = payload;
      if (!fromNodeId || !toNodeId || !nodeType) return;
      const fn = nodes.find(n => n.id === fromNodeId);
      const tn = nodes.find(n => n.id === toNodeId);
      if (!fn || !tn) return;
      const ec = connections.find(c => c.fromId === fromNodeId && c.toId === toNodeId);
      const nid = newNodeId();
      setNodes(prev => [...prev, { id:nid, type:nodeType as NodeType, x:Math.round((fn.x+tn.x)/2), y:Math.round((fn.y+tn.y)/2), label:nodeLabel??nodeType, config:(nodeConfig??{}) as NodeConfig }]);
      setConnections(prev => [...(ec ? prev.filter(c=>c.id!==ec.id) : prev), { id:newConnId(),fromId:fromNodeId,toId:nid,weight:0.5,active:true }, { id:newConnId(),fromId:nid,toId:toNodeId,weight:0.5,active:true }]);
      return;
    }
    if (type === 'append_after') {
      const { anchorNodeId, nodeType, nodeLabel, nodeConfig } = payload;
      if (!nodeType) return;
      const anchor = anchorNodeId ? nodes.find(n=>n.id===anchorNodeId) : sorted[sorted.length-1];
      const nid = newNodeId();
      const newN: NetworkNode = { id:nid, type:nodeType as NodeType, x:anchor?anchor.x+240:400, y:anchor?.y??240, label:nodeLabel??nodeType, config:(nodeConfig??{}) as NodeConfig };
      setNodes(prev => [...prev, newN]);
      if (anchor) {
        const oc = connections.find(c=>c.fromId===anchor.id);
        if (oc) setConnections(prev => [...prev.filter(c=>c.id!==oc.id), { id:newConnId(),fromId:anchor.id,toId:nid,weight:0.5,active:true }, { id:newConnId(),fromId:nid,toId:oc.toId,weight:0.5,active:true }]);
        else     setConnections(prev => [...prev, { id:newConnId(),fromId:anchor.id,toId:nid,weight:0.5,active:true }]);
      }
      return;
    }
    if (type === 'prepend_before') {
      const { anchorNodeId, nodeType, nodeLabel, nodeConfig } = payload;
      if (!nodeType) return;
      const anchor = anchorNodeId ? nodes.find(n=>n.id===anchorNodeId) : sorted[0];
      const nid = newNodeId();
      const newN: NetworkNode = { id:nid, type:nodeType as NodeType, x:anchor?anchor.x-240:80, y:anchor?.y??240, label:nodeLabel??nodeType, config:(nodeConfig??{}) as NodeConfig };
      setNodes(prev => [...prev, newN]);
      if (anchor) {
        const oc = connections.find(c=>c.toId===anchor.id);
        if (oc) setConnections(prev => [...prev.filter(c=>c.id!==oc.id), { id:newConnId(),fromId:oc.fromId,toId:nid,weight:0.5,active:true }, { id:newConnId(),fromId:nid,toId:anchor.id,weight:0.5,active:true }]);
        else     setConnections(prev => [...prev, { id:newConnId(),fromId:nid,toId:anchor.id,weight:0.5,active:true }]);
      }
    }
  }, [nodes, connections, pushHistory]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null;

  // ── Dark mode + responsive sidebar ────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('nf-dark') === '1'; } catch { return false; }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleDark = useCallback(() => {
    setIsDark(d => {
      const next = !d;
      try { localStorage.setItem('nf-dark', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // ── Welcome dismiss (marks onboarded in localStorage) ─────────────────────
  const handleDismissWelcome = useCallback(() => {
    try { localStorage.setItem('omnimind-onboarded', '1'); } catch {}
    setShowWelcome(false);
  }, []);

  // ── Load demo network ─────────────────────────────────────────────────────
  const handleLoadDemo = useCallback((id: DemoNetwork['id']) => {
    const demo = DEMO_NETWORKS.find(d => d.id === id);
    if (!demo) return;
    handleStop();
    setSelectedNodeId(null);
    setConnectingFrom(null);
    setNodes(demo.nodes);
    setConnections(demo.connections);
    setSimulation({ ...INITIAL_SIMULATION });
    setTrainAnimState(null);
    setFwdPropState(null);
    setFwdResult(null);
    setShowDashboard(false);
    try { localStorage.setItem('omnimind-onboarded', '1'); } catch {}
  }, [handleStop]);

  // ── Export model as JSON ──────────────────────────────────────────────────
  const handleExportModel = useCallback(() => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const model = {
      name: 'Omnimind Model',
      exportedAt: new Date().toISOString(),
      version: '1.0',
      layers: nodes.map((n, i) => ({
        index: i, id: n.id, type: n.type, label: n.label,
        position: { x: n.x, y: n.y },
        size: n.w ? { w: n.w, h: n.h } : undefined,
        config: n.config,
      })),
      connections: connections.map(c => ({
        id: c.id, from: c.fromId, to: c.toId,
        weight: c.weight ?? 0.5, active: c.active !== false,
      })),
      training: trainAnimState?.isComplete ? {
        epochs: trainAnimState.totalEpochs,
        finalLoss: trainAnimState.currentLoss,
        finalAccuracy: trainAnimState.currentAccuracy,
        history: trainAnimState.history,
      } : null,
      forwardPass: fwdResult ? {
        outputValues: fwdResult.outputValues,
        outputNodeIds: fwdResult.outputNodeIds,
        nodeActivations: fwdResult.nodeActivations,
      } : null,
    };
    try {
      const json = JSON.stringify(model, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `omnimind_model_${ts}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error('Export failed:', err); }
  }, [nodes, connections, trainAnimState, fwdResult]);

  // ── Auto-open Results Dashboard on completion ─────────────────────────────
  const prevTrainComplete = useRef(false);
  const prevFwdComplete   = useRef(false);

  useEffect(() => {
    const nowComplete = trainAnimState?.isComplete ?? false;
    if (nowComplete && !prevTrainComplete.current) {
      setTimeout(() => setShowDashboard(true), 800);
    }
    prevTrainComplete.current = nowComplete;
  }, [trainAnimState?.isComplete]);

  useEffect(() => {
    const nowComplete = fwdPropState?.isComplete ?? false;
    if (nowComplete && !prevFwdComplete.current) {
      setTimeout(() => setShowDashboard(true), 600);
    }
    prevFwdComplete.current = nowComplete;
  }, [fwdPropState?.isComplete]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col h-screen overflow-hidden ${isDark ? 'dark' : ''}`}
      style={{ background: isDark ? '#0C1220' : '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ── Header ── */}
      <header
        role="banner"
        className="h-14 flex items-center px-4 gap-2.5 flex-shrink-0 z-50"
        style={{
          background:'linear-gradient(135deg, #0F766E 0%, #115E59 60%, #1E40AF 100%)',
          borderBottom:'1px solid rgba(255,255,255,0.10)',
          boxShadow:'0 1px 8px rgba(0,0,0,0.20)',
        }}
      >
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setIsSidebarOpen(v => !v)}
          aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          aria-expanded={isSidebarOpen}
          className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0"
          style={{ border:'1.5px solid rgba(255,255,255,0.22)' }}
        >
          <Menu size={15} />
        </button>

        {/* ── Omnimind Logo (150×50 lockup) ── */}
        <OmnimindLogo
          subtitle="Visual Network Builder"
          onClick={() => setShowWelcome(true)}
          className="mr-1 flex-shrink-0"
        />

        <div className="h-7 w-px bg-white/15 hidden sm:block flex-shrink-0" aria-hidden="true" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 flex-shrink-0" role="group" aria-label="History">
          <IconButton
            variant="ghost-header" size="sm"
            onClick={handleUndo} disabled={!undoStack.length}
            aria-label={`Undo${undoStack.length ? ` (${undoStack.length})` : ''}`}
            title="Undo (Ctrl+Z)"
          ><Undo2 size={13} /></IconButton>
          <IconButton
            variant="ghost-header" size="sm"
            onClick={handleRedo} disabled={!redoStack.length}
            aria-label="Redo (Ctrl+Shift+Z)" title="Redo"
          ><Redo2 size={13} /></IconButton>
          {undoStack.length > 0 && <span className="text-[9.5px] text-teal-200/70 ml-0.5 tabular-nums">{undoStack.length}</span>}
        </div>

        <div className="h-7 w-px bg-white/15 hidden md:block flex-shrink-0" aria-hidden="true" />

        {/* Templates */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0" role="group" aria-label="Example templates">
          <span className="text-[10px] text-teal-200/70 mr-0.5 font-medium uppercase tracking-wide">Templates</span>
          {([
            { id:'mnist',  label:'MNIST' },
            { id:'binary', label:'Binary' },
            { id:'conv',   label:'ConvNet' },
          ] as const).map(t => (
            <IconButton
              key={t.id}
              variant="ghost-header" size="pill-xs"
              onClick={() => handleLoadExample(t.id)}
              aria-label={`Load ${t.label} template`}
            >{t.label}</IconButton>
          ))}
        </div>

        <div className="flex-1" aria-hidden="true" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* AI Optimize — amber accent */}
          <IconButton
            variant={showAIOptimize ? 'amber' : 'ghost-amber'}
            size="pill-sm"
            onClick={() => setShowAIOptimize(v => !v)}
            isActive={showAIOptimize}
            isAnimating={showAIOptimize}
            animationType="fire"
            aria-label="AI Optimize"
            aria-pressed={showAIOptimize}
            title="AI Optimize"
            statusLabel={showAIOptimize ? 'Active' : undefined}
            icon={<Wand2 size={12} />}
          >
            <span className="hidden sm:inline">AI Optimize</span>
          </IconButton>

          {/* Multiplayer — teal secondary */}
          {collabEnabled ? (
            <div role="group" aria-label="Live session"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{ background:'rgba(0,0,0,0.25)', border:'1.5px solid rgba(255,255,255,0.15)' }}>
              <div className="flex -space-x-1.5">
                <div title="You" className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 bg-teal-500" style={{ borderColor:'rgba(0,0,0,0.3)' }}>Me</div>
                {collabUsers.map(u => (
                  <div key={u.id} title={u.name} className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ background: u.color, borderColor:'rgba(0,0,0,0.3)' }}>{u.initials}</div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 om-status-dot om-status-dot--live" aria-hidden="true" />
                <span className="text-[9.5px] font-bold text-amber-300">LIVE</span>
              </div>
              <IconButton
                variant="ghost-header" size="xs"
                onClick={() => { setChatOpen(v => !v); setUnreadCount(0); }}
                aria-label={`Chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-pressed={chatOpen}
                isAnimating={unreadCount > 0}
                animationType="breathe"
                className="relative"
              >
                <MessageCircle size={11} />
                {unreadCount > 0 && <span aria-hidden="true" className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border border-black/20 flex items-center justify-center text-[7px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </IconButton>
              <button onClick={handleToggleCollab} aria-label="Leave session"
                className="text-[9px] font-semibold text-white/50 hover:text-red-300 transition-colors px-0.5">Leave</button>
            </div>
          ) : (
            <IconButton
              variant="ghost-teal" size="pill-sm"
              onClick={handleToggleCollab}
              aria-label="Start multiplayer session" title="Multiplayer"
              icon={<Radio size={12} />}
            >
              <span className="hidden sm:inline">Multiplayer</span>
            </IconButton>
          )}

          {/* Results Dashboard toggle */}
          <IconButton
            variant={showDashboard ? 'amber' : 'ghost-header'}
            size="pill-sm"
            onClick={() => setShowDashboard(v => !v)}
            isActive={showDashboard}
            aria-label="Results Dashboard" aria-pressed={showDashboard}
            title="Results Dashboard"
            icon={<BarChart2 size={12} />}
          >
            <span className="hidden sm:inline">Results</span>
          </IconButton>

          {/* Quick Export */}
          <IconButton
            variant="ghost-header" size="sm"
            onClick={handleExportModel}
            aria-label="Export model as JSON"
            title="Export model (JSON)"
            disabled={nodes.length === 0}
          >
            <Download size={13} />
          </IconButton>

          {/* Dark mode toggle */}
          <IconButton
            variant="ghost-header" size="sm"
            onClick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            isAnimating={isDark}
            animationType="breathe"
            style={{ color: isDark ? '#FCD34D' : 'rgba(255,255,255,0.85)' }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </IconButton>

          {/* Model info toggle */}
          <IconButton
            variant="ghost-header" size="sm"
            onClick={() => setShowModelInfo(v => !v)}
            aria-label="Model summary" aria-pressed={showModelInfo} title="Model summary"
            isActive={showModelInfo}
            isAnimating={showModelInfo}
            animationType="breathe"
          >
            <Info size={14} />
          </IconButton>

          {/* Clear canvas */}
          <IconButton
            variant="danger" size="sm"
            onClick={handleClearCanvas}
            aria-label="Clear canvas" title="Clear canvas"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">

        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — fixed drawer on mobile, static panel on desktop */}
        <div
          className={`
            flex-shrink-0 h-full z-50
            ${isSidebarOpen
              ? 'w-[260px] lg:w-[20%] lg:min-w-[220px] lg:max-w-[280px]'
              : 'w-0 overflow-hidden'
            }
            fixed lg:relative top-0 left-0 lg:top-auto lg:left-auto
            transition-all duration-300 ease-in-out
          `}
        >
          <div className="w-[260px] lg:w-full h-full pt-14 lg:pt-0">
            <Sidebar isMobileOpen={isSidebarOpen} onMobileClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>

        {/* Canvas container */}
        <div className="flex-1 h-full overflow-hidden relative bg-[#F3F4F6] dark:bg-[#111827]" ref={canvasContainerRef}>
          <NetworkCanvas
            nodes={nodes}
            connections={connections}
            particles={particles}
            selectedNodeId={selectedNodeId}
            connectingFrom={connectingFrom}
            isSimulating={simulation.isRunning && !simulation.isPaused}
            onNodesChange={setNodes}
            onConnectionCreate={handleConnectionCreate}
            onConnectionDelete={handleConnectionDelete}
            onConnectionWeightChange={handleConnectionWeightChange}
            onConnectionActiveToggle={handleConnectionActiveToggle}
            onSelectNode={setSelectedNodeId}
            onStartConnecting={setConnectingFrom}
            onCancelConnecting={() => setConnectingFrom(null)}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
            onConfigChange={handleConfigChange}
            onDropNewNode={handleDropNewNode}
            onNodeDragStart={handleNodeDragStart}
            onResizeNodeStart={handleResizeNodeStart}
            propNodeActivations={fwdPropState?.result?.nodeActivations}
            propWaveNodeIds={fwdPropState?.waveNodeIds}
            propDoneNodeIds={fwdPropState?.doneNodeIds}
            propWaveConnIds={fwdPropState?.waveConnIds}
            propDoneConnIds={fwdPropState?.doneConnIds}
            trainPhase={trainAnimState?.phase}
            trainActiveConnIds={trainAnimState?.trainActiveConnIds}
            trainWeightDeltas={trainAnimState?.weightDeltas}
            trainGradients={allEpochResultsRef.current[Math.max(0, trainEpochIdxRef.current-1)]?.gradients}
          />

          {/* Forward Prop Panel */}
          <ForwardPropPanel
            nodes={nodes} connections={connections}
            isOpen={fwdOpen} onClose={() => setFwdOpen(false)}
            propState={fwdPropState}
            onRunForwardPass={handleRunForwardPass}
            onStepForwardPass={handleStepForwardPass}
            onResetForwardPass={handleResetForwardPass}
            speed={fwdSpeed} onSpeedChange={s => { setFwdSpeed(s); fwdSpeedRef.current = s; }}
            inputValues={fwdInputs} onInputChange={setFwdInputs}
          />

          {/* Training Panel */}
          <TrainingPanel
            nodes={nodes} connections={connections}
            isOpen={trainOpen} onClose={() => setTrainOpen(false)}
            trainState={trainAnimState}
            onTrain={handleTrainModel} onStop={handleTrainStop} onReset={handleTrainReset}
            onAutoAddDropout={handleAddDropoutAndTrain}
          />

          {/* Model Info */}
          {showModelInfo && (
            <div role="dialog" aria-label="Model summary" aria-modal="true"
              className="absolute top-4 right-4 z-50 nf-animate-in bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-[var(--shadow-xl)] p-4 w-64">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles size={13} className="text-blue-500" aria-hidden="true" /> Model Summary
                </div>
                <button onClick={() => setShowModelInfo(false)} aria-label="Close model summary"
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">×</button>
              </div>
              <div className="space-y-1">
                {nodes.map(node => (
                  <div key={node.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 dark:border-slate-700/40 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{node.label}</div>
                      <div className="text-[9.5px] text-slate-400 dark:text-slate-500 capitalize">{node.type}</div>
                    </div>
                  </div>
                ))}
                {!nodes.length && <p className="text-[11.5px] text-slate-400 dark:text-slate-500 text-center py-5 italic">No layers added yet</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-center">
                <div><div className="text-[20px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">{nodes.length}</div><div className="text-[10px] text-slate-400 dark:text-slate-500">Layers</div></div>
                <div><div className="text-[20px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{connections.length}</div><div className="text-[10px] text-slate-400 dark:text-slate-500">Connections</div></div>
              </div>
            </div>
          )}

          {/* AI Optimize Panel */}
          <AIOptimizePanel
            isOpen={showAIOptimize} nodes={nodes} connections={connections} simulation={simulation}
            onClose={() => setShowAIOptimize(false)} onApplySuggestion={handleApplySuggestion}
          />

          {/* ── Collab overlay: cursors + pass zones ── */}
          {collabEnabled && (
            <CollabOverlay
              users={collabUsers}
              containerRef={canvasContainerRef}
              selectedNodeId={selectedNodeId}
              nodes={nodes}
              onPassNode={handlePassNode}
            />
          )}

          {/* ── Join banners ── */}
          {joinBanners.map((u, i) => (
            <JoinBanner
              key={`${u.id}-${i}`}
              user={u}
              onDone={() => setJoinBanners(prev => {
                const idx = prev.findIndex(x => x.id === u.id);
                return idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev;
              })}
            />
          ))}

          {/* ── Collab chat + users panel ── */}
          {collabEnabled && (
            <CollabPanel
              isOpen={chatOpen}
              users={collabUsers}
              messages={collabMessages}
              unreadCount={unreadCount}
              selectedNode={selectedNode}
              onClose={() => setChatOpen(false)}
              onToggle={() => { setChatOpen(v => !v); setUnreadCount(0); }}
              onSend={handleSendMessage}
              onPass={handlePassNode}
              onLeave={handleToggleCollab}
            />
          )}

          {/* ── Results Dashboard (slides in from right over the canvas) ── */}
          <ResultsDashboard
            isOpen={showDashboard}
            onClose={() => setShowDashboard(false)}
            nodes={nodes}
            connections={connections}
            trainState={trainAnimState}
            fwdResult={fwdResult}
            onExport={handleExportModel}
            isDark={isDark}
          />
        </div>
      </div>

      {/* ── Simulation Bar ── */}
      <SimulationBar
        simulation={simulation}
        onStart={handleStart} onPause={handlePause} onStop={handleStop} onStep={handleStep}
        onSpeedChange={handleSpeedChange} onEpochsChange={handleEpochsChange}
        nodeCount={nodes.length} connectionCount={connections.length}
        onRunForwardPass={() => setFwdOpen(v => !v)}
        fwdPropOpen={fwdOpen} fwdIsRunning={fwdPropState?.isRunning ?? false} fwdIsComplete={fwdPropState?.isComplete ?? false}
        onOpenTraining={() => setTrainOpen(v => !v)}
        trainOpen={trainOpen} trainIsRunning={trainAnimState?.isRunning ?? false} trainIsComplete={trainAnimState?.isComplete ?? false}
      />

      {/* Overfit warning */}
      <OverfitWarningModal
        isOpen={showOverfitWarn} reason={overfitReason}
        onAddDropout={handleAddDropoutAndTrain}
        onContinueAnyway={() => {
          setShowOverfitWarn(false);
          if (pendingTrainRef.current) { const {data,epochs,lr,speed}=pendingTrainRef.current; pendingTrainRef.current=null; startTraining(data,epochs,lr,speed); }
        }}
        onCancel={() => { setShowOverfitWarn(false); pendingTrainRef.current = null; }}
      />

      {/* ── New Welcome Screen ── */}
      <WelcomeScreen
        isOpen={showWelcome}
        onDismiss={handleDismissWelcome}
        onLoadDemo={handleLoadDemo}
        onStartTour={() => setShowTour(true)}
        isDark={isDark}
      />

      {/* ── 3-step Guided Tour ── */}
      <TourOverlay
        isActive={showTour}
        onComplete={() => setShowTour(false)}
        isDark={isDark}
      />
    </div>
  );
}