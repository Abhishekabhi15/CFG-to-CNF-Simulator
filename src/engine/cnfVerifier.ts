import { Grammar, Production, VerificationCheck, VerificationReport } from './types';
import { isEpsilon, formatProduction } from './grammarUtils';
import { findGeneratingVariables, findReachableVariables } from './uselessSymbols';

/**
 * Independently validates every production and symbol in the grammar against Chomsky Normal Form.
 */
export function verifyCnf(grammar: Grammar, emptyStringAccepted = false): VerificationReport {
  const { variables, terminals, startSymbol, productions } = grammar;
  const varSet = new Set(variables);
  const termSet = new Set(terminals);

  const checks: VerificationCheck[] = [];

  // 1. Check: Allowed Forms (A → BC or A → a or S0 → ε)
  const invalidFormRules: Production[] = [];
  for (const prod of productions) {
    const isEpsRule = prod.rhs.length === 1 && isEpsilon(prod.rhs[0]);
    if (isEpsRule) {
      if (prod.lhs !== startSymbol) {
        invalidFormRules.push(prod);
      }
      continue;
    }

    if (prod.rhs.length === 1) {
      // Must be a terminal
      if (!termSet.has(prod.rhs[0])) {
        invalidFormRules.push(prod);
      }
    } else if (prod.rhs.length === 2) {
      // Both must be non-terminals
      if (!varSet.has(prod.rhs[0]) || !varSet.has(prod.rhs[1])) {
        invalidFormRules.push(prod);
      }
    } else {
      // Length > 2 or 0
      invalidFormRules.push(prod);
    }
  }

  checks.push({
    id: 'cnf-form',
    title: 'Standard CNF Production Forms',
    description: 'Every production must be A → BC (two non-terminals), A → a (one terminal), or S₀ → ε (start symbol only).',
    passed: invalidFormRules.length === 0,
    violatingRules: invalidFormRules,
    details: invalidFormRules.length === 0
      ? 'All productions conform to valid Chomsky Normal Form syntax.'
      : `${invalidFormRules.length} production(s) violate standard CNF syntax: ${invalidFormRules.map(p => formatProduction(p)).join(', ')}`
  });

  // 2. Check: No Unit Productions (A → B where B ∈ V)
  const unitRules: Production[] = [];
  for (const prod of productions) {
    if (prod.rhs.length === 1 && varSet.has(prod.rhs[0])) {
      unitRules.push(prod);
    }
  }

  checks.push({
    id: 'no-unit',
    title: 'No Unit Productions',
    description: 'No production of the form A → B where B is a non-terminal variable.',
    passed: unitRules.length === 0,
    violatingRules: unitRules,
    details: unitRules.length === 0
      ? 'Zero unit productions found.'
      : `Found ${unitRules.length} unit production(s): ${unitRules.map(p => formatProduction(p)).join(', ')}`
  });

  // 3. Check: No Invalid Epsilon Productions
  const invalidEpsilonRules: Production[] = [];
  for (const prod of productions) {
    if (prod.rhs.length === 1 && isEpsilon(prod.rhs[0])) {
      if (prod.lhs !== startSymbol) {
        invalidEpsilonRules.push(prod);
      }
    }
  }

  checks.push({
    id: 'no-invalid-epsilon',
    title: 'No Invalid Epsilon Productions',
    description: 'Epsilon (ε) productions are forbidden, except possibly S₀ → ε if the language generates ε.',
    passed: invalidEpsilonRules.length === 0,
    violatingRules: invalidEpsilonRules,
    details: invalidEpsilonRules.length === 0
      ? 'No forbidden epsilon productions present.'
      : `Found ${invalidEpsilonRules.length} forbidden epsilon production(s): ${invalidEpsilonRules.map(p => formatProduction(p)).join(', ')}`
  });

  // 4. Check: No Mixed Terminals in Multi-Symbol Productions
  const mixedTerminalRules: Production[] = [];
  for (const prod of productions) {
    if (prod.rhs.length >= 2) {
      const hasTerminal = prod.rhs.some(sym => termSet.has(sym));
      if (hasTerminal) {
        mixedTerminalRules.push(prod);
      }
    }
  }

  checks.push({
    id: 'no-mixed-terminals',
    title: 'No Terminals in Multi-Symbol RHS',
    description: 'Productions with length ≥ 2 must consist strictly of non-terminal variables.',
    passed: mixedTerminalRules.length === 0,
    violatingRules: mixedTerminalRules,
    details: mixedTerminalRules.length === 0
      ? 'All multi-symbol productions consist solely of non-terminals.'
      : `Found ${mixedTerminalRules.length} rule(s) with terminals in length ≥ 2 RHS: ${mixedTerminalRules.map(p => formatProduction(p)).join(', ')}`
  });

  // 5. Check: No Right-Hand Side Longer Than Two Symbols
  const longRules: Production[] = [];
  for (const prod of productions) {
    if (prod.rhs.length > 2) {
      longRules.push(prod);
    }
  }

  checks.push({
    id: 'no-long-productions',
    title: 'No Productions with |RHS| > 2',
    description: 'Every production right-hand side must have at most 2 symbols (binarized).',
    passed: longRules.length === 0,
    violatingRules: longRules,
    details: longRules.length === 0
      ? 'All productions have length ≤ 2.'
      : `Found ${longRules.length} rule(s) exceeding length 2: ${longRules.map(p => formatProduction(p)).join(', ')}`
  });

  // 6. Check: All Symbols Are Defined in Current V and Σ
  const undefinedSymbols: Production[] = [];
  for (const prod of productions) {
    if (!varSet.has(prod.lhs)) {
      undefinedSymbols.push(prod);
      continue;
    }
    for (const sym of prod.rhs) {
      if (!isEpsilon(sym) && !varSet.has(sym) && !termSet.has(sym)) {
        undefinedSymbols.push(prod);
        break;
      }
    }
  }

  checks.push({
    id: 'all-symbols-defined',
    title: 'All Symbols Defined',
    description: 'Every symbol in every production must exist in the active V or Σ sets.',
    passed: undefinedSymbols.length === 0,
    violatingRules: undefinedSymbols,
    details: undefinedSymbols.length === 0
      ? 'All symbols referenced in active productions are fully defined.'
      : `Found ${undefinedSymbols.length} rule(s) with undefined symbols: ${undefinedSymbols.map(p => formatProduction(p)).join(', ')}`
  });

  // 7. Check: Every Variable Is Generating and Reachable
  const { nonGenerating } = findGeneratingVariables(grammar);
  const { unreachable } = findReachableVariables(grammar);

  const uselessVars = new Set([...nonGenerating, ...unreachable]);
  const hasUseless = uselessVars.size > 0;

  checks.push({
    id: 'all-variables-useful',
    title: 'All Variables Are Generating & Reachable',
    description: 'No dead non-generating loops or unreachable orphan variables remain.',
    passed: !hasUseless,
    details: !hasUseless
      ? `All ${variables.length} variable(s) are actively generating and reachable from ${startSymbol}.`
      : `Found useless variable(s): ${Array.from(uselessVars).join(', ')} (Non-generating: ${Array.from(nonGenerating).join(', ') || 'none'}, Unreachable: ${Array.from(unreachable).join(', ') || 'none'}).`
  });

  const isValidCNF = checks.every(c => c.passed);

  return {
    isValidCNF,
    checks,
    summary: isValidCNF
      ? 'All Chomsky Normal Form invariants passed successfully.'
      : 'Grammar does not satisfy all Chomsky Normal Form constraints.'
  };
}
