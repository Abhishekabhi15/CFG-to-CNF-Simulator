import { Grammar, Production, TransformationStep } from './types';
import {
  cloneGrammar,
  diffProductions,
  formatProduction,
  isEpsilon
} from './grammarUtils';

/**
 * Finds all generating variables using fixed-point iteration.
 * A variable A is generating if A ⇒* w for some string of terminals w ∈ Σ* (or w = ε).
 */
export function findGeneratingVariables(grammar: Grammar): {
  generating: Set<string>;
  nonGenerating: Set<string>;
  derivationMap: Map<string, string>;
} {
  const termSet = new Set(grammar.terminals);
  const varSet = new Set(grammar.variables);
  const generating = new Set<string>();
  const derivationMap = new Map<string, string>();

  // Pass 1: Direct terminal derivations A → w where all symbols in w are terminals or ε
  for (const prod of grammar.productions) {
    if (!varSet.has(prod.lhs)) continue;
    const isTerminalOnly = prod.rhs.every(sym => termSet.has(sym) || isEpsilon(sym));
    if (isTerminalOnly) {
      if (!generating.has(prod.lhs)) {
        generating.add(prod.lhs);
        derivationMap.set(prod.lhs, `Directly generates terminal string via ${formatProduction(prod)}`);
      }
    }
  }

  // Pass 2: Iterative fixed point
  let changed = true;
  while (changed) {
    changed = false;
    for (const prod of grammar.productions) {
      if (!varSet.has(prod.lhs)) continue;
      if (generating.has(prod.lhs)) continue;

      // Check if every symbol on RHS is either a terminal, ε, or an already generating variable
      const allGeneratingOrTerminals = prod.rhs.every(
        sym => termSet.has(sym) || generating.has(sym) || isEpsilon(sym)
      );

      if (allGeneratingOrTerminals) {
        generating.add(prod.lhs);
        derivationMap.set(
          prod.lhs,
          `Derives terminal string via ${formatProduction(prod)} (all RHS components are generating)`
        );
        changed = true;
      }
    }
  }

  const nonGenerating = new Set<string>();
  for (const v of grammar.variables) {
    if (!generating.has(v)) {
      nonGenerating.add(v);
    }
  }

  return { generating, nonGenerating, derivationMap };
}

/**
 * Finds all reachable variables from the start symbol using graph BFS.
 * A variable A is reachable if S ⇒* αAβ.
 */
export function findReachableVariables(grammar: Grammar): {
  reachable: Set<string>;
  unreachable: Set<string>;
} {
  const varSet = new Set(grammar.variables);
  const reachable = new Set<string>();

  if (varSet.has(grammar.startSymbol)) {
    reachable.add(grammar.startSymbol);
  }

  const queue = [grammar.startSymbol];

  while (queue.length > 0) {
    const currentVar = queue.shift()!;
    const prods = grammar.productions.filter(p => p.lhs === currentVar);

    for (const prod of prods) {
      for (const sym of prod.rhs) {
        if (varSet.has(sym) && !reachable.has(sym)) {
          reachable.add(sym);
          queue.push(sym);
        }
      }
    }
  }

  const unreachable = new Set<string>();
  for (const v of grammar.variables) {
    if (!reachable.has(v)) {
      unreachable.add(v);
    }
  }

  return { reachable, unreachable };
}

/**
 * Eliminates useless (non-generating and unreachable) variables step-by-step.
 */
