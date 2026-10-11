import React from 'react';
import { CheckCircle2, ChevronRight, CircleDot } from 'lucide-react';
import { StageId } from '../engine/types';

interface StageConfig {
  id: StageId;
  stageNumber: number;
  label: string;
  shortDesc: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'input',
    stageNumber: 1,
    label: 'CFG Input',
    shortDesc: 'Validation & Baseline'
  },
  {
    id: 'null_elimination',
    stageNumber: 2,
    label: 'Null Elimination',
    shortDesc: 'A → ε removal'
  },
  {
    id: 'unit_elimination',
    stageNumber: 3,
    label: 'Unit Elimination',
    shortDesc: 'A → B closure'
  },
  {
    id: 'useless_elimination',
    stageNumber: 4,
    label: 'Useless Variables',
    shortDesc: 'Generating & Reachable'
  },
  {
    id: 'cnf_conversion',
    stageNumber: 5,
    label: 'CNF Conversion',
    shortDesc: 'Terminals & Binarization'
  }
];

interface ConversionPipelineProps {
  currentStageId: StageId;
  currentStepIndex: number;
  totalSteps: number;
  onSelectStage: (stageId: StageId) => void;
}

export const ConversionPipeline: React.FC<ConversionPipelineProps> = ({
  currentStageId,
  currentStepIndex,
  totalSteps,
  onSelectStage
}) => {
  const currentStageIndex = STAGES.findIndex(s => s.id === currentStageId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Conversion Pipeline
          </span>
          <h3 className="text-sm font-bold text-slate-800">
            Stage {Math.max(1, currentStageIndex + 1)} of 5 &bull; Step {Math.min(totalSteps, currentStepIndex + 1)} of {totalSteps}
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Pipeline Progress:</span>
          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
            {Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%
          </span>
        </div>
      </div>

      {/* Connected Stages Track */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isActive = idx === currentStageIndex;
          const isUpcoming = idx > currentStageIndex;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                  : isCompleted
                  ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70'
                  : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/60 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Stage {stage.stageNumber}
                </span>

                {isCompleted && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                )}
                {isActive && (
                  <CircleDot className="w-4 h-4 text-indigo-600 animate-pulse flex-shrink-0" />
                )}
              </div>

              <div
                className={`text-xs font-bold truncate ${
                  isActive
                    ? 'text-indigo-900'
                    : isCompleted
                    ? 'text-emerald-900'
                    : 'text-slate-700'
                }`}
              >
                {stage.label}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {stage.shortDesc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
