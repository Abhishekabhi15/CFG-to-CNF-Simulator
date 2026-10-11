import { Grammar, PipelineResult, TransformationStep, ConversionSummary } from './types';
import { cloneGrammar, diffProductions } from './grammarUtils';
import { eliminateNullProductions } from './nullable';
import { eliminateUnitProductions } from './unitProductions';
import { eliminateUselessVariables } from './uselessSymbols';
import { convertToCnf } from './cnfConversion';
import { verifyCnf } from './cnfVerifier';

export function runConversionPipeline(inputGrammar: Grammar): PipelineResult {
  const allSteps: TransformationStep[] = [];
  let stepId = 1;

  // Step 0 / Stage 1: Initial Grammar State
  const initialGrammar = cloneGrammar(inputGrammar);
  const initialDiff = diffProductions([], initialGrammar.productions);

  allSteps.push({
    id: stepId++,
    stageId: 'input',
    stageNumber: 1,
    stageName: 'CFG Input & Parsing',
    subStep: 'Validated Input Grammar',
    title: 'Initial Context-Free Grammar G = (V, Σ, R, S)',
    mathGoal: 'Validate formal specification and load grammar into the conversion engine.',
    explanation: `Grammar loaded with:\n• ${initialGrammar.variables.length} Variables (V): {${initialGrammar.variables.join(', ')}}\n• ${initialGrammar.terminals.length} Terminals (Σ): {${initialGrammar.terminals.join(', ')}}\n• Start Symbol (S): ${initialGrammar.startSymbol}\n• ${initialGrammar.productions.length} Production Rules (R).`,
    examinedRule: null,
    examinedVariable: initialGrammar.startSymbol,
    beforeGrammar: initialGrammar,
    afterGrammar: cloneGrammar(initialGrammar),
    addedProductions: [],
    removedProductions: [],
    unchangedProductions: initialGrammar.productions,
    rulesBefore: initialGrammar.productions.length,
    rulesAdded: 0,
    rulesRemoved: 0,
    rulesAfter: initialGrammar.productions.length
  });

  // Stage 2: Elimination of Null Productions
  const nullResult = eliminateNullProductions(initialGrammar, stepId);
  allSteps.push(...nullResult.steps);
  stepId = nullResult.nextStepId;

  // Stage 3: Elimination of Unit Productions
  const unitResult = eliminateUnitProductions(nullResult.finalGrammar, stepId);
  allSteps.push(...unitResult.steps);
  stepId = unitResult.nextStepId;

  // Stage 4: Identification and Removal of Useless Variables
  const uselessResult = eliminateUselessVariables(unitResult.finalGrammar, stepId);
  allSteps.push(...uselessResult.steps);
  stepId = uselessResult.nextStepId;

  // Stage 5: CNF Conversion (Terminal Replacement & Binarization)
  const cnfResult = convertToCnf(uselessResult.finalGrammar, stepId);
  allSteps.push(...cnfResult.steps);

  const finalGrammar = cnfResult.finalGrammar;

  // Strictly ensure that the final step's afterGrammar matches the final grammar
  if (allSteps.length > 0) {
    allSteps[allSteps.length - 1].afterGrammar = cloneGrammar(finalGrammar);
  }

  // Check if empty string is in language (did we preserve S0 → ε)
  const emptyStringAccepted = finalGrammar.productions.some(
    p => p.lhs === finalGrammar.startSymbol && p.rhs.length === 1 && (p.rhs[0] === 'ε' || p.rhs[0] === 'epsilon')
  );

  // Independent CNF Verification
  const verification = verifyCnf(finalGrammar, emptyStringAccepted);

  // Canonical comparison: diff between original grammar and final grammar
  const canonicalDiff = diffProductions(inputGrammar.productions, finalGrammar.productions);
  const productionsAddedCount = canonicalDiff.added.length;
  const productionsRemovedCount = canonicalDiff.removed.length;
  const productionsRetainedCount = canonicalDiff.unchanged.length;
  const netRuleChange = finalGrammar.productions.length - inputGrammar.productions.length;

  // Separate transformation-event statistics across pipeline steps
  let transformationEventsAdded = 0;
  let transformationEventsRemoved = 0;
  allSteps.forEach(s => {
    if (s.stageId !== 'input') {
      transformationEventsAdded += s.addedProductions.length;
      transformationEventsRemoved += s.removedProductions.length;
    }
  });

  const summary: ConversionSummary = {
    originalVariables: inputGrammar.variables,
    originalTerminals: inputGrammar.terminals,
    originalStartSymbol: inputGrammar.startSymbol,
    originalProductionCount: inputGrammar.productions.length,
    finalVariables: finalGrammar.variables,
    finalTerminals: finalGrammar.terminals,
    finalStartSymbol: finalGrammar.startSymbol,
    finalProductionCount: finalGrammar.productions.length,
    netRuleChange,
    productionsAddedCount,
    productionsRemovedCount,
    productionsRetainedCount,
    totalAdded: productionsAddedCount,
    totalRemoved: productionsRemovedCount,
    totalSteps: allSteps.length,
    transformationEventsAdded,
    transformationEventsRemoved,
    emptyStringAccepted
  };

  return {
    steps: allSteps,
    originalGrammar: inputGrammar,
    finalGrammar,
    summary,
    verification
  };
}
