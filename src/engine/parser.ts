import { Grammar, Production } from './types';
import { EPSILON, isEpsilon, createProductionId, deduplicateProductions } from './grammarUtils';

export interface ParseResult {
  grammar: Grammar;
  errors: string[];
}

/**
 * Parses comma- or space-separated symbol list into string array
 */
export function parseSymbolList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Tokenizes a RHS string into an array of symbol strings.
 * Uses known variables and terminals for intelligent matching when spaces are omitted.
 */
export function tokenizeRhs(
  rawRhs: string,
  knownVariables: string[],
  knownTerminals: string[]
): string[] {
  const trimmed = rawRhs.trim();
  if (!trimmed || isEpsilon(trimmed)) {
    return [EPSILON];
  }

  // If RHS contains spaces, prioritize whitespace splitting
  if (/\s+/.test(trimmed)) {
    const parts = trimmed.split(/\s+/).map(p => p.trim()).filter(Boolean);
    return parts.map(p => isEpsilon(p) ? EPSILON : p);
  }

  // If no spaces, greedy prefix match against known symbols
  const allKnown = Array.from(new Set([...knownVariables, ...knownTerminals]))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length); // longer symbols first (e.g. S0 before S)

  const tokens: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    if (remaining.startsWith('ε') || remaining.startsWith('ϵ')) {
      tokens.push(EPSILON);
      remaining = remaining.slice(1);
      continue;
    }
    if (remaining.toLowerCase().startsWith('epsilon')) {
      tokens.push(EPSILON);
      remaining = remaining.slice(7);
      continue;
    }

    let matched = false;
    for (const sym of allKnown) {
      if (remaining.startsWith(sym)) {
        tokens.push(sym);
        remaining = remaining.slice(sym.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // If symbol is single character (even if unknown yet, will be caught by validator)
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return tokens.length > 0 ? tokens : [EPSILON];
}

/**
 * Parses full raw grammar text into structured Grammar object
 */
export function parseGrammar(
  rawVariables: string,
  rawTerminals: string,
  rawStartSymbol: string,
  rawProductions: string
): ParseResult {
  const errors: string[] = [];

  const variables = parseSymbolList(rawVariables);
  const terminals = parseSymbolList(rawTerminals);
  const startSymbol = rawStartSymbol.trim();

  const productions: Production[] = [];
  const lines = rawProductions.split(/\r?\n/);

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      return; // Skip empty lines or comments
    }

    // Split by arrow (support →, ->, =>)
    const arrowMatch = trimmed.match(/^(.*?)\s*(?:→|->|=>)\s*(.*)$/);
    if (!arrowMatch) {
      errors.push(`Line ${lineIndex + 1}: Missing arrow ('→' or '->') in production "${trimmed}"`);
      return;
    }

    const lhs = arrowMatch[1].trim();
    const rhsFull = arrowMatch[2].trim();

    if (!lhs) {
      errors.push(`Line ${lineIndex + 1}: Left-hand side variable is missing in "${trimmed}"`);
      return;
    }

    if (!rhsFull) {
      errors.push(`Line ${lineIndex + 1}: Right-hand side is missing for variable "${lhs}"`);
      return;
    }

    // Split alternatives by '|'
    const alternatives = rhsFull.split('|').map(alt => alt.trim()).filter(Boolean);
    if (alternatives.length === 0) {
      // Case where RHS was just '|'
      errors.push(`Line ${lineIndex + 1}: Empty alternative in production "${trimmed}"`);
      return;
    }

    for (const alt of alternatives) {
      const tokens = tokenizeRhs(alt, variables, terminals);
      productions.push({
        id: createProductionId(lhs, tokens),
        lhs,
        rhs: tokens
      });
    }
  });

  const grammar: Grammar = {
    variables,
    terminals,
    startSymbol,
    productions: deduplicateProductions(productions)
  };

  return { grammar, errors };
}
