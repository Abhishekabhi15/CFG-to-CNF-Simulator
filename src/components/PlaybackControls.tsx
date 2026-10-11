import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ListOrdered,
  Sparkles,
  RefreshCw,
  ArrowUpCircle
} from 'lucide-react';

export type PlaybackSpeed = 'slow' | 'normal' | 'fast';

interface PlaybackControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  onRestartStage: () => void;
  onStartAgain: () => void;
  onOpenStepModal: () => void;
  onTryAnotherGrammar: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  speed,
  onPrevious,
  onNext,
  onTogglePlay,
  onChangeSpeed,
  onRestartStage,
  onStartAgain,
  onOpenStepModal,
  onTryAnotherGrammar
}) => {
  const isFirst = currentStepIndex <= 0;
  const isLast = currentStepIndex >= totalSteps - 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Core Navigation (Previous, Play/Pause, Next) */}
        <div className="flex items-center space-x-2">
          {/* Previous */}
          <button
            type="button"
            onClick={onPrevious}
            disabled={isFirst}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Transformation Step"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Play / Pause Primary Action */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={isLast && !isPlaying}
            className={`flex items-center justify-center space-x-2 px-5 h-10 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Play Simulation</span>
              </>
            )}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={onNext}
            disabled={isLast}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Transformation Step"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Step indicator */}
          <span className="text-xs font-semibold text-slate-500 pl-2">
            {currentStepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/70 self-start lg:self-auto">
          <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">
            Speed:
          </span>
          <button
            type="button"
            onClick={() => onChangeSpeed('slow')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              speed === 'slow'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Slow (2.5s)
          </button>
          <button
            type="button"
            onClick={() => onChangeSpeed('normal')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              speed === 'normal'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Normal (1.5s)
          </button>
          <button
            type="button"
            onClick={() => onChangeSpeed('fast')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              speed === 'fast'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fast (0.75s)
          </button>
        </div>

        {/* Auxiliary Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View All Steps */}
          <button
            type="button"
            onClick={onOpenStepModal}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Browse full steps timeline"
          >
            <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
            <span>All Steps ({totalSteps})</span>
          </button>

          {/* Restart Stage */}
          <button
            type="button"
            onClick={onRestartStage}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Jump to the beginning of current stage"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restart Stage</span>
          </button>

          {/* Start Again */}
          <button
            type="button"
            onClick={onStartAgain}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Rewind to Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Start Again</span>
          </button>

          {/* Try Another Grammar */}
          <button
            type="button"
            onClick={onTryAnotherGrammar}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit / Try Another</span>
          </button>
        </div>
      </div>
    </div>
  );
};
