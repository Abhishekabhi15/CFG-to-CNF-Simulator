import { Grammar, Production } from './types';
import { isEpsilon, formatProduction } from './grammarUtils';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGrammar(grammar: Grammar): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { variables, terminals, startSymbol, productions } = grammar;

  // 1. Variables check
  if (!variables || variables.length === 0) {
    errors.push('Variables (V) cannot be empty. Please specify at least one non-terminal variable.');
  }

  // 2. Terminals check
  if (!terminals || terminals.length === 0) {
    errors.push('Terminals (Σ) cannot be empty. Please specify at least one terminal symbol.');
  }

  const varSet = new Set(variables);
  const termSet = new Set(terminals);

  // Check for duplicate variables
  if (variables.length !== varSet.size) {
    warnings.push('Duplicate variables detected in V; duplicates were merged.');
  }

  // Check for duplicate terminals
  if (terminals.length !== termSet.size) {
    warnings.push('Duplicate terminals detected in Σ; duplicates were merged.');
  }

  // Check for intersection between V and Σ
  const intersection = variables.filter(v => termSet.has(v));
  if (intersection.length > 0) {
    errors.push(`Variables (V) and Terminals (Σ) must be disjoint. Conflicting symbol(s): ${intersection.join(', ')}`);
  }

  // Check for epsilon in V or Σ
  if (varSet.has('ε') || varSet.has('epsilon')) {
    errors.push('The empty string (ε) cannot be a variable in V.');
  }
  if (termSet.has('ε') || termSet.has('epsilon')) {
    errors.push('The empty string (ε) is a special symbol and cannot be listed as a terminal in Σ.');
  }

  // 3. Start symbol check
  if (!startSymbol) {
    errors.push('Start symbol (S) is required.');
  } else if (!varSet.has(startSymbol)) {
    errors.push(`Start symbol "${startSymbol}" must be one of the defined variables in V: {${variables.join(', ')}}.`);
  }

  // 4. Productions check
  if (!productions || productions.length === 0) {
    errors.push('Productions (R) cannot be empty. Please define at least one production rule.');
    return { isValid: errors.length === 0, errors, warnings };
  }

  const definedLhs = new Set<string>();

  productions.forEach((prod, idx) => {
    // Check LHS
    if (!prod.lhs) {
      errors.push(`Rule #${idx + 1}: Left-hand side cannot be empty.`);
    } else if (!varSet.has(prod.lhs)) {
      errors.push(`Rule #${idx + 1} (${formatProduction(prod)}): LHS "${prod.lhs}" is not in variables V.`);
    } else {
      definedLhs.add(prod.lhs);
    }

    // Check RHS
    if (!prod.rhs || prod.rhs.length === 0) {
      errors.push(`Rule #${idx + 1} (${prod.lhs} → ): Right-hand side cannot be empty.`);
    } else {
      prod.rhs.forEach((sym) => {
        if (!isEpsilon(sym) && !varSet.has(sym) && !termSet.has(sym)) {
          errors.push(
            `Rule #${idx + 1} (${formatProduction(prod)}): Symbol "${sym}" is neither in V {${variables.join(', ')}} nor in Σ {${terminals.join(', ')}}`
          );
        }
      });
    }
  });

  // Check if start symbol has at least one production
  if (startSymbol && varSet.has(startSymbol) && !definedLhs.has(startSymbol)) {
    errors.push(`Start symbol "${startSymbol}" has no productions defined.`);
  }

  // Variables with no rules warning
  variables.forEach(v => {
    if (!definedLhs.has(v)) {
      warnings.push(`Variable "${v}" has no productions defined. It will be treated as non-generating.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
