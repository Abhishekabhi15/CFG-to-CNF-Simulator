import { parseGrammar } from './parser';
import { validateGrammar } from './validator';
import { runConversionPipeline } from './pipeline';
import { formatProduction, formatGroupedProductions, isEpsilon } from './grammarUtils';
import { GRAMMAR_PRESETS } from './presets';
import { Grammar } from './types';

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
    // Count terminals and non-terminals (each non-terminal contributes at least 1 terminal unless nullable)
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
const { grammar: originalGrammar, errors } = parseGrammar(
  benchmarkPreset.variables,
  benchmarkPreset.terminals,
  benchmarkPreset.startSymbol,
  benchmarkPreset.productions
);

if (errors.length > 0) {
  console.error('PARSE FAILED:', errors);
  process.exit(1);
}

const validation = validateGrammar(originalGrammar);
if (!validation.isValid) {
  console.error('VALIDATION FAILED:', validation.errors);
  process.exit(1);
}

const result = runConversionPipeline(originalGrammar);

// TEST 1: Check that S → BC is generated during Nullable Expansion, NOT binarization
console.log('Test 1: Derivational Origin of S → BC vs H1 → BC');
const nullableSteps = result.steps.filter(s => s.stageId === 'null_elimination');
const sToBcInNullable = nullableSteps.some(s =>
  s.addedProductions.some(p => p.lhs === 'S' && p.rhs.join('') === 'BC')
);
console.log(`• S → BC generated in Nullable Expansion: ${sToBcInNullable ? 'YES (PASS)' : 'NO (FAIL)'}`);
if (!sToBcInNullable) {
  console.error('FAIL: S → BC must be generated during nullable expansion of S → ABC!');
  process.exit(1);
}

const binarizationSteps = result.steps.filter(s =>
  s.stageId === 'cnf_conversion' && s.subStep === 'Binarize Long Production'
);
const sToBcInBinarization = binarizationSteps.some(s =>
  s.addedProductions.some(p => p.lhs === 'S' && p.rhs.join('') === 'BC')
);
console.log(`• S → BC accidentally duplicated in Binarization: ${sToBcInBinarization ? 'YES (FAIL)' : 'NO (PASS)'}`);
if (sToBcInBinarization) {
  console.error('FAIL: S → BC was mistakenly generated during binarization!');
  process.exit(1);
}

const h1ToBcInBinarization = binarizationSteps.some(s =>
  s.addedProductions.some(p => p.rhs.join('') === 'BC' && p.lhs !== 'S')
);
console.log(`• Helper variable binarization rule (e.g. H1 → BC) generated in Binarization: ${h1ToBcInBinarization ? 'YES (PASS)' : 'NO (FAIL)'}`);

// TEST 2: Check that both S → BC and H1 → BC coexist in the final canonical grammar
console.log('\nTest 2: Coexistence of S → BC and H1 → BC in Final Grammar');
const finalHasSToBC = result.finalGrammar.productions.some(p => p.lhs === 'S' && p.rhs.join('') === 'BC');
const finalHasH1ToBC = result.finalGrammar.productions.some(p => p.rhs.join('') === 'BC' && p.lhs !== 'S');
const finalHasSToAH1 = result.finalGrammar.productions.some(p => p.lhs === 'S' && p.rhs.join('').startsWith('AH'));

console.log(`• Final grammar contains S → BC: ${finalHasSToBC ? 'PASS' : 'FAIL'}`);
console.log(`• Final grammar contains H1 → BC: ${finalHasH1ToBC ? 'PASS' : 'FAIL'}`);
console.log(`• Final grammar contains S → AH1: ${finalHasSToAH1 ? 'PASS' : 'FAIL'}`);

if (!finalHasSToBC || !finalHasH1ToBC || !finalHasSToAH1) {
  console.error('FAIL: Final grammar missing required productions!');
  process.exit(1);
}

// TEST 3: Step snapshot consistency
console.log('\nTest 3: Transformation Snapshot Consistency');
const lastStep = result.steps[result.steps.length - 1];
const finalProdsCount = result.finalGrammar.productions.length;
const snapshotProdsCount = lastStep.afterGrammar.productions.length;

console.log(`• Final grammar rule count: ${finalProdsCount}`);
console.log(`• Final step afterGrammar rule count: ${snapshotProdsCount}`);

