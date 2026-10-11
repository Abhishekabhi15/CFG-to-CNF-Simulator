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
  originalProductionCount: number;
  finalVariables: string[];
  finalTerminals: string[];
  finalStartSymbol: string;
  finalProductionCount: number;
  totalAdded: number;
  totalRemoved: number;
  totalSteps: number;
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
