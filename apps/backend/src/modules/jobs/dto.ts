export interface CreateJobRequestBody {
  title: unknown;
  description: unknown;
  requirements: unknown;
  stages?: unknown;
}

export interface UpdateJobRequestBody {
  title?: unknown;
  description?: unknown;
  requirements?: unknown;
}

export interface AddJobStageRequestBody {
  name: unknown;
  isTerminal?: unknown;
}

export interface UpdateJobStageRequestBody {
  name?: unknown;
  isTerminal?: unknown;
}
