import React, { useRef } from 'react';
import { Play, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, BookMarked, HelpCircle } from 'lucide-react';
import { GRAMMAR_PRESETS } from '../engine/presets';
import { ValidationResult } from '../engine/validator';

interface GrammarInputProps {
  variables: string;
  terminals: string;
  startSymbol: string;
  productions: string;
  onVariablesChange: (v: string) => void;
  onTerminalsChange: (t: string) => void;
  onStartSymbolChange: (s: string) => void;
  onProductionsChange: (p: string) => void;
  onSelectPreset: (presetId: string) => void;
  onValidate: () => void;
  onStartConversion: () => void;
  onReset: () => void;
  validation: ValidationResult | null;
  isValidated: boolean;
  parseErrors: string[];
}

export const GrammarInput: React.FC<GrammarInputProps> = ({
  variables,
  terminals,
  startSymbol,
  productions,
  onVariablesChange,
  onTerminalsChange,
  onStartSymbolChange,
  onProductionsChange,
  onSelectPreset,
  onValidate,
  onStartConversion,
  onReset,
  validation,
  isValidated,
  parseErrors
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSymbol = (sym: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const nextText = text.substring(0, start) + sym + text.substring(end);
    onProductionsChange(nextText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    }, 10);
  };

  const hasErrors = parseErrors.length > 0 || (validation !== null && !validation.isValid);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Top Banner & Preset Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900">Grammar Definition G = (V, Σ, R, S)</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Formal CFG
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Define your Context-Free Grammar or select an educational preset demonstrating key transformation phases.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
            Preset:
          </span>
          <select
            defaultValue="complete-test"
            onChange={(e) => onSelectPreset(e.target.value)}
            className="text-xs font-medium bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            {GRAMMAR_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.badge ? `(${p.badge})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Variables (V) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Variables (V) <span className="text-slate-400 font-normal lowercase">(non-terminals)</span>
          </label>
          <input
            type="text"
            value={variables}
            onChange={(e) => onVariablesChange(e.target.value)}
            placeholder="S, A, B, C, D, E"
            className="w-full text-sm font-mono bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <p className="text-[11px] text-slate-500 mt-1">Comma-separated uppercase symbols</p>
        </div>

        {/* Terminals (Σ) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Terminals (Σ) <span className="text-slate-400 font-normal lowercase">(alphabet)</span>
          </label>
          <input
            type="text"
            value={terminals}
            onChange={(e) => onTerminalsChange(e.target.value)}
            placeholder="a, b, d, e"
            className="w-full text-sm font-mono bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <p className="text-[11px] text-slate-500 mt-1">Comma-separated terminal symbols</p>
        </div>

        {/* Start Symbol (S) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Start Symbol (S) <span className="text-slate-400 font-normal lowercase">(in V)</span>
          </label>
          <input
            type="text"
            value={startSymbol}
            onChange={(e) => onStartSymbolChange(e.target.value)}
            placeholder="S"
            className="w-full text-sm font-mono bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <p className="text-[11px] text-slate-500 mt-1">Must be an existing variable in V</p>
        </div>
      </div>

      {/* Productions (R) Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Production Rules (R)
          </label>

          {/* Quick-insert symbols toolbar */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1">Insert symbol:</span>
            <button
              type="button"
              onClick={() => insertSymbol(' → ')}
              className="text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
              title="Insert production arrow →"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => insertSymbol(' | ')}
              className="text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
              title="Insert alternative separator |"
            >
              |
            </button>
            <button
              type="button"
              onClick={() => insertSymbol('ε')}
              className="text-xs font-mono font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded border border-indigo-200 transition-colors"
              title="Insert empty string ε"
            >
              ε
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={7}
            value={productions}
            onChange={(e) => onProductionsChange(e.target.value)}
            placeholder="S → AB | C | aD&#10;A → aA | ε&#10;B → bB | b&#10;C → AB&#10;D → d&#10;E → eE"
            className="w-full text-sm font-mono bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y leading-relaxed"
            spellCheck={false}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span>Supports &apos;→&apos; or &apos;-&gt;&apos; for arrows, &apos;|&apos; for alternatives, and &apos;ε&apos; or &apos;epsilon&apos; for the empty string.</span>
          <span className="text-slate-400">One variable per line</span>
        </p>
      </div>

      {/* Validation Messages / Warnings */}
      {parseErrors.length > 0 && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
          <div className="font-semibold flex items-center space-x-1.5 text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Grammar Syntax Errors:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-red-700">
            {parseErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {validation && !validation.isValid && validation.errors.length > 0 && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
          <div className="font-semibold flex items-center space-x-1.5 text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Grammar Validation Errors:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-red-700">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {validation && validation.warnings.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
          <div className="font-semibold flex items-center space-x-1.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Grammar Warnings:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            {validation.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {isValidated && validation && validation.isValid && parseErrors.length === 0 && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Grammar definition is valid and mathematically well-formed. Ready for Chomsky Normal Form conversion.</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onStartConversion}
            disabled={hasErrors}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Conversion</span>
          </button>

          <button
            type="button"
            onClick={onValidate}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Validate Grammar</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 transition-colors"
        >
          Reset to Default Benchmark
        </button>
      </div>
    </div>
  );
};
