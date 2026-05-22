export interface ProConItem {
  id: string; // client-side ID for custom handling
  text: string;
  category: string;
  weight: number; // 1 to 5
  explanation: string;
}

export interface ComparisonOptionScore {
  optionName: string;
  score: number; // 1-10
  comment: string;
}

export interface ComparisonCriterion {
  criterion: string;
  optionScores: ComparisonOptionScore[];
}

export interface SWOTItem {
  text: string;
  description: string;
}

export interface AnalysisResponseData {
  proAndCons: {
    pros: Omit<ProConItem, "id">[];
    cons: Omit<ProConItem, "id">[];
    summary: string;
  };
  comparisonTable: {
    options: string[];
    criteria: ComparisonCriterion[];
    winner: string;
    justification: string;
  };
  swot: {
    strengths: SWOTItem[];
    weaknesses: SWOTItem[];
    opportunities: SWOTItem[];
    threats: SWOTItem[];
    swotInsight: string;
  };
  conclusion: {
    verdict: string;
    actionableFirstStep: string;
  };
}

export interface UserDecision {
  id: string;
  title: string;
  context?: string;
  customOptions?: string[];
  createdAt: string;
  analysis?: AnalysisResponseData;
  // Let the user customize the weights and toggle items in the client-side
  userWeights?: Record<string, number>; // key: text, value: updated weight
  userDisabledItems?: Record<string, boolean>; // key: text, value: hidden/disabled
  customProsCons?: {
    pros: Omit<ProConItem, "category">[];
    cons: Omit<ProConItem, "category">[];
  };
}
