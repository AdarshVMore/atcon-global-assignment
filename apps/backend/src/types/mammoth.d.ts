declare module "mammoth" {
  export interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }

  export function extractRawText(input: { buffer: Uint8Array } | { path: string }): Promise<ExtractRawTextResult>;
}
