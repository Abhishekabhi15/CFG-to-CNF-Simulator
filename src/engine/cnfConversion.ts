import { Grammar, Production, TransformationStep } from './types';
import {
  cloneGrammar,
  diffProductions,
  formatProduction,
  createProductionId,
  deduplicateProductions,
  groupProductionsByLhs
} from './grammarUtils';

// Preferred list of available non-terminal symbols for dynamic helper assignment
const PREFERRED_HELPER_SYMBOLS = [
  'X', 'Y', 'Z', 'P', 'Q', 'R', 'U', 'W', 'K', 'M', 'N', 'V', 'T', 'J'
];

/**
 * Dynamically finds or creates a helper variable for a terminal symbol.
 * - Reuses existing helper variable if already assigned in this conversion.
 * - Reuses existing grammar variable if it exclusively generates this terminal (e.g. X → a exists).
 * - Otherwise dynamically picks fresh candidate from preferred symbols [X, Y, Z, P, Q, R, U, W...].
 * - Checks declared and generated variables to prevent collisions and protects startSymbol.
 * - Falls back to N1, N2, Helper1 if preferred pool is exhausted.
 */
function getOrCreateTerminalHelper(
  terminal: string,
  currentGrammar: Grammar,
  terminalHelpers: Map<string, string>
): { helperVar: string; isNewRuleNeeded: boolean } {
  // 1. If already mapped in this conversion session, reuse it
  if (terminalHelpers.has(terminal)) {
    return { helperVar: terminalHelpers.get(terminal)!, isNewRuleNeeded: false };
  }

  const varSet = new Set(currentGrammar.variables);
  const startSymbol = currentGrammar.startSymbol;

  // 2. Check if an existing variable in currentGrammar produces ONLY this terminal:
  // e.g. V → [terminal] and has no other productions, and V !== startSymbol
  const prodsByLhs = groupProductionsByLhs(currentGrammar.productions);
  for (const [v, prods] of prodsByLhs.entries()) {
    if (v === startSymbol) continue;
    if (prods.length === 1 && prods[0].rhs.length === 1 && prods[0].rhs[0] === terminal) {
      terminalHelpers.set(terminal, v);
      return { helperVar: v, isNewRuleNeeded: false };
    }
  }

  // 3. Find first unused symbol from preferred pool
  for (const candidate of PREFERRED_HELPER_SYMBOLS) {
    if (!varSet.has(candidate) && candidate !== startSymbol) {
      terminalHelpers.set(terminal, candidate);
      currentGrammar.variables.push(candidate);
      return { helperVar: candidate, isNewRuleNeeded: true };
    }
  }

  // 4. Fallback to N1, N2... or Helper1, Helper2... if single letters are exhausted
  let counter = 1;
  while (true) {
    const candidate = `N${counter}`;
    if (!varSet.has(candidate) && candidate !== startSymbol) {
      terminalHelpers.set(terminal, candidate);
      currentGrammar.variables.push(candidate);
      return { helperVar: candidate, isNewRuleNeeded: true };
    }
    counter++;
  }
}

/**
 * Dynamically allocates a fresh helper variable for binarization cascades.
 * Uses H1, H2... or available symbols (Z, P, Q, N1, N2...), checking against all declared
 * and previously generated variables, and guarantees never colliding with startSymbol.
 */
function allocateBinarizationHelper(
  currentGrammar: Grammar,
  counter: number
): string {
  const varSet = new Set(currentGrammar.variables);
  const startSymbol = currentGrammar.startSymbol;

  // Preferred identifier pattern: H1, H2, etc. as shown in academic standard
  const primaryCandidate = `H${counter}`;
  if (!varSet.has(primaryCandidate) && primaryCandidate !== startSymbol) {
    currentGrammar.variables.push(primaryCandidate);
    return primaryCandidate;
  }

  // If H{counter} is occupied, try unused symbols from preferred pool
  for (const candidate of PREFERRED_HELPER_SYMBOLS) {
    if (!varSet.has(candidate) && candidate !== startSymbol) {
      currentGrammar.variables.push(candidate);
      return candidate;
    }
  }

  // Fallback to N1, N2... or Helper1, Helper2...
  let n = 1;
  while (true) {
    const fallbackN = `N${n}`;
    if (!varSet.has(fallbackN) && fallbackN !== startSymbol) {
      currentGrammar.variables.push(fallbackN);
      return fallbackN;
    }
    const fallbackH = `Helper${n}`;
    if (!varSet.has(fallbackH) && fallbackH !== startSymbol) {
      currentGrammar.variables.push(fallbackH);
      return fallbackH;
    }
    n++;
  }
}

