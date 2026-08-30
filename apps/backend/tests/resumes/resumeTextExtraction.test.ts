import { describe, expect, test } from "bun:test";
import { extractResumeText, UnsupportedResumeFormatError } from "../../src/modules/resumes/resumeTextExtraction.ts";

const PDF_FIXTURE_PATH = new URL("../../src/modules/resumes/__fixtures__/sample-resume.pdf", import.meta.url).pathname;
const DOCX_FIXTURE_PATH = new URL("../../src/modules/resumes/__fixtures__/sample-resume.docx", import.meta.url).pathname;

describe("extractResumeText", () => {
  test("extracts real text from a PDF", async () => {
    const bytes = new Uint8Array(await Bun.file(PDF_FIXTURE_PATH).arrayBuffer());

    const text = await extractResumeText("application/pdf", bytes);

    expect(text).toContain("Hello Resume");
  });

  test("extracts real text from a DOCX", async () => {
    const bytes = new Uint8Array(await Bun.file(DOCX_FIXTURE_PATH).arrayBuffer());

    const text = await extractResumeText(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes,
    );

    expect(text).toContain("Hello Docx Resume");
  });

  test("rejects legacy .doc files with a clear message", async () => {
    await expect(extractResumeText("application/msword", new Uint8Array())).rejects.toThrow(
      UnsupportedResumeFormatError,
    );
  });

  test("rejects an unknown MIME type", async () => {
    await expect(extractResumeText("image/png", new Uint8Array())).rejects.toThrow(UnsupportedResumeFormatError);
  });
});
