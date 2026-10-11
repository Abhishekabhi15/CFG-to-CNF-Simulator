import { parseGrammar } from './parser';
import { validateGrammar } from './validator';
import { runConversionPipeline } from './pipeline';
import { formatProduction, formatGroupedProductions, isEpsilon } from './grammarUtils';
import { GRAMMAR_PRESETS } from './presets';
import { Grammar } from './types';
import { eliminateNullProductions } from './nullable';
import { eliminateUnitProductions } from './unitProductions';
import { eliminateUselessVariables } from './uselessSymbols';
import { convertToCnf } from './cnfConversion';

/**
 * BFS string generator for a grammar up to a maximum length and max iterations.
 * Used to empirically prove that L(G) = L(G') for bounded string lengths.
 */
function generateLanguageStrings(grammar: Grammar, maxLength: number, maxIterations = 5000): Set<string> {
  const terminalSet = new Set(grammar.terminals);
  const termStrings = new Set<string>();

  // Queue of sentential forms (array of symbol strings)
  const queue: string[][] = [[grammar.startSymbol]];
  const seenForms = new Set<string>();
  seenForms.add(grammar.startSymbol);

  let iterations = 0;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;

    // Check if current form exceeds length limit
    if (current.length > maxLength * 2) {
      continue;
    }

    // Check if all symbols are terminals (or epsilon)
    const isTerminal = current.every(sym => terminalSet.has(sym) || isEpsilon(sym));
    if (isTerminal) {
      const str = current.filter(s => !isEpsilon(s)).join('');
      if (str.length <= maxLength) {
        termStrings.add(str);
      }
      continue;
    }

    // Find first non-terminal to expand (leftmost derivation)
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

// ==========================================
// REGRESSION TEST SUITE
// ==========================================
console.log('=== RUNNING CFG TO CNF REGRESSION TEST SUITE ===\n');

const benchmarkPreset = GRAMMAR_PRESETS[0];

// ----------------------------------------------------
// TEST 1: STAGE 1 - Input Parsing and Grammar Validation
// ----------------------------------------------------
console.log('Test 1: Stage 1 - Input Parsing & Initial Validation');
const { grammar: originalGrammar, errors } = parseGrammar(
  benchmarkPreset.variables,
  benchmarkPreset.terminals,
  benchmarkPreset.startSymbol,
  benchmarkPreset.productions
);

if (errors.length > 0) {
  console.error('FAIL: Grammar parse failed:', errors);
  process.exit(1);
}

const validation = validateGrammar(originalGrammar);
if (!validation.isValid) {
  console.error('FAIL: Initial grammar validation failed:', validation.errors);
  process.exit(1);
}
console.log(`• Parsed ${originalGrammar.variables.length} variables and ${originalGrammar.productions.length} production rules: PASS`);
console.log(`• Initial validation valid: PASS`);

// ----------------------------------------------------
// TEST 2: STAGE 2 - Nullable Production Elimination
// ----------------------------------------------------
console.log('\nTest 2: Stage 2 - Nullable Elimination & Nullable Branch of S → ABC');
const nullResult = eliminateNullProductions(originalGrammar, 1);
const nullProds = nullResult.finalGrammar.productions;

// A should be nullable
const hasEpsilonRuleInStage2 = nullProds.some(p => p.rhs.length === 1 && isEpsilon(p.rhs[0]));
if (hasEpsilonRuleInStage2) {
  console.error('FAIL: Stage 2 final grammar still contains an epsilon production!');
  process.exit(1);
}
console.log('• Epsilon production A → ε removed: PASS');

// S → AB with A nullable produces S → B
const hasSToB = nullProds.some(p => p.lhs === 'S' && p.rhs.join('') === 'B');
console.log(`• S → AB produces S → B: ${hasSToB ? 'PASS' : 'FAIL'}`);
if (!hasSToB) {
  console.error('FAIL: S → B was not generated from S → AB with nullable A!');
  process.exit(1);
}

// S → ABC with A nullable produces S → BC
const hasSToBC_Stage2 = nullProds.some(p => p.lhs === 'S' && p.rhs.join('') === 'BC');
console.log(`• S → ABC produces S → BC (nullable expansion): ${hasSToBC_Stage2 ? 'PASS' : 'FAIL'}`);
if (!hasSToBC_Stage2) {
  console.error('FAIL: S → BC was not generated from S → ABC with nullable A!');
  process.exit(1);
}

// S → ABC should still remain for subsequent binarization
const hasSToABC_Stage2 = nullProds.some(p => p.lhs === 'S' && p.rhs.join('') === 'ABC');
console.log(`• S → ABC retained for later binarization: ${hasSToABC_Stage2 ? 'PASS' : 'FAIL'}`);
if (!hasSToABC_Stage2) {
  console.error('FAIL: S → ABC was unexpectedly removed in nullable elimination!');
  process.exit(1);
}

// A → aA with A nullable produces A → a
const hasAToa = nullProds.some(p => p.lhs === 'A' && p.rhs.join('') === 'a');
console.log(`• A → aA produces A → a: ${hasAToa ? 'PASS' : 'FAIL'}`);
if (!hasAToa) {
  console.error('FAIL: A → a was not generated from A → aA!');
  process.exit(1);
}

// ----------------------------------------------------
// TEST 3: STAGE 3 - Unit Production Elimination
// ----------------------------------------------------
console.log('\nTest 3: Stage 3 - Unit Production Elimination');
const unitResult = eliminateUnitProductions(nullResult.finalGrammar, nullResult.nextStepId);
const unitProds = unitResult.finalGrammar.productions;
const varSetStage3 = new Set(unitResult.finalGrammar.variables);

const remainingUnitRules = unitProds.filter(p => p.rhs.length === 1 && varSetStage3.has(p.rhs[0]));
console.log(`• Unit productions remaining: ${remainingUnitRules.length} (expected 0)`);
if (remainingUnitRules.length > 0) {
  console.error('FAIL: Unit productions still exist after Stage 3:', remainingUnitRules);
  process.exit(1);
}
console.log('• Unit production elimination clean: PASS');

// ----------------------------------------------------
// TEST 4: STAGE 4 - Useless Variable Elimination
// ----------------------------------------------------
console.log('\nTest 4: Stage 4 - Useless Symbols Elimination');
const uselessResult = eliminateUselessVariables(unitResult.finalGrammar, unitResult.nextStepId);
const uselessVars = uselessResult.finalGrammar.variables;

console.log(`• Variable E present in grammar: ${uselessVars.includes('E') ? 'YES (FAIL)' : 'NO (PASS)'}`);
if (uselessVars.includes('E')) {
  console.error('FAIL: Non-generating variable E was not removed!');
  process.exit(1);
}

const ruleWithE = uselessResult.finalGrammar.productions.some(p => p.lhs === 'E' || p.rhs.includes('E'));
console.log(`• Rules involving E present: ${ruleWithE ? 'YES (FAIL)' : 'NO (PASS)'}`);
if (ruleWithE) {
  console.error('FAIL: Rules containing E remain in grammar!');
  process.exit(1);
}
console.log('• Useless symbols correctly eliminated: PASS');

// ----------------------------------------------------
// TEST 5: STAGE 5 - CNF Conversion (Terminal Replacement & Binarization)
// ----------------------------------------------------
console.log('\nTest 5: Stage 5 - CNF Conversion (Terminals & Binarization)');
const cnfResult = convertToCnf(uselessResult.finalGrammar, uselessResult.nextStepId);
const cnfProds = cnfResult.finalGrammar.productions;

// Terminal replacements
const mixedTermRules = cnfProds.filter(
  p => p.rhs.length >= 2 && p.rhs.some(sym => cnfResult.finalGrammar.terminals.includes(sym))
);
console.log(`• Mixed multi-symbol rules with terminals: ${mixedTermRules.length} (expected 0)`);
if (mixedTermRules.length > 0) {
  console.error('FAIL: Found mixed terminal rules:', mixedTermRules);
  process.exit(1);
}

// Binarization of S → ABC
const sToAh1 = cnfProds.some(p => p.lhs === 'S' && p.rhs.length === 2 && p.rhs[0] === 'A');
const helperToBc = cnfProds.some(p => p.lhs !== 'S' && p.rhs.length === 2 && p.rhs[0] === 'B' && p.rhs[1] === 'C');
console.log(`• S → AH1 (or equivalent helper) present: ${sToAh1 ? 'PASS' : 'FAIL'}`);
console.log(`• H1 → BC (or equivalent helper) present: ${helperToBc ? 'PASS' : 'FAIL'}`);
if (!sToAh1 || !helperToBc) {
  console.error('FAIL: S → ABC was not correctly binarized into S → AH1 and H1 → BC!');
  process.exit(1);
}

// Length check
const longRules = cnfProds.filter(p => p.rhs.length > 2);
console.log(`• Productions with |RHS| > 2: ${longRules.length} (expected 0)`);
if (longRules.length > 0) {
  console.error('FAIL: Rules with |RHS| > 2 remain:', longRules);
  process.exit(1);
}
console.log('• CNF Stage 5 transformations mathematically valid: PASS');

// ----------------------------------------------------
// TEST 6: Derivational Origin of S → BC vs H1 → BC & Pipeline Run
// ----------------------------------------------------
console.log('\nTest 6: Pipeline Execution & Derivational Origins');
const pipelineResult = runConversionPipeline(originalGrammar);

const nullableSteps = pipelineResult.steps.filter(s => s.stageId === 'null_elimination');
const sToBcInNullable = nullableSteps.some(s =>
  s.addedProductions.some(p => p.lhs === 'S' && p.rhs.join('') === 'BC')
);
console.log(`• S → BC generated during Nullable Expansion: ${sToBcInNullable ? 'YES (PASS)' : 'NO (FAIL)'}`);
if (!sToBcInNullable) {
  console.error('FAIL: S → BC must be recorded as generated during nullable expansion!');
  process.exit(1);
}

const binarizeSteps = pipelineResult.steps.filter(s =>
  s.stageId === 'cnf_conversion' && s.subStep === 'Binarize Long Production'
);
const sToBcDuplicatedInBinarization = binarizeSteps.some(s =>
  s.addedProductions.some(p => p.lhs === 'S' && p.rhs.join('') === 'BC')
);
console.log(`• S → BC duplicated in Binarization: ${sToBcDuplicatedInBinarization ? 'YES (FAIL)' : 'NO (PASS)'}`);
if (sToBcDuplicatedInBinarization) {
  console.error('FAIL: S → BC was mistakenly duplicated during binarization!');
  process.exit(1);
}

const helperBcInBinarization = binarizeSteps.some(s =>
  s.addedProductions.some(p => p.lhs !== 'S' && p.rhs.join('') === 'BC')
);
console.log(`• Helper variable binarization rule (H1 → BC) generated in Binarization: ${helperBcInBinarization ? 'YES (PASS)' : 'NO (FAIL)'}`);
if (!helperBcInBinarization) {
  console.error('FAIL: Helper rule for binarization (H1 → BC) not generated in binarization!');
  process.exit(1);
}

// ----------------------------------------------------
// TEST 7: Canonical Final Grammar Equality & Transformation Snapshot
// ----------------------------------------------------
console.log('\nTest 7: Canonical Final Grammar & Snapshot Identity');
const finalGrammar = pipelineResult.finalGrammar;
const lastStep = pipelineResult.steps[pipelineResult.steps.length - 1];

// Verify identical to snapshot
const finalIds = new Set(finalGrammar.productions.map(p => `${p.lhs}->${p.rhs.join('')}`));
const snapshotIds = new Set(lastStep.afterGrammar.productions.map(p => `${p.lhs}->${p.rhs.join('')}`));

let snapshotMatch = finalIds.size === snapshotIds.size;
for (const id of finalIds) {
  if (!snapshotIds.has(id)) {
    snapshotMatch = false;
    break;
  }
}
console.log(`• Displayed final grammar is identical to final transformation snapshot: ${snapshotMatch ? 'PASS' : 'FAIL'}`);
if (!snapshotMatch) {
  console.error('FAIL: Final grammar does not match the final transformation snapshot!');
  process.exit(1);
}

// Canonical production count check:
// S → AB | BC | b | XD | YB | AH1  (6)
// A → a | XA                       (2)
// B → b | YB                       (2)
// C → AB | b | YB                  (3)
// D → d                            (1)
// X → a                            (1)
// Y → b                            (1)
// H1 → BC                          (1)
// Total = 17 productions across 8 variables
const groupedLines = formatGroupedProductions(finalGrammar.productions);
console.log(`• Final variable count: ${finalGrammar.variables.length} (expected 8)`);
console.log(`• Final production count: ${finalGrammar.productions.length} (expected 17)`);
console.log('• Formatted grouped grammar:');
groupedLines.forEach(l => console.log(`   ${l}`));

if (finalGrammar.variables.length !== 8) {
  console.error(`FAIL: Expected 8 variables, got ${finalGrammar.variables.length}`);
  process.exit(1);
}
if (finalGrammar.productions.length !== 17) {
  console.error(`FAIL: Expected 17 productions, got ${finalGrammar.productions.length}`);
  process.exit(1);
}

// Check every expected production exists
const expectedProductions = [
  'S -> AB', 'S -> BC', 'S -> b', 'S -> XD', 'S -> YB', 'S -> AH1',
  'A -> a', 'A -> XA',
  'B -> b', 'B -> YB',
  'C -> AB', 'C -> b', 'C -> YB',
  'D -> d',
  'X -> a',
  'Y -> b',
  'H1 -> BC'
];
for (const exp of expectedProductions) {
  const [lhs, rhsStr] = exp.split(' -> ');
  const found = finalGrammar.productions.some(p => p.lhs === lhs && p.rhs.join('') === rhsStr);
  if (!found) {
    console.error(`FAIL: Missing expected canonical production ${exp}!`);
    process.exit(1);
  }
}
console.log('• All 17 canonical productions present in final grammar: PASS');

// ----------------------------------------------------
// TEST 8: Independent Structural CNF Verification
// ----------------------------------------------------
console.log('\nTest 8: Independent Structural CNF Verification');
const { verification } = pipelineResult;
console.log(`• Is Valid CNF: ${verification.isValidCNF ? 'PASS' : 'FAIL'}`);
verification.checks.forEach(c => {
  console.log(`  [${c.passed ? 'PASS' : 'FAIL'}] ${c.title}: ${c.details}`);
  if (!c.passed) {
    console.error(`FAIL: Check ${c.title} failed!`);
    process.exit(1);
  }
});

// ----------------------------------------------------
// TEST 9: Empirical Language Preservation (Separate from CNF Syntax)
// ----------------------------------------------------
console.log('\nTest 9: Empirical Language Preservation (Separate from CNF Syntax)');
console.log('Generating sample terminal strings up to length 6...');
const originalStrings = generateLanguageStrings(originalGrammar, 6);
const cnfStrings = generateLanguageStrings(finalGrammar, 6);

console.log(`• Original grammar produced ${originalStrings.size} strings (len ≤ 6)`);
console.log(`• CNF grammar produced ${cnfStrings.size} strings (len ≤ 6)`);

let missingInCnf: string[] = [];
for (const str of originalStrings) {
  if (!cnfStrings.has(str)) missingInCnf.push(str);
}

let extraInCnf: string[] = [];
for (const str of cnfStrings) {
  if (!originalStrings.has(str)) extraInCnf.push(str);
}

console.log(`• Missing in CNF: ${missingInCnf.length === 0 ? 'None (PASS)' : missingInCnf.join(', ')}`);
console.log(`• Extra in CNF: ${extraInCnf.length === 0 ? 'None (PASS)' : extraInCnf.join(', ')}`);

if (missingInCnf.length > 0 || extraInCnf.length > 0) {
  console.error('FAIL: Language equivalence violated!');
  process.exit(1);
}

// ----------------------------------------------------
// TEST 10: Canonical Metrics and Accounting Consistency
// ----------------------------------------------------
console.log('\nTest 10: Canonical Metrics and Accounting Consistency');
const { summary } = pipelineResult;
console.log(`• Original Rules: ${summary.originalProductionCount} (expected 11)`);
console.log(`• Final CNF Rules: ${summary.finalProductionCount} (expected 17)`);
console.log(`• Net Rule Change: ${summary.netRuleChange} (expected +6)`);
console.log(`• Productions Added: ${summary.productionsAddedCount} (expected +13)`);
console.log(`• Productions Removed: ${summary.productionsRemovedCount} (expected -7)`);
console.log(`• Productions Retained: ${summary.productionsRetainedCount} (expected 4)`);

if (summary.originalProductionCount !== 11 || summary.finalProductionCount !== 17 || summary.netRuleChange !== 6) {
  console.error('FAIL: Rule count or net change accounting error!');
  process.exit(1);
}
if (summary.productionsAddedCount !== 13 || summary.productionsRemovedCount !== 7 || summary.productionsRetainedCount !== 4) {
  console.error('FAIL: Canonical set difference accounting error!');
  process.exit(1);
}
if (summary.originalProductionCount + summary.productionsAddedCount - summary.productionsRemovedCount !== summary.finalProductionCount) {
  console.error('FAIL: Identity Original + Added - Removed === Final violated!');
  process.exit(1);
}
console.log('• Conservation Identity (11 + 13 - 7 = 17): PASS');

console.log('\n=== ALL 10 REGRESSION TESTS PASSED CLEANLY! ===\n');
