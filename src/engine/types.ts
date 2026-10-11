export interface Production {
  id: string;
  lhs: string;
  rhs: string[]; // array of symbols, e.g. ["A", "B"] or ["a"] or ["ε"]
}

export interface Grammar {
  variables: string[];
  terminals: string[];
  startSymbol: string;
  productions: Production[];
}

export type StageId = 
  | 'input'
  | 'null_elimination'
  | 'unit_elimination'
  | 'useless_elimination'
  | 'cnf_conversion'
  | 'complete';

export interface StageInfo {
  id: StageId;
  stageNumber: number;
  name: string;
  shortName: string;
  description: string;
}

export interface TransformationStep {
  id: number;
  stageId: StageId;
  stageNumber: number;
  stageName: string;
  subStep: string;
  title: string;
  mathGoal: string;
  explanation: string;
  detailedAnalysis?: string;
  examinedRule: Production | null;
  examinedVariable: string | null;
  beforeGrammar: Grammar;
  afterGrammar: Grammar;
  addedProductions: Production[];
  removedProductions: Production[];
  unchangedProductions: Production[];
  rulesBefore: number;
  rulesAdded: number;
  rulesRemoved: number;
  rulesAfter: number;
  metadata?: {
    nullableSet?: string[];
    unitClosures?: Record<string, string[]>;
    generatingSet?: string[];
    nonGeneratingSet?: string[];
    reachableSet?: string[];
    unreachableSet?: string[];
    terminalHelpers?: Record<string, string>;
    binarizedVariables?: string[];
  };
}

export interface VerificationCheck {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  violatingRules?: Production[];
  details?: string;
}

export interface VerificationReport {
  isValidCNF: boolean;
  checks: VerificationCheck[];
  summary: string;
}

export interface ConversionSummary {
  originalVariables: string[];
  originalTerminals: string[];
  originalStartSymbol: string;
  originalProductionCount: number; // Original unique production alternatives
  finalVariables: string[];
  finalTerminals: string[];
  finalStartSymbol: string;
  finalProductionCount: number; // Final CNF unique production alternatives
  netRuleChange: number; // Final CNF Rules − Original Rules
  productionsAddedCount: number; // In final grammar, absent from original
  productionsRemovedCount: number; // In original grammar, absent from final
  productionsRetainedCount: number; // In both original and final grammar
  totalAdded: number; // Same as productionsAddedCount for backwards compatibility
  totalRemoved: number; // Same as productionsRemovedCount for backwards compatibility
  totalSteps: number;
  transformationEventsAdded: number; // Sum of addition events across all pipeline steps
  transformationEventsRemoved: number; // Sum of removal events across all pipeline steps
  emptyStringAccepted: boolean;
}

export interface PipelineResult {
  steps: TransformationStep[];
  originalGrammar: Grammar;
  finalGrammar: Grammar;
  summary: ConversionSummary;
  verification: VerificationReport;
}

export interface GrammarPreset {
  id: string;
  name: string;
  description: string;
  badge?: string;
  variables: string;
  terminals: string;
  startSymbol: string;
  productions: string;
}
