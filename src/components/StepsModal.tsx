import React from 'react';
import { X, CheckCircle2, ChevronRight, Eye, Plus, Minus } from 'lucide-react';
import { TransformationStep } from '../engine/types';
import { formatProduction } from '../engine/grammarUtils';

interface StepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TransformationStep[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
}

export const StepsModal: React.FC<StepsModalProps> = ({
  isOpen,
  onClose,
  steps,
  currentStepIndex,
  onSelectStep
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              All Transformation Steps ({steps.length})
            </h3>
            <p className="text-xs text-slate-500">
              Select any step to jump directly to that point in the conversion pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Step List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  onSelectStep(idx);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      Step {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {step.stageName}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-bold text-slate-800">
                    {step.title}
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    {step.examinedRule && (
                      <span className="font-mono text-amber-700 font-medium">
                        Examined: {formatProduction(step.examinedRule)}
                      </span>
                    )}
                    {step.addedProductions.length > 0 && (
                      <span className="text-emerald-700 font-medium">
                        +{step.addedProductions.length} rule(s)
                      </span>
                    )}
                    {step.removedProductions.length > 0 && (
                      <span className="text-red-700 font-medium">
                        -{step.removedProductions.length} rule(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <ChevronRight
                    className={`w-4 h-4 ${
                      isCurrent
                        ? 'text-indigo-600 font-bold'
                        : 'text-slate-300 group-hover:text-slate-600'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Current position: Step {currentStepIndex + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
