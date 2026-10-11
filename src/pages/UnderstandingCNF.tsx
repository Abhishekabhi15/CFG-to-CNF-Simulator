import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  Maximize2
} from 'lucide-react';

interface TopicSection {
  id: string;
  title: string;
  category: string;
}

export const UnderstandingCNF: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-8 text-white shadow-xl">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-200">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Theory of Computation &bull; Formal Languages</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Understanding Chomsky Normal Form (CNF)
          </h1>
          <p className="text-sm sm:text-base text-indigo-150 leading-relaxed font-normal text-indigo-100">
            A comprehensive theoretical and practical guide to Context-Free Grammars, normal forms, and the step-by-step mathematical algorithms that transform arbitrary CFGs into CNF while preserving their exact language.
          </p>
        </div>
      </div>

      {/* Guide Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Table of Contents Sticky Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <div className="sticky top-24 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Table of Contents
            </div>
            {[
              { id: 'cfg-definition', label: '1. What is a CFG?' },
              { id: 'cnf-definition', label: '2. What is Chomsky Normal Form?' },
              { id: 'why-cnf', label: '3. Why Convert to CNF?' },
              { id: 'step-null', label: '4. Null Productions (A → ε)' },
              { id: 'step-unit', label: '5. Unit Productions (A → B)' },
              { id: 'step-useless', label: '6. Useless Variables' },
              { id: 'step-terminals', label: '7. Terminal Replacement' },
              { id: 'step-binarization', label: '8. Binarization of Long Rules' },
              { id: 'empty-string-rule', label: '9. The S₀ → ε Special Rule' },
            ].map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Deep Explanations */}
        <div className="lg:col-span-3 space-y-12">
          {/* 1. Context-Free Grammar Definition */}
          <section id="cfg-definition" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 1</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              What is a Context-Free Grammar?
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              A <strong>Context-Free Grammar (CFG)</strong> is a formal system that describes the syntax of languages. Formally, a CFG is defined as a 4-tuple:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm text-slate-800">
              G = (V, Σ, R, S)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-900 font-mono">V (Variables):</span> A finite set of non-terminal symbols (e.g., S, A, B).
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-900 font-mono">Σ (Terminals):</span> A finite alphabet of terminal symbols disjoint from V (e.g., a, b, c).
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-900 font-mono">R (Rules):</span> Production rules of the form <code className="bg-slate-200 px-1 py-0.5 rounded">A → α</code> where A ∈ V and α ∈ (V ∪ Σ)*.
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-900 font-mono">S (Start Symbol):</span> A designated variable S ∈ V where derivations begin.
              </div>
            </div>
          </section>

          {/* 2. What is CNF? */}
          <section id="cnf-definition" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 2</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              What is Chomsky Normal Form?
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Introduced by linguist and computer scientist Noam Chomsky, <strong>Chomsky Normal Form (CNF)</strong> restricts production rules strictly to two clean, binary forms:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1">
                <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Form 1: Binary Non-Terminals</div>
                <div className="font-mono text-base font-bold text-indigo-950">A → B C</div>
                <p className="text-xs text-slate-600">
                  Where A, B, and C are non-terminal variables in V. The right-hand side has exactly two non-terminals.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Form 2: Single Terminal</div>
                <div className="font-mono text-base font-bold text-emerald-950">A → a</div>
                <p className="text-xs text-slate-600">
                  Where A is a non-terminal variable and a is a terminal symbol in Σ.
                </p>
              </div>
            </div>
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>Permitted Exception:</strong> If the empty string ε is in the language (ε ∈ L(G)), the single production <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">S₀ → ε</code> is permitted, provided S₀ is a fresh start symbol that never appears on the right-hand side of any production.
            </div>
          </section>

          {/* 3. Why CNF? */}
          <section id="why-cnf" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Section 3</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Why is CNF Conversion Useful?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900">Guaranteed Derivation Length</div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  For any non-empty string w of length |w| = n, any derivation in CNF requires exactly <strong>2n - 1 steps</strong> (n - 1 binary branching steps and n terminal leaf steps).
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900">Binary Syntax Trees</div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Every parse tree in CNF is a strict binary tree. This uniform tree structure makes mathematical inductive proofs and algorithmic manipulation straightforward.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900">Decidability of Membership</div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Because derivations cannot loop infinitely (no unit productions or ε-shrinking), we can definitively decide if any string w belongs to L(G) in finite time.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Elimination of Null Productions */}
          <section id="step-null" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Conversion Stage 1</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Elimination of Null (Epsilon) Productions
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              A null production is of the form <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">A → ε</code>. These allow derivations to shrink sentential forms and introduce infinite derivation ambiguity.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
              <div className="font-bold text-slate-800">The Algorithm:</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-xs">
                <li>Identify all <strong>nullable variables</strong> N = &#123; A ∈ V | A ⇒* ε &#125; using fixed-point iteration.</li>
                <li>For every production rule containing nullable variables, generate all possible non-empty alternatives where each nullable symbol is either kept or omitted.</li>
                <li>Remove all original A → ε productions.</li>
                <li>If the start symbol S was nullable, create a new start symbol S₀ and add S₀ → S | ε.</li>
              </ol>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs font-mono">
              <div className="font-bold text-indigo-900 font-sans mb-1 text-xs">Example:</div>
              <div className="text-slate-500">Before: A → aA | ε</div>
              <div className="text-indigo-900 font-bold">After:  A → aA | a (ε eliminated, a added because A is nullable)</div>
            </div>
          </section>

          {/* 5. Elimination of Unit Productions */}
          <section id="step-unit" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Conversion Stage 2</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Elimination of Unit Productions
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              A unit production is of the form <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">A → B</code>, where both A and B are non-terminals. Unit rules waste derivation steps without producing any terminals.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
              <div className="font-bold text-slate-800">The Algorithm:</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-xs">
                <li>For each variable A, compute its <strong>unit closure</strong> Unit(A) = &#123; B ∈ V | A ⇒* B via unit productions &#125;.</li>
                <li>For every B ∈ Unit(A), if B has a non-unit production B → α, add A → α to the grammar.</li>
                <li>Remove all original unit productions A → B.</li>
              </ol>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs font-mono">
              <div className="font-bold text-indigo-900 font-sans mb-1 text-xs">Example:</div>
              <div className="text-slate-500">Before: S → C, C → AB</div>
              <div className="text-indigo-900 font-bold">After:  S → AB (C → AB copied directly to S, unit rule S → C removed)</div>
            </div>
          </section>

          {/* 6. Useless Variables */}
          <section id="step-useless" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Conversion Stage 3</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Removal of Useless Variables
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              A variable is <em>useful</em> if and only if it appears in at least one valid derivation of a terminal string: S ⇒* αAβ ⇒* w ∈ Σ*. Variables failing this are useless and must be purged.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="font-bold text-slate-900">Step 3a: Non-Generating Variables</div>
                <p className="text-slate-600">
                  A variable A is <strong>generating</strong> if A ⇒* w for some string of terminals w ∈ Σ*. If E only produces E → eE, it can never terminate. Remove E and all rules referencing E.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="font-bold text-slate-900">Step 3b: Unreachable Variables</div>
                <p className="text-slate-600">
                  A variable A is <strong>reachable</strong> if S ⇒* αAβ. Even if a variable can generate terminals, if it cannot be reached from S, it has zero role in the language.
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 italic">
              <strong>Order Rule:</strong> Generating analysis must strictly precede Reachability analysis. Removing non-generating variables may disconnect other variables and make them unreachable!
            </div>
          </section>

          {/* 7. Terminal Replacement */}
          <section id="step-terminals" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Conversion Stage 4</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Replacement of Terminals in Mixed Productions
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Chomsky Normal Form strictly forbids mixing terminals with non-terminals, or having multiple terminals in a production of length ≥ 2.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-slate-800">Dynamic Helper Variable Allocation:</div>
              <p className="text-slate-600">
                For every terminal <em>a</em> that appears in a production of length ≥ 2, we dynamically allocate a non-terminal helper variable from available symbols (such as <code className="font-mono font-bold">X, Y, Z, P, Q, R, U, W</code>) or reuse an existing dedicated rule (e.g., if <code className="font-mono font-bold">X → a</code> already exists in the grammar, we reuse <code className="font-mono font-bold">X</code>). We never collide with existing variables or the start symbol.
              </p>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs font-mono">
              <div className="font-bold text-indigo-900 font-sans mb-1 text-xs">Example:</div>
              <div className="text-slate-500">Before: S → aD</div>
              <div className="text-indigo-900 font-bold">After:  S → XD, X → a (Dynamic helper X assigned for terminal a)</div>
            </div>
          </section>

          {/* 8. Binarization */}
          <section id="step-binarization" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Conversion Stage 5</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Binarization of Long Productions
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Every production with right-hand side length k &gt; 2 must be broken down into a cascade of binary productions of length 2 using declared helper variables (such as <code className="font-mono font-bold">H1, H2</code> or available symbols from the preferred pool).
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-slate-800">Cascade Decomposition:</div>
              <div className="font-mono text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                A → Y₁ Y₂ Y₃ ... Y_k<br />
                becomes:<br />
                A → Y₁ H₁<br />
                H₁ → Y₂ H₂<br />
                ...<br />
                H_{'{k-2}'} → Y_{'{k-1}'} Y_k
              </div>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs font-mono">
              <div className="font-bold text-indigo-900 font-sans mb-1 text-xs">Example:</div>
              <div className="text-slate-500">Before: S → ABC</div>
              <div className="text-indigo-900 font-bold">After:  S → AH1, H1 → BC (Decomposed into strictly binary rules)</div>
            </div>
          </section>

          {/* 9. S0 -> epsilon Special Rule */}
          <section id="empty-string-rule" className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>Formal Specification Note</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              The Permitted S₀ → ε Rule for Empty String Languages
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              What if the original grammar generates the empty string, i.e., ε ∈ L(G)? In standard CNF, epsilon is forbidden. However, to preserve the exact language when ε ∈ L(G):
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-slate-900">Standard Chomsky Construction:</div>
              <p className="text-slate-600">
                1. We create a fresh start symbol S₀.<br />
                2. We add rules <code className="font-mono font-bold">S₀ → S | ε</code>.<br />
                3. Because S₀ never appears on the right-hand side of any production, this single ε-rule cannot be used in the middle of any derivation tree, preserving the strict binary property for all non-empty strings.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