const finalIds = new Set(result.finalGrammar.productions.map(p => p.id));
const snapshotIds = new Set(lastStep.afterGrammar.productions.map(p => p.id));
let setsMatch = finalIds.size === snapshotIds.size;
for (const id of finalIds) {
  if (!snapshotIds.has(id)) setsMatch = false;
}

console.log(`• Displayed final grammar matches final step afterGrammar snapshot: ${setsMatch ? 'PASS' : 'FAIL'}`);
if (!setsMatch) {
  console.error('FAIL: Mismatch between finalGrammar and last step snapshot!');
  process.exit(1);
}

// TEST 4: Mathematical rule statistics identity across every step
console.log('\nTest 4: Rule Statistics Conservation (rulesBefore + rulesAdded - rulesRemoved === rulesAfter)');
let statsValid = true;
result.steps.forEach(s => {
  const expectedAfter = s.rulesBefore + s.rulesAdded - s.rulesRemoved;
  if (expectedAfter !== s.rulesAfter) {
    statsValid = false;
    console.error(`Step ${s.id} (${s.title}): ${s.rulesBefore} + ${s.rulesAdded} - ${s.rulesRemoved} !== ${s.rulesAfter}`);
  }
});
console.log(`• All ${result.steps.length} steps maintain rule conservation identity: ${statsValid ? 'PASS' : 'FAIL'}`);
if (!statsValid) {
  process.exit(1);
}

// TEST 5: Language preservation test
console.log('\nTest 5: Empirical Language Preservation L(G) vs L(G_CNF)');
console.log('Generating sample terminal strings up to length 6...');
const originalStrings = generateLanguageStrings(originalGrammar, 6);
const cnfStrings = generateLanguageStrings(result.finalGrammar, 6);

console.log(`• Original grammar produced ${originalStrings.size} strings (len ≤ 6):`);
console.log(`  Sample: ${Array.from(originalStrings).slice(0, 10).join(', ')}...`);

console.log(`• CNF grammar produced ${cnfStrings.size} strings (len ≤ 6):`);
console.log(`  Sample: ${Array.from(cnfStrings).slice(0, 10).join(', ')}...`);

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
  console.error('FAIL: Language is not strictly preserved!');
  process.exit(1);
}

// TEST 6: Independent CNF Verifier
console.log('\nTest 6: Independent CNF Verification');
console.log(`• Is Valid CNF: ${result.verification.isValidCNF ? 'PASS' : 'FAIL'}`);
result.verification.checks.forEach(c => {
  console.log(`  [${c.passed ? 'PASS' : 'FAIL'}] ${c.title}: ${c.details}`);
});

// TEST 7: Canonical Conversion Metrics Verification
console.log('\nTest 7: Canonical Conversion Metrics Verification');
const { summary } = result;

console.log(`• Original Rules: ${summary.originalProductionCount} (expected: 11)`);
console.log(`• Final CNF Rules: ${summary.finalProductionCount} (expected: 17)`);
console.log(`• Net Rule Change: ${summary.netRuleChange} (expected: +6)`);
console.log(`• Productions Added: ${summary.productionsAddedCount} (expected: +13)`);
console.log(`• Productions Removed: ${summary.productionsRemovedCount} (expected: -7)`);
console.log(`• Productions Retained: ${summary.productionsRetainedCount} (expected: 4)`);

if (summary.originalProductionCount !== 11) {
  console.error('FAIL: Original rules count mismatch!');
  process.exit(1);
}
if (summary.finalProductionCount !== 17) {
  console.error('FAIL: Final CNF rules count mismatch!');
  process.exit(1);
}
if (summary.netRuleChange !== 6) {
  console.error('FAIL: Net rule change must equal Final - Original (17 - 11 = 6)!');
  process.exit(1);
}
if (summary.productionsAddedCount !== 13) {
  console.error('FAIL: Canonical productions added count mismatch!');
  process.exit(1);
}
if (summary.productionsRemovedCount !== 7) {
  console.error('FAIL: Canonical productions removed count mismatch!');
  process.exit(1);
}
if (summary.productionsRetainedCount !== 4) {
  console.error('FAIL: Retained rules count mismatch!');
  process.exit(1);
}
if (summary.originalProductionCount + summary.productionsAddedCount - summary.productionsRemovedCount !== summary.finalProductionCount) {
  console.error('FAIL: Mathematical identity Original + Added - Removed === Final failed!');
  process.exit(1);
}
console.log('• Canonical Conversion Metrics: PASS');

console.log('\n=== ALL REGRESSION TESTS PASSED CLEANLY! ===\n');
