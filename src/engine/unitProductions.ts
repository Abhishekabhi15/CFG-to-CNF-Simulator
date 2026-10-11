import { Grammar, Production, TransformationStep } from './types';
import {
  cloneGrammar,
  diffProductions,
  formatProduction,
  formatRhs,
  createProductionId,
  deduplicateProductions
} from './grammarUtils';

/**
 * Checks whether a production is a unit production: A → B where B ∈ V
 */
export function isUnitProduction(prod: Production, variables: Set<string>): boolean {
  return prod.rhs.length === 1 && variables.has(prod.rhs[0]);
}

/**
 * Computes the Unit Closure for each variable in the grammar.
 * Unit(A) = { B ∈ V | A ⇒* B through 0 or more unit steps }
 */
export function computeUnitClosures(
  variables: string[],
  productions: Production[]
): Map<string, Set<string>> {
  const varSet = new Set(variables);
  const closures = new Map<string, Set<string>>();

  // Initialize Unit(A) = {A} for each variable
  for (const v of variables) {
    closures.set(v, new Set([v]));
  }

  // Unit production adjacency list
  const unitEdges = new Map<string, Set<string>>();
  for (const v of variables) {
    unitEdges.set(v, new Set());
  }

  for (const p of productions) {
    if (isUnitProduction(p, varSet)) {
      unitEdges.get(p.lhs)?.add(p.rhs[0]);
    }
  }

  // Compute transitive closure using BFS/DFS
  for (const v of variables) {
    const closure = closures.get(v)!;
    const queue = [v];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = unitEdges.get(curr) || new Set();

      for (const next of neighbors) {
        if (!closure.has(next)) {
          closure.add(next);
          queue.push(next);
        }
      }
    }
  }

  return closures;
}

/**
 * Eliminates unit productions from grammar step-by-step.
 */
export function eliminateUnitProductions(
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

  const varSet = new Set(currentGrammar.variables);
  const unitProductions = currentGrammar.productions.filter(p => isUnitProduction(p, varSet));

  if (unitProductions.length === 0) {
    const beforeState = cloneGrammar(currentGrammar);
    steps.push({
      id: currentStepId++,
      stageId: 'unit_elimination',
      stageNumber: 3,
      stageName: 'Elimination of Unit Productions',
      subStep: 'Check Unit Productions',
      title: 'No Unit Productions Found',
      mathGoal: 'Verify if any productions of the form A → B (A, B ∈ V) exist in the grammar.',
      explanation: 'No unit productions exist in this grammar. The grammar is already free of unit productions.',
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

    return { steps, finalGrammar: currentGrammar, nextStepId: currentStepId };
  }

  // Step 1: Identify all unit productions and compute unit closures
  const unitClosures = computeUnitClosures(currentGrammar.variables, currentGrammar.productions);
  const closuresRecord: Record<string, string[]> = {};
  unitClosures.forEach((set, v) => {
    closuresRecord[v] = Array.from(set);
  });

  const activeClosures = Array.from(unitClosures.entries())
    .filter(([_, set]) => set.size > 1)
    .map(([v, set]) => `Unit(${v}) = { ${Array.from(set).join(', ')} }`);

  const initialBefore = cloneGrammar(currentGrammar);
  steps.push({
    id: currentStepId++,
    stageId: 'unit_elimination',
    stageNumber: 3,
    stageName: 'Elimination of Unit Productions',
    subStep: 'Compute Unit Closures',
    title: `Compute Unit Closures: Found ${unitProductions.length} Unit Rule(s)`,
    mathGoal: 'Compute the unit-production closure Unit(A) = { B ∈ V | A ⇒* B } for each variable.',
    explanation: `Identified unit production(s): ${unitProductions.map(p => formatProduction(p)).join(', ')}.\n\nTransitive Closures:\n${activeClosures.join('\n')}`,
    examinedRule: unitProductions[0],
    examinedVariable: unitProductions[0].lhs,
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
      unitClosures: closuresRecord
    }
  });

  // Step 2: For each variable A, copy all non-unit productions from every B in Unit(A)
  // To provide granular educational visibility, we process each variable A and its reachable targets B
  for (const A of currentGrammar.variables) {
    const reachableTargets = Array.from(unitClosures.get(A) || new Set<string>()).filter(b => b !== A);
    if (reachableTargets.length === 0) continue;

    for (const B of reachableTargets) {
      // Find all non-unit productions of B in current grammar
      const bNonUnitProds = currentGrammar.productions.filter(
        p => p.lhs === B && !isUnitProduction(p, varSet)
      );

      if (bNonUnitProds.length === 0) continue;

      const beforeState = cloneGrammar(currentGrammar);
      const addedForTarget: Production[] = [];

      for (const p of bNonUnitProds) {
        const candidateId = createProductionId(A, p.rhs);
        const alreadyExists = currentGrammar.productions.some(existing => existing.id === candidateId);
        const inAdded = addedForTarget.some(existing => existing.id === candidateId);

        if (!alreadyExists && !inAdded) {
          const newProd: Production = {
            id: candidateId,
            lhs: A,
            rhs: [...p.rhs]
          };
          addedForTarget.push(newProd);
          currentGrammar.productions.push(newProd);
        }
      }

      if (addedForTarget.length > 0) {
        const diff = diffProductions(beforeState.productions, currentGrammar.productions);
        steps.push({
          id: currentStepId++,
          stageId: 'unit_elimination',
          stageNumber: 3,
          stageName: 'Elimination of Unit Productions',
          subStep: 'Copy Derivations Through Unit Closure',
          title: `Copy Non-Unit Rules: ${A} ⇒* ${B}`,
          mathGoal: `Preserve derivations of ${A} by inheriting all non-unit productions from ${B}.`,
          explanation: `Because ${A} ⇒* ${B} via unit productions, any string derivable from ${B} is also derivable from ${A}. Copying non-unit rule(s) from ${B} (${bNonUnitProds.map(p => formatProduction(p)).join(', ')}):\nIntroduced into ${A}: ${addedForTarget.map(p => formatProduction(p)).join(', ')}.`,
          examinedRule: {
            id: `unit-${A}-${B}`,
            lhs: A,
            rhs: [B]
          },
          examinedVariable: A,
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
  }

  // Step 3: Remove all unit productions A → B
  const unitProdsToRemove = currentGrammar.productions.filter(p => isUnitProduction(p, varSet));

  for (const unitProd of unitProdsToRemove) {
    const beforeState = cloneGrammar(currentGrammar);
    currentGrammar.productions = currentGrammar.productions.filter(p => p.id !== unitProd.id);
    const diff = diffProductions(beforeState.productions, currentGrammar.productions);

    steps.push({
      id: currentStepId++,
      stageId: 'unit_elimination',
      stageNumber: 3,
      stageName: 'Elimination of Unit Productions',
      subStep: 'Remove Unit Production',
      title: `Remove Unit Production: ${formatProduction(unitProd)}`,
      mathGoal: 'Eliminate unit rule A → B now that its transitive non-unit derivations have been copied directly to A.',
      explanation: `The unit production ${formatProduction(unitProd)} is removed. Direct derivations replace this intermediate hop without altering the generated language.`,
      examinedRule: unitProd,
      examinedVariable: unitProd.lhs,
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
