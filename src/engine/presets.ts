import { GrammarPreset } from './types';

export const GRAMMAR_PRESETS: GrammarPreset[] = [
  {
    id: 'complete-test',
    name: 'Complete CNF Conversion Test',
    badge: 'Required Benchmark',
    description: 'Demonstrates all 5 conversion stages: Null removal (A → ε), Unit elimination (S → C), Useless variable purge (E → eE), Terminal replacement (S → aD), and Binarization (S → ABC).',
    variables: 'S, A, B, C, D, E',
    terminals: 'a, b, d, e',
    startSymbol: 'S',
    productions: `S → AB | C | aD | ABC
A → aA | ε
B → bB | b
C → AB
D → d
E → eE`
  },
  {
    id: 'null-focus',
    name: 'Null-Production Elimination',
    badge: 'Nullable Focus',
    description: 'Demonstrates combinatorial expansion where multiple nullable variables interact (A and B both derive ε).',
    variables: 'S, A, B',
    terminals: 'a, b',
    startSymbol: 'S',
    productions: `S → AB | a
A → aA | ε
B → bB | ε`
  },
  {
    id: 'unit-focus',
    name: 'Unit-Production Elimination',
    badge: 'Unit Closure Focus',
    description: 'Demonstrates unit closure calculation across transitive chains S ⇒ A ⇒ B ⇒ C.',
    variables: 'S, A, B, C',
    terminals: 'a, b, c',
    startSymbol: 'S',
    productions: `S → A | a
A → B | b
B → C
C → c`
  },
  {
    id: 'useless-focus',
    name: 'Useless Variables Elimination',
    badge: 'Generating & Reachable',
    description: 'Demonstrates both non-generating variable removal (B → bB has no base case) and unreachable variable removal (C, D cannot be reached from S).',
    variables: 'S, A, B, C, D',
    terminals: 'a, b, c',
    startSymbol: 'S',
    productions: `S → AB | a
A → aA | b
B → bB
C → cC | a
D → a | b`
  },
  {
    id: 'mixed-terminal-focus',
    name: 'Mixed-Terminal Replacement',
    badge: 'Terminal Helpers',
    description: 'Demonstrates introducing helper variables (T_a, T_b, T_c) for terminals in multi-symbol right-hand sides and reusing them.',
    variables: 'S, A, B',
    terminals: 'a, b, c',
    startSymbol: 'S',
    productions: `S → aAb | cB
A → a
B → b`
  },
  {
    id: 'binarization-focus',
    name: 'Long-Production Binarization',
    badge: 'Cascade Decomposition',
    description: 'Demonstrates binarization cascade for productions with 4 symbols (S → ABCD) into binary pairs with fresh helper variables.',
    variables: 'S, A, B, C, D',
    terminals: 'a, b, c, d',
    startSymbol: 'S',
    productions: `S → ABCD | aBC
A → a
B → b
C → c
D → d`
  }
];
