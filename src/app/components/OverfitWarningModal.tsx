import React from 'react';
import { AlertTriangle, ShieldCheck, Zap, X, ArrowRight } from 'lucide-react';

interface OverfitWarningModalProps {
  isOpen: boolean;
  reason: string;
  onAddDropout: () => void;
  onContinueAnyway: () => void;
  onCancel: () => void;
}

export function OverfitWarningModal({
  isOpen, reason, onAddDropout, onContinueAnyway, onCancel,
}: OverfitWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>

          {/* Icon + title */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={22} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-800">Overfitting Risk Detected</h2>
              <p className="text-[12px] text-slate-500 mt-1">{reason}</p>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <p className="text-[12px] text-amber-800 leading-relaxed">
              <strong>Overfitting</strong> occurs when a model memorises training data instead of
              learning generalizable patterns. It performs perfectly on training data but
              fails on new inputs.
            </p>
          </div>

          {/* Recommendations */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Recommended Fixes
            </p>
            <div className="space-y-2">
              {[
                { icon: '🎲', title: 'Add Dropout layers', desc: 'Randomly deactivate neurons to prevent co-adaptation', action: true },
                { icon: '📏', title: 'Reduce network depth', desc: 'Fewer hidden layers → less capacity to memorise' },
                { icon: '🔁', title: 'Collect more data', desc: 'More samples → harder to memorise the training set' },
                { icon: '📊', title: 'Add Batch Normalization', desc: 'Normalises activations, acts as implicit regularizer' },
              ].map(({ icon, title, desc, action }) => (
                <div
                  key={title}
                  className={`flex items-start gap-3 p-2.5 rounded-lg ${action ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}
                >
                  <span className="text-base flex-shrink-0">{icon}</span>
                  <div>
                    <div className={`text-[12px] font-medium ${action ? 'text-blue-700' : 'text-slate-700'}`}>{title}</div>
                    <div className="text-[11px] text-slate-500">{desc}</div>
                  </div>
                  {action && (
                    <div className="ml-auto flex-shrink-0">
                      <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
                        Auto-fix ✓
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={onAddDropout}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-[12px] font-semibold shadow-sm transition-all"
              style={{ background:'linear-gradient(135deg,#0F766E,#0D9488)', boxShadow:'0 2px 8px rgba(15,118,110,0.35)' }}
            >
              <ShieldCheck size={13} />
              Add Dropout & Train
            </button>
            <button
              onClick={onContinueAnyway}
              className="flex items-center gap-2 px-4 py-2.5 border border-amber-300 bg-amber-50 text-amber-700 rounded-xl text-[12px] font-semibold hover:bg-amber-100 transition-colors"
            >
              <Zap size={12} />
              Train Anyway
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-3">
            Trained weights are automatically saved to localStorage.
          </p>
        </div>
      </div>
    </div>
  );
}
