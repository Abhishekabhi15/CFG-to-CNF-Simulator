import { Grammar, Production, TransformationStep } from './types';
import {
  EPSILON,
  isEpsilon,
  createProductionId,
  cloneGrammar,
  diffProductions,
  formatProduction,
  generateFreshVariable,
  deduplicateProductions
} from './grammarUtils';

/**
 * Computes the set of all nullable variables in the grammar using fixed-point iteration.
 */
export function findNullableVariables(grammar: Grammar): {
  nullableSet: Set<string>;
  derivationReason: Map<string, string>;
} {
  const nullableSet = new Set<string>();
  const derivationReason = new Map<string, string>();

  // Pass 1: Direct epsilon productions A → ε
  for (const prod of grammar.productions) {
    if (prod.rhs.length === 1 && isEpsilon(prod.rhs[0])) {
      if (!nullableSet.has(prod.lhs)) {
        nullableSet.add(prod.lhs);
        derivationReason.set(prod.lhs, `Has direct null production: ${formatProduction(prod)}`);
      }
    }
  }

  // Pass 2: Iterative fixed-point for composite rules A → Y1 Y2 ... Yk where all Yi ∈ nullableSet
  let changed = true;
  while (changed) {
    changed = false;
    for (const prod of grammar.productions) {
      if (nullableSet.has(prod.lhs)) continue;
      if (prod.rhs.length === 0 || (prod.rhs.length === 1 && isEpsilon(prod.rhs[0]))) continue;

      // Check if all symbols in RHS are already known to be nullable non-terminals
      const allNullable = prod.rhs.every(sym => nullableSet.has(sym));
      if (allNullable) {
        nullableSet.add(prod.lhs);
        derivationReason.set(
          prod.lhs,
          `Derives ε via ${formatProduction(prod)} because all symbols in RHS {${prod.rhs.join(', ')}} are nullable.`
        );
        changed = true;
      }
    }
  }

  return { nullableSet, derivationReason };
}

/**
 * Eliminates null (epsilon) productions from the grammar step-by-step.
 */
