export type Role = "CANDIDATE" | "RECRUITER";

export interface ApiErrorBody {
  error: {
    message: string;
  };
}
