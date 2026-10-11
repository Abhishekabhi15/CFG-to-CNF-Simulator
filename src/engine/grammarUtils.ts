import { Grammar, Production } from './types';

export const EPSILON = 'ε';

/**
 * Checks if a string representation is epsilon
 */
export function isEpsilon(symbol: string): boolean {
  if (!symbol) return false;
  const s = symbol.trim().toLowerCase();
  return symbol === 'ε' || symbol === 'ϵ' || s === 'epsilon' || s === 'eps';
}

/**
 * Normalizes symbol name if epsilon
 */
export function normalizeSymbol(symbol: string): string {
  if (isEpsilon(symbol)) return EPSILON;
  return symbol.trim();
}

/**
 * Creates a unique string identifier for a production
 */
export function createProductionId(lhs: string, rhs: string[]): string {
  return `${lhs.trim()}->${rhs.map(s => normalizeSymbol(s)).join(' ')}`;
}

/**
 * Checks whether two productions are identical
 */
export function areProductionsEqual(p1: Production, p2: Production): boolean {
  if (p1.lhs !== p2.lhs) return false;
  if (p1.rhs.length !== p2.rhs.length) return false;
  for (let i = 0; i < p1.rhs.length; i++) {
    if (normalizeSymbol(p1.rhs[i]) !== normalizeSymbol(p2.rhs[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Formats a production RHS array into a clean string (e.g. "AB", "XD", "AH1", or "ε")
 */
export function formatRhs(rhs: string[]): string {
  if (!rhs || rhs.length === 0) return EPSILON;
  if (rhs.length === 1) {
    return isEpsilon(rhs[0]) ? EPSILON : rhs[0];
  }
  // If symbols contain spaces, underscores, or length > 3, use space separation
  const needsSpaces = rhs.some(s => s.includes(' ') || s.includes('_') || s.length > 3);
  if (needsSpaces) {
    return rhs.join(' ');
  }
  // Standard formal language theory concise concatenation (e.g. AB, XD, YB, AH1, BC)
  return rhs.join('');
}

/**
 * Formats a production into standard mathematical string "A → B C"
 */
export function formatProduction(prod: Production): string {
  return `${prod.lhs} → ${formatRhs(prod.rhs)}`;
}

/**
 * Deep clones a Grammar object
 */
export function cloneGrammar(grammar: Grammar): Grammar {
  return {
    variables: [...grammar.variables],
    terminals: [...grammar.terminals],
    startSymbol: grammar.startSymbol,
    productions: grammar.productions.map(p => ({
      id: p.id,
      lhs: p.lhs,
      rhs: [...p.rhs]
    }))
  };
}

/**
 * Groups productions by left-hand side variable
 */
export function groupProductionsByLhs(productions: Production[]): Map<string, Production[]> {
  const map = new Map<string, Production[]>();
  for (const prod of productions) {
    const list = map.get(prod.lhs) || [];
    list.push(prod);
    map.set(prod.lhs, list);
  }
  return map;
}

/**
 * Formats grammar productions grouped by LHS:
 * S → AB | C | aD
 */
export function formatGroupedProductions(productions: Production[]): string[] {
  const map = groupProductionsByLhs(productions);
  const lines: string[] = [];
  
  for (const [lhs, prods] of map.entries()) {
    const alternatives = prods.map(p => formatRhs(p.rhs)).join(' | ');
    lines.push(`${lhs} → ${alternatives}`);
  }
  
  return lines;
}

/**
 * Removes duplicate productions from an array while preserving order
 */
export function deduplicateProductions(productions: Production[]): Production[] {
  const seen = new Set<string>();
  const result: Production[] = [];
  
  for (const prod of productions) {
    const key = createProductionId(prod.lhs, prod.rhs);
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        id: key,
        lhs: prod.lhs,
        rhs: prod.rhs.map(normalizeSymbol)
      });
    }
  }
  
  return result;
}

/**
 * Computes difference between two sets of productions: added, removed, unchanged
 */
export function diffProductions(
  beforeProds: Production[],
  afterProds: Production[]
): {
  added: Production[];
  removed: Production[];
  unchanged: Production[];
} {
  const beforeMap = new Map<string, Production>();
  beforeProds.forEach(p => beforeMap.set(p.id, p));

  const afterMap = new Map<string, Production>();
  afterProds.forEach(p => afterMap.set(p.id, p));

  const added: Production[] = [];
  const removed: Production[] = [];
  const unchanged: Production[] = [];

  for (const [id, prod] of afterMap.entries()) {
    if (beforeMap.has(id)) {
      unchanged.push(prod);
    } else {
      added.push(prod);
    }
  }

  for (const [id, prod] of beforeMap.entries()) {
    if (!afterMap.has(id)) {
      removed.push(prod);
    }
  }

  return { added, removed, unchanged };
}

/**
 * Generates fresh helper variable name not already in existing variables
 */
export function generateFreshVariable(prefix: string, existingVariables: Iterable<string>): string {
  const set = new Set(existingVariables);
  let candidate = prefix;
  let counter = 1;

  while (set.has(candidate)) {
    candidate = `${prefix}${counter}`;
    counter++;
  }

  return candidate;
}
