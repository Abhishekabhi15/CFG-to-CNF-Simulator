import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  BarChart3,
  FileText
} from 'lucide-react';
import { Grammar, ConversionSummary, VerificationReport } from '../engine/types';
import { formatGroupedProductions, formatProduction } from '../engine/grammarUtils';

interface CompleteGrammarViewProps {
  originalGrammar: Grammar;
  finalGrammar: Grammar;
  summary: ConversionSummary;
  verification: VerificationReport;
  onStartAgain: () => void;
  onTryAnotherGrammar: () => void;
}

export const CompleteGrammarView: React.FC<CompleteGrammarViewProps> = ({
  originalGrammar,
  finalGrammar,
  summary,
  verification,
  onStartAgain,
  onTryAnotherGrammar
}) => {
  const [copied, setCopied] = useState(false);

  const finalGroupedLines = formatGroupedProductions(finalGrammar.productions);
  const originalGroupedLines = formatGroupedProductions(originalGrammar.productions);

  const copyFinalGrammar = () => {
    const text = finalGroupedLines.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Conversion Completed
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {summary.totalSteps} Mathematical Steps
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Chomsky Normal Form Grammar G&apos; = (V&apos;, Σ, R&apos;, S&apos;)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            The Context-Free Grammar has been successfully converted into Chomsky Normal Form while strictly preserving the language L(G).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={copyFinalGrammar}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy CNF Grammar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Side-by-Side: Original CFG vs Final CNF Grammar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original CFG */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Original CFG
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                V = &#123;{originalGrammar.variables.join(', ')}&#125; &bull; S = {originalGrammar.startSymbol}
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              {summary.originalProductionCount} rules
            </span>
          </div>

          <div className="p-4 space-y-2 font-mono text-xs sm:text-sm bg-white min-h-48">
            {originalGroupedLines.map((line, idx) => (
              <div key={idx} className="p-1.5 rounded text-slate-800 bg-slate-50/70 border border-slate-100">
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Final CNF Grammar */}
        <div className="border border-indigo-200 rounded-xl overflow-hidden bg-indigo-50/20">
          <div className="bg-indigo-50/80 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Final CNF Grammar (Grouped by Variable)
              </span>
              <div className="text-[11px] text-indigo-700 mt-0.5">
                V&apos; = &#123;{finalGrammar.variables.join(', ')}&#125; &bull; S&apos; = {finalGrammar.startSymbol}
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-200">
              {summary.finalProductionCount} rules
            </span>
          </div>

          <div className="p-4 space-y-2 font-mono text-xs sm:text-sm bg-white min-h-48">
            {finalGroupedLines.map((line, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded text-indigo-950 bg-indigo-50/60 border border-indigo-100 font-semibold"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversion Summary Statistics */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Conversion Metrics &amp; Rule Statistics
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <div className="text-[11px] font-semibold text-slate-500">Original Variables</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {summary.originalVariables.length}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <div className="text-[11px] font-semibold text-slate-500">Original Rules</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {summary.originalProductionCount}
            </div>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 text-center">
            <div className="text-[11px] font-semibold text-indigo-700">Final Variables</div>
            <div className="text-lg font-bold text-indigo-950 mt-0.5">
              {summary.finalVariables.length}
            </div>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 text-center">
            <div className="text-[11px] font-semibold text-indigo-700">Final CNF Rules</div>
            <div className="text-lg font-bold text-indigo-950 mt-0.5">
              {summary.finalProductionCount}
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-center">
            <div className="text-[11px] font-semibold text-emerald-700">Rules Added</div>
            <div className="text-lg font-bold text-emerald-800 mt-0.5">
              +{summary.totalAdded}
            </div>
          </div>

          <div className="bg-red-50/60 border border-red-200 rounded-xl p-3 text-center">
            <div className="text-[11px] font-semibold text-red-700">Rules Removed</div>
            <div className="text-lg font-bold text-red-800 mt-0.5">
              -{summary.totalRemoved}
            </div>
          </div>
        </div>
      </div>

      {/* CNF Verification Checklist */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Independent CNF Verification Checklist
              </h3>
              <p className="text-xs text-slate-500">
                Rigorous mathematical check evaluating every production against formal CNF constraints.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              verification.isValidCNF
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {verification.isValidCNF ? 'VALID CNF CERTIFIED' : 'INVALID CNF'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {verification.checks.map(chk => (
            <div
              key={chk.id}
              className={`p-3.5 rounded-xl border flex items-start space-x-3 transition-colors ${
                chk.passed
                  ? 'bg-emerald-50/30 border-emerald-200/80'
                  : 'bg-red-50/50 border-red-200'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {chk.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div className="space-y-0.5">
                <div
                  className={`text-xs font-bold ${
                    chk.passed ? 'text-emerald-950' : 'text-red-950'
                  }`}
                >
                  {chk.title}
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  {chk.details || chk.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onStartAgain}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Review Conversion Steps
        </button>

        <button
          type="button"
          onClick={onTryAnotherGrammar}
          className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
        >
          Try Another Grammar
        </button>
      </div>
    </div>
  );
};