/**
 * Stage 5: CNF Conversion
 * 1. Terminal replacement in mixed productions (|RHS| >= 2 with terminals)
 *    using dynamic helper variable naming (e.g. X, Y, Z, P, Q, R, U, W or existing V → a)
 * 2. Binarization of long productions (|RHS| > 2)
 *    using dynamic, declared helper variables (e.g. H1, H2, N1)
 */
export function convertToCnf(
  inputGrammar: Grammar,
  startStepId: number
): {
  steps: TransformationStep[];
  finalGrammar: Grammar;
  nextStepId: number;
} {
  const steps: TransformationStep[] = [];
  let currentStepId = startStepId;
  let currentGrammar = cloneGrammar(inputGrammar);

  const termSet = new Set(currentGrammar.terminals);

  // ========================================================
  // PART 1: Terminal Replacement in Multi-Symbol Productions
  // ========================================================
  // Terminal helper variables mapping: terminal -> helperVarName (e.g. 'a' -> 'X')
  const terminalHelpers = new Map<string, string>();

  // Find all productions with |RHS| >= 2 that contain at least one terminal
  const multiProdsWithTerminals = currentGrammar.productions.filter(p => {
    if (p.rhs.length < 2) return false;
    return p.rhs.some(sym => termSet.has(sym));
  });

  if (multiProdsWithTerminals.length > 0) {
    for (const prod of multiProdsWithTerminals) {
      const beforeState = cloneGrammar(currentGrammar);
      const replacedTerminals: string[] = [];
      const newHelperRulesAdded: Production[] = [];

      // Replace terminals in RHS
      const newRhs = prod.rhs.map(sym => {
        if (termSet.has(sym)) {
          const { helperVar, isNewRuleNeeded } = getOrCreateTerminalHelper(
            sym,
            currentGrammar,
            terminalHelpers
          );
          replacedTerminals.push(`${sym} → ${helperVar}`);

          if (isNewRuleNeeded) {
            const helperRuleId = createProductionId(helperVar, [sym]);
            const ruleExists = currentGrammar.productions.some(p => p.id === helperRuleId);
            if (!ruleExists) {
              const helperRule: Production = {
                id: helperRuleId,
                lhs: helperVar,
                rhs: [sym]
              };
              currentGrammar.productions.push(helperRule);
              newHelperRulesAdded.push(helperRule);
            }
          }

          return helperVar;
        }
        return sym;
      });

      // Remove the old production
      currentGrammar.productions = currentGrammar.productions.filter(p => p.id !== prod.id);

      // Add the updated production
      const newProd: Production = {
        id: createProductionId(prod.lhs, newRhs),
        lhs: prod.lhs,
        rhs: newRhs
      };
      currentGrammar.productions.push(newProd);

      const diff = diffProductions(beforeState.productions, currentGrammar.productions);

      steps.push({
        id: currentStepId++,
        stageId: 'cnf_conversion',
        stageNumber: 5,
        stageName: 'CNF Conversion (Terminal Replacement & Binarization)',
        subStep: 'Replace Mixed Terminal',
        title: `Replace Terminals in Multi-Symbol Rule: ${formatProduction(prod)}`,
        mathGoal: 'Chomsky Normal Form forbids mixing terminals in productions of length ≥ 2. Replace each terminal with a dynamically assigned non-terminal.',
        explanation: `Production ${formatProduction(prod)} has length ${prod.rhs.length} and contains terminal(s).\nReplaced: ${replacedTerminals.join(', ')}.\nNew production: ${formatProduction(newProd)}${
          newHelperRulesAdded.length > 0
            ? `\nIntroduced dynamic helper rule(s): ${newHelperRulesAdded.map(p => formatProduction(p)).join(', ')}`
            : ' (reusing existing helper variable for this terminal)'
        }.`,
        examinedRule: prod,
        examinedVariable: prod.lhs,
        beforeGrammar: beforeState,
        afterGrammar: cloneGrammar(currentGrammar),
        addedProductions: diff.added,
        removedProductions: diff.removed,
        unchangedProductions: diff.unchanged,
        rulesBefore: beforeState.productions.length,
        rulesAdded: diff.added.length,
        rulesRemoved: diff.removed.length,
        rulesAfter: currentGrammar.productions.length,
        metadata: {
          terminalHelpers: Object.fromEntries(terminalHelpers.entries())
        }
      });
    }
  } else {
    // No terminal replacement needed
    const beforeState = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'cnf_conversion',
      stageNumber: 5,
      stageName: 'CNF Conversion (Terminal Replacement & Binarization)',
      subStep: 'Check Mixed Terminals',
      title: 'No Multi-Symbol Productions with Terminals',
      mathGoal: 'Verify if any production of length ≥ 2 contains terminal symbols.',
      explanation: 'All productions of length ≥ 2 already consist exclusively of non-terminals, or all terminals are in unit-terminal rules (A → a). No terminal replacement required.',
      examinedRule: null,
      examinedVariable: null,
      beforeGrammar: beforeState,
      afterGrammar: cloneGrammar(currentGrammar),
      addedProductions: [],
      removedProductions: [],
      unchangedProductions: currentGrammar.productions,
      rulesBefore: currentGrammar.productions.length,
      rulesAdded: 0,
      rulesRemoved: 0,
      rulesAfter: currentGrammar.productions.length
    });
  }

  // ========================================================
  // PART 2: Binarization of Long Productions (|RHS| > 2)
  // ========================================================
  // Find all productions with RHS length > 2
  const longProds = currentGrammar.productions.filter(p => p.rhs.length > 2);

  if (longProds.length > 0) {
    let binarizationCounter = 1;

    for (const prod of longProds) {
      const beforeState = cloneGrammar(currentGrammar);

      // Remove the original long production
      currentGrammar.productions = currentGrammar.productions.filter(p => p.id !== prod.id);

      // Cascade of binary rules:
      // S → A B C D becomes:
      // S → A H1
      // H1 → B H2
      // H2 → C D
      const symbols = [...prod.rhs];
      const k = symbols.length; // e.g. 3 or 4
      const chainAdded: Production[] = [];
      const introducedHelpers: string[] = [];

      let previousLhs = prod.lhs;

      for (let i = 0; i < k - 2; i++) {
        const freshHelper = allocateBinarizationHelper(currentGrammar, binarizationCounter);
        binarizationCounter++;
        introducedHelpers.push(freshHelper);

        const binaryRule: Production = {
          id: createProductionId(previousLhs, [symbols[i], freshHelper]),
          lhs: previousLhs,
          rhs: [symbols[i], freshHelper]
        };

        chainAdded.push(binaryRule);
        currentGrammar.productions.push(binaryRule);
        previousLhs = freshHelper;
      }

      // Final pair in the cascade
      const finalBinaryRule: Production = {
        id: createProductionId(previousLhs, [symbols[k - 2], symbols[k - 1]]),
        lhs: previousLhs,
        rhs: [symbols[k - 2], symbols[k - 1]]
      };
      chainAdded.push(finalBinaryRule);
      currentGrammar.productions.push(finalBinaryRule);

      const diff = diffProductions(beforeState.productions, currentGrammar.productions);

      steps.push({
        id: currentStepId++,
        stageId: 'cnf_conversion',
        stageNumber: 5,
        stageName: 'CNF Conversion (Terminal Replacement & Binarization)',
        subStep: 'Binarize Long Production',
        title: `Binarize Long Production: ${formatProduction(prod)}`,
        mathGoal: `Every production in CNF must have |RHS| ≤ 2. Decompose RHS of length ${k} into a cascade of binary productions.`,
        explanation: `Production ${formatProduction(prod)} has ${k} symbols on RHS.\nDecomposed into ${chainAdded.length} binary rule(s):\n${chainAdded.map(p => formatProduction(p)).join('\n')}\n(Dynamically allocated helper non-terminal(s): ${introducedHelpers.join(', ')}).`,
        examinedRule: prod,
        examinedVariable: prod.lhs,
        beforeGrammar: beforeState,
        afterGrammar: cloneGrammar(currentGrammar),
        addedProductions: diff.added,
        removedProductions: diff.removed,
        unchangedProductions: diff.unchanged,
        rulesBefore: beforeState.productions.length,
        rulesAdded: diff.added.length,
        rulesRemoved: diff.removed.length,
        rulesAfter: currentGrammar.productions.length,
        metadata: {
          binarizedVariables: introducedHelpers
        }
      });
    }
  } else {
    // No long productions
    const beforeState = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'cnf_conversion',
      stageNumber: 5,
      stageName: 'CNF Conversion (Terminal Replacement & Binarization)',
      subStep: 'Check Production Lengths',
      title: 'All Productions Have Valid Length (|RHS| ≤ 2)',
      mathGoal: 'Verify if any productions have RHS length strictly greater than 2.',
      explanation: 'All productions already have at most 2 symbols on the right-hand side. No binarization cascade required.',
      examinedRule: null,
      examinedVariable: null,
      beforeGrammar: beforeState,
      afterGrammar: cloneGrammar(currentGrammar),
      addedProductions: [],
      removedProductions: [],
      unchangedProductions: currentGrammar.productions,
      rulesBefore: currentGrammar.productions.length,
      rulesAdded: 0,
      rulesRemoved: 0,
      rulesAfter: currentGrammar.productions.length
    });
  }

  currentGrammar.productions = deduplicateProductions(currentGrammar.productions);

  return {
    steps,
    finalGrammar: currentGrammar,
    nextStepId: currentStepId
  };
}
