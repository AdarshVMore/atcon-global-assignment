import { describe, expect, test } from "bun:test";
import type OpenAI from "openai";
import { ResumeInformationExtractor } from "../../src/modules/resumes/resumeInformationExtractor.ts";

function fakeClient(content: string): OpenAI {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content } }],
        }),
      },
    },
  } as unknown as OpenAI;
}

describe("ResumeInformationExtractor", () => {
  test("parses a well-formed structured response", async () => {
    const extractor = new ResumeInformationExtractor(
      fakeClient(
        JSON.stringify({
          fullName: "Chris Candidate",
          email: "chris@example.com",
          phone: "+1-555-0100",
          summary: "Backend engineer",
          skills: ["TypeScript", "PostgreSQL"],
          yearsOfExperience: 5,
          education: [{ institution: "State University", degree: "BSc Computer Science" }],
          workExperience: [{ company: "Acme", title: "Engineer", durationYears: 3 }],
        }),
      ),
    );

    const result = await extractor.extract("resume text");

    expect(result.fullName).toBe("Chris Candidate");
    expect(result.skills).toEqual(["TypeScript", "PostgreSQL"]);
    expect(result.education).toEqual([{ institution: "State University", degree: "BSc Computer Science" }]);
    expect(result.workExperience).toEqual([{ company: "Acme", title: "Engineer", durationYears: 3 }]);
  });

  test("defaults missing or malformed fields instead of throwing", async () => {
    const extractor = new ResumeInformationExtractor(fakeClient(JSON.stringify({ skills: "not-an-array" })));

    const result = await extractor.extract("resume text");

    expect(result.fullName).toBeNull();
    expect(result.skills).toEqual([]);
    expect(result.education).toEqual([]);
  });

  test("drops education/work entries missing their required name field", async () => {
    const extractor = new ResumeInformationExtractor(
      fakeClient(
        JSON.stringify({
          education: [{ degree: "BSc" }, { institution: "Real University", degree: "MSc" }],
          workExperience: [{ title: "Engineer" }, { company: "Acme", title: "Engineer" }],
        }),
      ),
    );

    const result = await extractor.extract("resume text");

    expect(result.education).toEqual([{ institution: "Real University", degree: "MSc" }]);
    expect(result.workExperience).toEqual([{ company: "Acme", title: "Engineer", durationYears: null }]);
  });

  test("throws when the model response isn't valid JSON", async () => {
    const extractor = new ResumeInformationExtractor(fakeClient("not json"));

    await expect(extractor.extract("resume text")).rejects.toThrow("OpenRouter response was not valid JSON");
  });

  test("throws when the model returns an empty response", async () => {
    const client = {
      chat: { completions: { create: async () => ({ choices: [{ message: { content: null } }] }) } },
    } as unknown as OpenAI;
    const extractor = new ResumeInformationExtractor(client);

    await expect(extractor.extract("resume text")).rejects.toThrow("OpenRouter returned an empty response");
  });
});
