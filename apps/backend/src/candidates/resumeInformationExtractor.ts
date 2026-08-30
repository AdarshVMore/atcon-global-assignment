import type OpenAI from "openai";
import { config } from "../config/env.ts";

export interface ParsedResumeData {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  skills: string[];
  yearsOfExperience: number | null;
  education: { institution: string; degree: string | null }[];
  workExperience: { company: string; title: string | null; durationYears: number | null }[];
}

const EXTRACTION_SYSTEM_PROMPT = `You extract structured candidate information from resume text for an applicant tracking system. Respond with strict JSON only, matching exactly this shape, with no commentary or markdown fences:
{
  "fullName": string | null,
  "email": string | null,
  "phone": string | null,
  "summary": string | null,
  "skills": string[],
  "yearsOfExperience": number | null,
  "education": [{ "institution": string, "degree": string | null }],
  "workExperience": [{ "company": string, "title": string | null, "durationYears": number | null }]
}
If a field cannot be determined from the resume text, use null (or an empty array for list fields). Do not invent information that isn't present in the text.`;

// Keeps the request cheap and within context limits — a resume rarely
// needs more than this to extract the fields above.
const MAX_RESUME_TEXT_CHARS = 12_000;

export class ResumeInformationExtractor {
  constructor(private readonly client: OpenAI) {}

  async extract(resumeText: string): Promise<ParsedResumeData> {
    const completion = await this.client.chat.completions.create({
      model: config.openRouterModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: resumeText.slice(0, MAX_RESUME_TEXT_CHARS) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter returned an empty response");
    }

    return parseAndValidate(content);
  }
}

function parseAndValidate(content: string): ParsedResumeData {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("OpenRouter response was not valid JSON");
  }

  if (typeof raw !== "object" || raw === null) {
    throw new Error("OpenRouter response was not a JSON object");
  }
  const value = raw as Record<string, unknown>;

  return {
    fullName: asNullableString(value.fullName),
    email: asNullableString(value.email),
    phone: asNullableString(value.phone),
    summary: asNullableString(value.summary),
    skills: asStringArray(value.skills),
    yearsOfExperience: typeof value.yearsOfExperience === "number" ? value.yearsOfExperience : null,
    education: asRecordArray(value.education).map((entry) => ({
      institution: asNullableString(entry.institution) ?? "",
      degree: asNullableString(entry.degree),
    })).filter((entry) => entry.institution.length > 0),
    workExperience: asRecordArray(value.workExperience).map((entry) => ({
      company: asNullableString(entry.company) ?? "",
      title: asNullableString(entry.title),
      durationYears: typeof entry.durationYears === "number" ? entry.durationYears : null,
    })).filter((entry) => entry.company.length > 0),
  };
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    : [];
}
