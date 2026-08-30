export interface DefaultStageDefinition {
  name: string;
  isTerminal: boolean;
}

export const DEFAULT_JOB_STAGES: DefaultStageDefinition[] = [
  { name: "Applied", isTerminal: false },
  { name: "Screening", isTerminal: false },
  { name: "Interview", isTerminal: false },
  { name: "Offer", isTerminal: false },
  { name: "Hired", isTerminal: true },
  { name: "Rejected", isTerminal: true },
];