export function eliminateUselessVariables(
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

  // ==========================================
  // PHASE 1: Eliminate Non-Generating Variables
  // ==========================================
  const { generating, nonGenerating, derivationMap } = findGeneratingVariables(currentGrammar);

  if (nonGenerating.size > 0) {
    const nonGenList = Array.from(nonGenerating);
    const genList = Array.from(generating);

    // Step: Identify non-generating variables
    const initialBefore = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'useless_elimination',
      stageNumber: 4,
      stageName: 'Identification and Removal of Useless Variables',
      subStep: 'Identify Non-Generating Variables',
      title: `Identify Non-Generating Variables: {${nonGenList.join(', ')}}`,
      mathGoal: 'A variable A is generating if A ⇒* w for some w ∈ Σ*. Non-generating variables can never terminate into terminal strings.',
      explanation: `Fixed-point analysis completed:\n• Generating variables: {${genList.join(', ')}}\n• Non-generating variables: {${nonGenList.join(', ')}}\n\nVariables in the non-generating set either have no productions or lead to endless recursion without terminating.`,
      examinedRule: null,
      examinedVariable: nonGenList[0],
      beforeGrammar: initialBefore,
      afterGrammar: cloneGrammar(currentGrammar),
      addedProductions: [],
      removedProductions: [],
      unchangedProductions: currentGrammar.productions,
      rulesBefore: currentGrammar.productions.length,
      rulesAdded: 0,
      rulesRemoved: 0,
      rulesAfter: currentGrammar.productions.length,
      metadata: {
        generatingSet: genList,
        nonGeneratingSet: nonGenList
      }
    });

    // Remove each non-generating variable and all rules referencing it
    for (const deadVar of nonGenList) {
      const beforeState = cloneGrammar(currentGrammar);

      // Find productions that have deadVar on LHS or in RHS
      const prodsWithDeadVar = currentGrammar.productions.filter(
        p => p.lhs === deadVar || p.rhs.includes(deadVar)
      );

      currentGrammar.variables = currentGrammar.variables.filter(v => v !== deadVar);
      currentGrammar.productions = currentGrammar.productions.filter(
        p => p.lhs !== deadVar && !p.rhs.includes(deadVar)
      );

      const diff = diffProductions(beforeState.productions, currentGrammar.productions);

      steps.push({
        id: currentStepId++,
        stageId: 'useless_elimination',
        stageNumber: 4,
        stageName: 'Identification and Removal of Useless Variables',
        subStep: 'Remove Non-Generating Variable',
        title: `Remove Non-Generating Variable: ${deadVar}`,
        mathGoal: `Purge non-generating variable ${deadVar} and all productions that reference it.`,
        explanation: `Variable ${deadVar} cannot derive any terminal string. Removed ${deadVar} from V and eliminated ${prodsWithDeadVar.length} associated rule(s):\n${prodsWithDeadVar.map(p => formatProduction(p)).join(', ')}.`,
        examinedRule: prodsWithDeadVar.length > 0 ? prodsWithDeadVar[0] : null,
        examinedVariable: deadVar,
        beforeGrammar: beforeState,
        afterGrammar: cloneGrammar(currentGrammar),
        addedProductions: diff.added,
        removedProductions: diff.removed,
        unchangedProductions: diff.unchanged,
        rulesBefore: beforeState.productions.length,
        rulesAdded: 0,
        rulesRemoved: diff.removed.length,
        rulesAfter: currentGrammar.productions.length
      });
    }
  } else {
    // All variables generating
    const beforeState = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'useless_elimination',
      stageNumber: 4,
      stageName: 'Identification and Removal of Useless Variables',
      subStep: 'Check Generating Variables',
      title: 'All Variables Are Generating',
      mathGoal: 'Verify if every non-terminal can derive at least one string of terminals.',
      explanation: `All variables {${currentGrammar.variables.join(', ')}} can derive terminal strings. No non-generating variables exist.`,
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
      rulesAfter: currentGrammar.productions.length,
      metadata: {
        generatingSet: [...currentGrammar.variables],
        nonGeneratingSet: []
      }
    });
  }

  // ==========================================
  // PHASE 2: Eliminate Unreachable Variables
  // ==========================================
  const { reachable, unreachable } = findReachableVariables(currentGrammar);

  if (unreachable.size > 0) {
    const unreachList = Array.from(unreachable);
    const reachList = Array.from(reachable);

    const initialBefore = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'useless_elimination',
      stageNumber: 4,
      stageName: 'Identification and Removal of Useless Variables',
      subStep: 'Identify Unreachable Variables',
      title: `Identify Unreachable Variables: {${unreachList.join(', ')}}`,
      mathGoal: `Find all variables that cannot be reached starting from start symbol ${currentGrammar.startSymbol} (i.e. S ⇒* αAβ).`,
      explanation: `BFS reachability traversal from ${currentGrammar.startSymbol} completed:\n• Reachable variables: {${reachList.join(', ')}}\n• Unreachable variables: {${unreachList.join(', ')}}\n\nUnreachable variables can never appear in any derivation originating from the start symbol.`,
      examinedRule: null,
      examinedVariable: unreachList[0],
      beforeGrammar: initialBefore,
      afterGrammar: cloneGrammar(currentGrammar),
      addedProductions: [],
      removedProductions: [],
      unchangedProductions: currentGrammar.productions,
      rulesBefore: currentGrammar.productions.length,
      rulesAdded: 0,
      rulesRemoved: 0,
      rulesAfter: currentGrammar.productions.length,
      metadata: {
        reachableSet: reachList,
        unreachableSet: unreachList
      }
    });

    // Remove each unreachable variable
    for (const deadVar of unreachList) {
      const beforeState = cloneGrammar(currentGrammar);

      const prodsWithDeadVar = currentGrammar.productions.filter(
        p => p.lhs === deadVar || p.rhs.includes(deadVar)
      );

      currentGrammar.variables = currentGrammar.variables.filter(v => v !== deadVar);
      currentGrammar.productions = currentGrammar.productions.filter(
        p => p.lhs !== deadVar && !p.rhs.includes(deadVar)
      );

      const diff = diffProductions(beforeState.productions, currentGrammar.productions);

      steps.push({
        id: currentStepId++,
        stageId: 'useless_elimination',
        stageNumber: 4,
        stageName: 'Identification and Removal of Useless Variables',
        subStep: 'Remove Unreachable Variable',
        title: `Remove Unreachable Variable: ${deadVar}`,
        mathGoal: `Purge unreachable variable ${deadVar} and its orphan productions.`,
        explanation: `Variable ${deadVar} cannot be reached from start symbol ${currentGrammar.startSymbol}. Removed ${deadVar} and eliminated ${prodsWithDeadVar.length} orphan rule(s):\n${prodsWithDeadVar.map(p => formatProduction(p)).join(', ')}.`,
        examinedRule: prodsWithDeadVar.length > 0 ? prodsWithDeadVar[0] : null,
        examinedVariable: deadVar,
        beforeGrammar: beforeState,
        afterGrammar: cloneGrammar(currentGrammar),
        addedProductions: diff.added,
        removedProductions: diff.removed,
        unchangedProductions: diff.unchanged,
        rulesBefore: beforeState.productions.length,
        rulesAdded: 0,
        rulesRemoved: diff.removed.length,
        rulesAfter: currentGrammar.productions.length
      });
    }
  } else {
    // All variables reachable
    const beforeState = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'useless_elimination',
      stageNumber: 4,
      stageName: 'Identification and Removal of Useless Variables',
      subStep: 'Check Reachable Variables',
      title: 'All Variables Are Reachable',
      mathGoal: `Verify that every variable is reachable from start symbol ${currentGrammar.startSymbol}.`,
      explanation: `All variables {${currentGrammar.variables.join(', ')}} are reachable from ${currentGrammar.startSymbol}. No unreachable variables exist.`,
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
      rulesAfter: currentGrammar.productions.length,
      metadata: {
        reachableSet: [...currentGrammar.variables],
        unreachableSet: []
      }
    });
  }

  return {
    steps,
    finalGrammar: currentGrammar,
    nextStepId: currentStepId
  };
}
