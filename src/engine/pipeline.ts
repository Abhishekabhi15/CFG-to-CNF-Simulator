import {
  Grammar,
  PipelineResult,
  TransformationStep,
  ConversionSummary,
  LanguagePreservationReport
} from './types';
import {
  cloneGrammar,
  diffProductions,
  groupProductionsByLhs,
  isEpsilon
} from './grammarUtils';
import { eliminateNullProductions } from './nullable';
import { eliminateUnitProductions } from './unitProductions';
import { eliminateUselessVariables } from './uselessSymbols';
import { convertToCnf } from './cnfConversion';
import { verifyCnf } from './cnfVerifier';

/**
 * Generates sample terminal strings for bounded empirical language verification.
 */
function generateSampleStrings(grammar: Grammar, maxLength = 5, maxIterations = 2500): Set<string> {
  const terminalSet = new Set(grammar.terminals);
  const termStrings = new Set<string>();

  const queue: string[][] = [[grammar.startSymbol]];
  const seenForms = new Set<string>();
  seenForms.add(grammar.startSymbol);

  let iterations = 0;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;

    if (current.length > maxLength * 2) {
      continue;
    }

    const isTerminal = current.every(sym => terminalSet.has(sym) || isEpsilon(sym));
    if (isTerminal) {
      const str = current.filter(s => !isEpsilon(s)).join('');
      if (str.length <= maxLength) {
        termStrings.add(str);
      }
      continue;
    }

    const nonTermIdx = current.findIndex(sym => !terminalSet.has(sym) && !isEpsilon(sym));
    if (nonTermIdx === -1) continue;

    const nonTerm = current[nonTermIdx];
    const rules = grammar.productions.filter(p => p.lhs === nonTerm);

    for (const rule of rules) {
      const nextForm: string[] = [];
      for (let i = 0; i < current.length; i++) {
        if (i === nonTermIdx) {
          for (const s of rule.rhs) {
            if (!isEpsilon(s)) {
              nextForm.push(s);
            }
          }
        } else {
          nextForm.push(current[i]);
        }
      }

      const key = nextForm.join(' ');
      if (!seenForms.has(key) && nextForm.length <= maxLength * 2) {
        seenForms.add(key);
        queue.push(nextForm);
      }
    }
  }

  return termStrings;
}

/**
 * Tests bounded empirical language equivalence between original CFG and final CNF grammar.
 */
function evaluateLanguagePreservation(
  originalGrammar: Grammar,
  finalGrammar: Grammar
): LanguagePreservationReport {
  try {
    const origStrings = generateSampleStrings(originalGrammar, 5, 2000);
    const cnfStrings = generateSampleStrings(finalGrammar, 5, 2000);

    const missingInCNF: string[] = [];
    for (const s of origStrings) {
      if (!cnfStrings.has(s)) missingInCNF.push(s);
    }

    const extraInCNF: string[] = [];
    for (const s of cnfStrings) {
      if (!origStrings.has(s)) extraInCNF.push(s);
    }

    const isPreserved = missingInCNF.length === 0 && extraInCNF.length === 0;
    const sampleStringsOrig = Array.from(origStrings).slice(0, 10);
    const sampleStringsCNF = Array.from(cnfStrings).slice(0, 10);

    return {
      tested: true,
      isPreserved,
      testedStringCount: origStrings.size,
      matchedStringCount: origStrings.size - missingInCNF.length,
      sampleStringsOriginal: sampleStringsOrig,
      sampleStringsCNF: sampleStringsCNF,
      missingInCNF,
      extraInCNF,
      details: isPreserved
        ? `Empirically verified across ${origStrings.size} bounded derivations (length ≤ 5). Zero missing or extraneous strings.`
        : `Discrepancy found: ${missingInCNF.length} string(s) missing, ${extraInCNF.length} string(s) extra.`
    };
  } catch {
    return {
      tested: false,
      isPreserved: false,
      testedStringCount: 0,
      matchedStringCount: 0,
      sampleStringsOriginal: [],
      sampleStringsCNF: [],
      missingInCNF: [],
      extraInCNF: [],
      details: 'Language testing skipped due to recursion depth or complexity limit.'
    };
  }
}

export function runConversionPipeline(inputGrammar: Grammar): PipelineResult {
  const allSteps: TransformationStep[] = [];
  let stepId = 1;

  // Step 0 / Stage 1: Initial Grammar State
  const initialGrammar = cloneGrammar(inputGrammar);

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

  // Independent CNF Verification (Checks 1-7: Form, Unit, Epsilon, Mixed, Length, Defined, Useful)
  const verification = verifyCnf(finalGrammar, emptyStringAccepted);

  // Separate Language Preservation Testing
  const languagePreservation = evaluateLanguagePreservation(initialGrammar, finalGrammar);

  // Canonical comparison: diff between original grammar and final grammar
  const canonicalDiff = diffProductions(inputGrammar.productions, finalGrammar.productions);
  const productionsAddedCount = canonicalDiff.added.length;
  const productionsRemovedCount = canonicalDiff.removed.length;
  const productionsRetainedCount = canonicalDiff.unchanged.length;
  const netRuleChange = finalGrammar.productions.length - inputGrammar.productions.length;

  const originalVariableRowCount = groupProductionsByLhs(inputGrammar.productions).size;
  const finalVariableRowCount = groupProductionsByLhs(finalGrammar.productions).size;

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
    originalVariableRowCount,
    finalVariables: finalGrammar.variables,
    finalTerminals: finalGrammar.terminals,
    finalStartSymbol: finalGrammar.startSymbol,
    finalProductionCount: finalGrammar.productions.length,
    finalVariableRowCount,
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
    verification,
    languagePreservation
  };
}
