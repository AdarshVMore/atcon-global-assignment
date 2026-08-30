import * as mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const LEGACY_DOC_MIME_TYPE = "application/msword";

export class UnsupportedResumeFormatError extends Error {}

export async function extractResumeText(mimeType: string, data: Uint8Array): Promise<string> {
  if (mimeType === PDF_MIME_TYPE) {
    const parser = new PDFParse({ data });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === DOCX_MIME_TYPE) {
    const result = await mammoth.extractRawText({ buffer: data });
    return result.value.trim();
  }

  if (mimeType === LEGACY_DOC_MIME_TYPE) {
    throw new UnsupportedResumeFormatError(
      "Legacy .doc files are not supported for text extraction — please re-upload as PDF or .docx",
    );
  }

  throw new UnsupportedResumeFormatError(`Unsupported resume MIME type: ${mimeType}`);
}