export function eliminateNullProductions(
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

  const { nullableSet, derivationReason } = findNullableVariables(currentGrammar);

  // Step 1: Document identified nullable variables
  if (nullableSet.size > 0) {
    const nullableList = Array.from(nullableSet);
    const details = nullableList
      .map(v => `• Variable ${v}: ${derivationReason.get(v)}`)
      .join('\n');

    const beforeState = cloneGrammar(currentGrammar);
    const diff = diffProductions(beforeState.productions, currentGrammar.productions);

    steps.push({
      id: currentStepId++,
      stageId: 'null_elimination',
      stageNumber: 2,
      stageName: 'Elimination of Null Productions',
      subStep: 'Identify Nullable Variables',
      title: `Identify Nullable Variables: {${nullableList.join(', ')}}`,
      mathGoal: 'Find all non-terminals A capable of deriving the empty string (A ⇒* ε) via fixed-point analysis.',
      explanation: `Computed nullable variables set N = {${nullableList.join(', ')}}.\n\n${details}`,
      examinedRule: null,
      examinedVariable: nullableList[0],
      beforeGrammar: beforeState,
      afterGrammar: cloneGrammar(currentGrammar),
      addedProductions: diff.added,
      removedProductions: diff.removed,
      unchangedProductions: diff.unchanged,
      rulesBefore: currentGrammar.productions.length,
      rulesAdded: 0,
      rulesRemoved: 0,
      rulesAfter: currentGrammar.productions.length,
      metadata: {
        nullableSet: nullableList
      }
    });
  } else {
    // No nullable variables
    const beforeState = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'null_elimination',
      stageNumber: 2,
      stageName: 'Elimination of Null Productions',
      subStep: 'Identify Nullable Variables',
      title: 'No Nullable Variables Found',
      mathGoal: 'Verify if any variables in the grammar can derive the empty string.',
      explanation: 'No direct (A → ε) or indirect null productions exist in this grammar. The grammar is already free of null productions.',
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
        nullableSet: []
      }
    });

    return { steps, finalGrammar: currentGrammar, nextStepId: currentStepId };
  }

  // Step 2: Check if original start symbol is nullable (i.e. ε ∈ L(G))
  const isStartNullable = nullableSet.has(currentGrammar.startSymbol);
  let freshStartSymbol = currentGrammar.startSymbol;

  if (isStartNullable) {
    freshStartSymbol = generateFreshVariable('S0', currentGrammar.variables);
    const beforeState = cloneGrammar(currentGrammar);

    // Add new start symbol and S0 → S | ε
    currentGrammar.variables = [freshStartSymbol, ...currentGrammar.variables];
    const newProds: Production[] = [
      {
        id: createProductionId(freshStartSymbol, [currentGrammar.startSymbol]),
        lhs: freshStartSymbol,
        rhs: [currentGrammar.startSymbol]
      },
      {
        id: createProductionId(freshStartSymbol, [EPSILON]),
        lhs: freshStartSymbol,
        rhs: [EPSILON]
      }
    ];

    currentGrammar.productions = [...newProds, ...currentGrammar.productions];
    const oldStart = currentGrammar.startSymbol;
    currentGrammar.startSymbol = freshStartSymbol;

    const diff = diffProductions(beforeState.productions, currentGrammar.productions);

    steps.push({
      id: currentStepId++,
      stageId: 'null_elimination',
      stageNumber: 2,
      stageName: 'Elimination of Null Productions',
      subStep: 'Preserve Empty String for Start Symbol',
      title: `Introduce Fresh Start Symbol: ${freshStartSymbol}`,
      mathGoal: 'Preserve ε ∈ L(G) in Chomsky Normal Form by introducing a new start symbol that never appears on any RHS.',
      explanation: `The original start symbol ${oldStart} is nullable, which means the language accepts the empty string (ε ∈ L(G)). In CNF, S₀ → ε is permitted strictly for the start symbol, provided the start symbol does not appear on the right-hand side of any production. We introduce ${freshStartSymbol} and add ${freshStartSymbol} → ${oldStart} | ε.`,
      examinedRule: newProds[1],
      examinedVariable: freshStartSymbol,
      beforeGrammar: beforeState,
      afterGrammar: cloneGrammar(currentGrammar),
      addedProductions: diff.added,
      removedProductions: diff.removed,
      unchangedProductions: diff.unchanged,
      rulesBefore: beforeState.productions.length,
      rulesAdded: diff.added.length,
      rulesRemoved: diff.removed.length,
      rulesAfter: currentGrammar.productions.length
    });
  }

  // Step 3: Expand productions containing nullable variables
  // For each production with at least one nullable symbol on RHS (excluding direct A → ε)
  const productionsToExamine = [...currentGrammar.productions];

  for (const prod of productionsToExamine) {
    if (prod.rhs.length === 1 && isEpsilon(prod.rhs[0])) {
      continue; // Will handle in step 4
    }

    // Find indices of symbols that are in nullableSet
    const nullableIndices: number[] = [];
    prod.rhs.forEach((sym, idx) => {
      if (nullableSet.has(sym)) {
        nullableIndices.push(idx);
      }
    });

    if (nullableIndices.length === 0) {
      continue; // No nullable variables in this rule
    }

    // Generate combinations of omitting nullable indices
    // Total 2^k combinations where k = nullableIndices.length
    const numCombos = 1 << nullableIndices.length;
    const newAlternatives: string[][] = [];

    for (let mask = 1; mask < numCombos; mask++) {
      // mask represents which nullable indices to DROP (1 = drop)
      const newRhs: string[] = [];
      let dropCount = 0;

      for (let i = 0; i < prod.rhs.length; i++) {
        const nullIdx = nullableIndices.indexOf(i);
        if (nullIdx !== -1 && (mask & (1 << nullIdx)) !== 0) {
          // Drop this nullable occurrence
          dropCount++;
        } else {
          newRhs.push(prod.rhs[i]);
        }
      }

      // If newRhs is empty, it would be an epsilon production.
      // We only allow epsilon for fresh start symbol S0, not intermediate variables!
      if (newRhs.length > 0) {
        newAlternatives.push(newRhs);
      }
    }

    // Check which of these are actually new
    const addedThisStep: Production[] = [];
    const beforeState = cloneGrammar(currentGrammar);

    for (const alt of newAlternatives) {
      const candidateId = createProductionId(prod.lhs, alt);
      const exists = currentGrammar.productions.some(p => p.id === candidateId);
      if (!exists && !addedThisStep.some(p => p.id === candidateId)) {
        const newProd: Production = {
          id: candidateId,
          lhs: prod.lhs,
          rhs: alt
        };
        addedThisStep.push(newProd);
        currentGrammar.productions.push(newProd);
      }
    }

    if (addedThisStep.length > 0) {
      const diff = diffProductions(beforeState.productions, currentGrammar.productions);
      const omittedVars = nullableIndices.map(i => prod.rhs[i]).join(', ');

      steps.push({
        id: currentStepId++,
        stageId: 'null_elimination',
        stageNumber: 2,
        stageName: 'Elimination of Null Productions',
        subStep: 'Expand Nullable Rule',
        title: `Expand Nullable Alternatives for ${formatProduction(prod)}`,
        mathGoal: 'Generate all non-empty alternatives where nullable variables may derive ε.',
        explanation: `Rule ${formatProduction(prod)} contains nullable variable(s): {${omittedVars}}. By considering every permutation where each nullable symbol derives ε, we introduce ${addedThisStep.length} new production(s): ${addedThisStep.map(p => formatProduction(p)).join(', ')}.`,
        examinedRule: prod,
        examinedVariable: prod.lhs,
        beforeGrammar: beforeState,
        afterGrammar: cloneGrammar(currentGrammar),
        addedProductions: diff.added,
        removedProductions: diff.removed,
        unchangedProductions: diff.unchanged,
        rulesBefore: beforeState.productions.length,
        rulesAdded: diff.added.length,
        rulesRemoved: 0,
        rulesAfter: currentGrammar.productions.length
      });
    }
  }

  // Step 4: Remove direct epsilon productions (except S0 → ε if start symbol is nullable)
  const epsilonProdsToRemove = currentGrammar.productions.filter(p => {
    if (p.rhs.length === 1 && isEpsilon(p.rhs[0])) {
      // Keep S0 → ε if S0 is fresh start symbol
      if (p.lhs === currentGrammar.startSymbol && isStartNullable) {
        return false;
      }
      return true;
    }
    return false;
  });

  for (const epsProd of epsilonProdsToRemove) {
    const beforeState = cloneGrammar(currentGrammar);
    currentGrammar.productions = currentGrammar.productions.filter(p => p.id !== epsProd.id);
    const diff = diffProductions(beforeState.productions, currentGrammar.productions);

    steps.push({
      id: currentStepId++,
      stageId: 'null_elimination',
      stageNumber: 2,
      stageName: 'Elimination of Null Productions',
      subStep: 'Remove Null Production',
      title: `Remove Null Production: ${formatProduction(epsProd)}`,
      mathGoal: 'Eliminate direct ε-production since all non-empty derivations were generated in prior expansions.',
      explanation: `The null production ${formatProduction(epsProd)} is permanently removed. Its effect on the language has been preserved through the expanded alternative rules.`,
      examinedRule: epsProd,
      examinedVariable: epsProd.lhs,
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

  currentGrammar.productions = deduplicateProductions(currentGrammar.productions);

  return {
    steps,
    finalGrammar: currentGrammar,
    nextStepId: currentStepId
  };
}
