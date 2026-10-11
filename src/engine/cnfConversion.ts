import { Grammar, Production, TransformationStep } from './types';
import {
  cloneGrammar,
  diffProductions,
  formatProduction,
  isEpsilon,
  createProductionId,
  generateFreshVariable,
  deduplicateProductions
} from './grammarUtils';

/**
 * Stage 5: CNF Conversion
 * 1. Terminal replacement in mixed productions (|RHS| >= 2 with terminals)
 * 2. Binarization of long productions (|RHS| > 2)
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
  // Terminal helper variables mapping: terminal -> helperVarName (e.g. 'a' -> 'T_a')
  const terminalHelpers = new Map<string, string>();

  // Helper function to get or create a helper variable for a terminal
  const getHelperForTerminal = (t: string): string => {
    if (terminalHelpers.has(t)) {
      return terminalHelpers.get(t)!;
    }
    const baseName = `T_${t}`;
    const freshVar = generateFreshVariable(baseName, currentGrammar.variables);
    terminalHelpers.set(t, freshVar);
    currentGrammar.variables.push(freshVar);
    return freshVar;
  };

  // Find all productions with |RHS| >= 2 that contain at least one terminal
  const multiProdsWithTerminals = currentGrammar.productions.filter(p => {
    if (p.rhs.length < 2) return false;
    return p.rhs.some(sym => termSet.has(sym));
  });

  if (multiProdsWithTerminals.length > 0) {
    for (const prod of multiProdsWithTerminals) {
      const beforeState = cloneGrammar(currentGrammar);
      const replacedTerminals: string[] = [];

      // Replace terminals in RHS
      const newRhs = prod.rhs.map(sym => {
        if (termSet.has(sym)) {
          const helper = getHelperForTerminal(sym);
          replacedTerminals.push(`${sym} → ${helper}`);
          return helper;
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

      // Ensure helper productions T_x → x are present
      const addedHelperRules: Production[] = [];
      for (const [t, helperVar] of terminalHelpers.entries()) {
        const helperRuleId = createProductionId(helperVar, [t]);
        const exists = currentGrammar.productions.some(p => p.id === helperRuleId);
        if (!exists) {
          const helperRule: Production = {
            id: helperRuleId,
            lhs: helperVar,
            rhs: [t]
          };
          currentGrammar.productions.push(helperRule);
          addedHelperRules.push(helperRule);
        }
      }

      const diff = diffProductions(beforeState.productions, currentGrammar.productions);

      steps.push({
        id: currentStepId++,
        stageId: 'cnf_conversion',
        stageNumber: 5,
        stageName: 'CNF Conversion (Terminal Replacement & Binarization)',
        subStep: 'Replace Mixed Terminal',
        title: `Replace Terminals in Multi-Symbol Rule: ${formatProduction(prod)}`,
        mathGoal: 'Chomsky Normal Form forbids mixing terminals in productions of length ≥ 2. Replace each terminal with a dedicated non-terminal.',
        explanation: `Production ${formatProduction(prod)} has length ${prod.rhs.length} and contains terminal(s).\nReplaced: ${replacedTerminals.join(', ')}.\nNew production: ${formatProduction(newProd)}${
          addedHelperRules.length > 0
            ? `\nIntroduced helper rule(s): ${addedHelperRules.map(p => formatProduction(p)).join(', ')}`
            : ' (reusing existing terminal helper variable)'
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
        const freshHelper = generateFreshVariable(`H${binarizationCounter}`, currentGrammar.variables);
        binarizationCounter++;
        currentGrammar.variables.push(freshHelper);
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
        explanation: `Production ${formatProduction(prod)} has ${k} symbols on RHS.\nDecomposed into ${chainAdded.length} binary rule(s):\n${chainAdded.map(p => formatProduction(p)).join('\n')}\n(Introduced helper non-terminal(s): ${introducedHelpers.join(', ')}).`,
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
