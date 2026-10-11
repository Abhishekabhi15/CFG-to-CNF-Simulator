import React, { useState } from 'react';
import {
  ArrowRight,
  Plus,
  Minus,
  Target,
  Sparkles,
  Layers,
  ArrowRightLeft,
  Columns3,
  Split,
  Eye
} from 'lucide-react';
import { TransformationStep } from '../engine/types';
import { formatProduction, formatGroupedProductions, formatRhs, groupProductionsByLhs } from '../engine/grammarUtils';

interface TransformationViewerProps {
  step: TransformationStep;
  stepIndex: number;
  totalSteps: number;
}

export const TransformationViewer: React.FC<TransformationViewerProps> = ({
  step,
  stepIndex,
  totalSteps
}) => {
  const [viewMode, setViewMode] = useState<'sideBySide' | 'tabbed'>('sideBySide');
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');

  const {
    title,
    mathGoal,
    explanation,
    examinedRule,
    examinedVariable,
    beforeGrammar,
    afterGrammar,
    addedProductions,
    removedProductions,
    rulesBefore,
    rulesAdded,
    rulesRemoved,
    rulesAfter,
    stageName,
    subStep
  } = step;

  const beforeVarRowCount = groupProductionsByLhs(beforeGrammar.productions).size;
  const afterVarRowCount = groupProductionsByLhs(afterGrammar.productions).size;

  const examinedId = examinedRule ? examinedRule.id : null;
  const removedIds = new Set(removedProductions.map(p => p.id));
  const addedIds = new Set(addedProductions.map(p => p.id));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-700 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
              Step {stepIndex + 1} of {totalSteps}
            </span>
            <span>&bull;</span>
            <span className="text-slate-500 font-medium">{stageName}</span>
            <span>&bull;</span>
            <span className="text-slate-400 font-normal">{subStep}</span>
          </div>
          {/* A. Transformation Heading */}
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('sideBySide')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'sideBySide'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tabbed')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'tabbed'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Tabbed</span>
          </button>
        </div>
      </div>

      {/* B. Mathematical Goal */}
      <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/40 rounded-xl p-4 border border-indigo-100/90 flex items-start space-x-3">
        <div className="p-2 bg-indigo-600 text-white rounded-lg flex-shrink-0 shadow-xs">
          <Target className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-900">
            Mathematical Objective
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            {mathGoal}
          </p>
        </div>
      </div>

      {/* D. Rule Being Examined (if any) */}
      {(examinedRule || examinedVariable) && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              Rule / Symbol Examined:
            </span>
            <span className="font-mono font-bold text-sm bg-white px-3 py-1 rounded-lg border border-amber-200 text-amber-950 shadow-2xs">
              {examinedRule ? formatProduction(examinedRule) : `Variable ${examinedVariable}`}
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium hidden sm:inline">
            Active Target of Transformation
          </span>
        </div>
      )}

      {/* E. Transformation Process (Detailed Explanation) */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Transformation Details &amp; Derivations
        </h4>
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line">
          {explanation}
        </div>
      </div>

      {/* J. Rule Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-xs font-semibold text-slate-500">Rules Before</div>
          <div className="text-xl font-bold text-slate-800 mt-0.5">{rulesBefore}</div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-xs font-semibold text-emerald-700">Rules Added</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">
            {rulesAdded > 0 ? `+${rulesAdded}` : '0'}
          </div>
        </div>

        <div className="bg-red-50/60 border border-red-200 rounded-xl p-3 text-center">
          <div className="text-xs font-semibold text-red-700">Rules Removed</div>
          <div className="text-xl font-bold text-red-700 mt-0.5">
            {rulesRemoved > 0 ? `-${rulesRemoved}` : '0'}
          </div>
        </div>

        <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 text-center">
          <div className="text-xs font-semibold text-indigo-700">Rules After</div>
          <div className="text-xl font-bold text-indigo-900 mt-0.5">{rulesAfter}</div>
        </div>
      </div>

      {/* F & G. Added & Removed Productions Diff Badges */}
      {(addedProductions.length > 0 || removedProductions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Added Productions */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Newly Added Productions ({addedProductions.length})</span>
            </div>
            {addedProductions.length > 0 ? (
              <div className="space-y-1.5">
                {addedProductions.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center space-x-2 bg-emerald-50 border border-emerald-300/80 rounded-lg px-3 py-1.5 font-mono text-xs sm:text-sm font-semibold text-emerald-950"
                  >
                    <span className="text-emerald-600 font-bold">+</span>
                    <span>{formatProduction(p)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic bg-slate-50 rounded-lg p-2.5 border border-slate-200/60">
                No new rules introduced in this step.
              </div>
            )}
          </div>

          {/* Removed Productions */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-red-800 uppercase tracking-wider">
              <Minus className="w-3.5 h-3.5 text-red-600" />
              <span>Removed Productions ({removedProductions.length})</span>
            </div>
            {removedProductions.length > 0 ? (
              <div className="space-y-1.5">
                {removedProductions.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center space-x-2 bg-red-50 border border-red-300/80 rounded-lg px-3 py-1.5 font-mono text-xs sm:text-sm font-semibold text-red-950 line-through decoration-red-600 decoration-2"
                  >
                    <span className="text-red-600 font-bold no-underline">−</span>
                    <span>{formatProduction(p)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic bg-slate-50 rounded-lg p-2.5 border border-slate-200/60">
                No rules eliminated in this step.
              </div>
            )}
          </div>
        </div>
      )}

      {/* C, H, I. Grammar Snapshots: Before State vs After State */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Grammar State Snapshots</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Rules in monospace • Color diffs show changes
          </span>
        </div>

        {viewMode === 'sideBySide' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Before Grammar State */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Before State
                </span>
                <span className="text-xs font-mono font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {beforeVarRowCount} variables &bull; {beforeGrammar.productions.length} productions
                </span>
              </div>
              <div className="p-4 space-y-1 font-mono text-xs sm:text-sm max-h-72 overflow-y-auto">
                {beforeGrammar.productions.length === 0 ? (
                  <span className="text-slate-400 italic">No productions</span>
                ) : (
                  beforeGrammar.productions.map(p => {
                    const isRemoved = removedIds.has(p.id);
                    const isExamined = examinedId === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`px-2 py-1 rounded transition-colors ${
                          isRemoved
                            ? 'bg-red-100 text-red-900 line-through decoration-red-600 font-semibold'
                            : isExamined
                            ? 'bg-amber-100 text-amber-950 font-bold ring-1 ring-amber-300'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {formatProduction(p)}
                        {isRemoved && (
                          <span className="ml-2 text-[10px] text-red-700 font-sans font-bold no-underline">
                            (removed)
                          </span>
                        )}
                        {isExamined && !isRemoved && (
                          <span className="ml-2 text-[10px] text-amber-700 font-sans font-bold">
                            (examined)
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* After Grammar State */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  After State
                </span>
                <span className="text-xs font-mono font-medium text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {afterVarRowCount} variables &bull; {afterGrammar.productions.length} productions
                </span>
              </div>
              <div className="p-4 space-y-1 font-mono text-xs sm:text-sm max-h-72 overflow-y-auto">
                {afterGrammar.productions.length === 0 ? (
                  <span className="text-slate-400 italic">No productions</span>
                ) : (
                  afterGrammar.productions.map(p => {
                    const isAdded = addedIds.has(p.id);

                    return (
                      <div
                        key={p.id}
                        className={`px-2 py-1 rounded transition-colors ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-950 font-bold ring-1 ring-emerald-300'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {formatProduction(p)}
                        {isAdded && (
                          <span className="ml-2 text-[10px] text-emerald-700 font-sans font-bold">
                            (new)
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Tabbed View */
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <div className="bg-slate-100 px-4 py-1.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('before')}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md transition-all ${
                    activeTab === 'before'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Before State ({beforeVarRowCount} vars &bull; {beforeGrammar.productions.length} prods)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('after')}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md transition-all ${
                    activeTab === 'after'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  After State ({afterVarRowCount} vars &bull; {afterGrammar.productions.length} prods)
                </button>
              </div>
            </div>

            <div className="p-4 space-y-1 font-mono text-xs sm:text-sm max-h-72 overflow-y-auto">
              {activeTab === 'before' ? (
                beforeGrammar.productions.map(p => {
                  const isRemoved = removedIds.has(p.id);
                  const isExamined = examinedId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`px-2 py-1 rounded ${
                        isRemoved
                          ? 'bg-red-100 text-red-900 line-through decoration-red-600 font-semibold'
                          : isExamined
                          ? 'bg-amber-100 text-amber-950 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {formatProduction(p)}
                    </div>
                  );
                })
              ) : (
                afterGrammar.productions.map(p => {
                  const isAdded = addedIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`px-2 py-1 rounded ${
                        isAdded
                          ? 'bg-emerald-100 text-emerald-950 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {formatProduction(p)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
