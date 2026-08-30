export interface DeterministicRankingResult {
  score: number;
  matchedKeywords: string[];
  totalJobKeywords: number;
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "with", "you", "your", "our", "will", "have",
  "has", "that", "this", "from", "into", "who", "able", "not", "but",
  "can", "all", "any", "role", "team", "work", "working", "experience",
  "years", "year", "strong", "good", "excellent", "using", "use",
]);

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9+.#]+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  return Array.from(new Set(words));
}

/**
 * Deterministic keyword-overlap score between a job's text and a
 * candidate's skills/resume text. Always computed, LLM or not — this is
 * the "sufficient without an LLM" baseline the architecture calls for.
 */
export function computeDeterministicScore(
  jobText: string,
  candidateSkills: string[],
  candidateText: string,
): DeterministicRankingResult {
  const jobKeywords = extractKeywords(jobText);
  const candidateKeywords = new Set([
    ...candidateSkills.map((skill) => skill.toLowerCase()),
    ...extractKeywords(candidateText),
  ]);

  const matchedKeywords = jobKeywords.filter((keyword) => candidateKeywords.has(keyword));
  const score = jobKeywords.length === 0 ? 0 : Math.round((matchedKeywords.length / jobKeywords.length) * 100);

  return { score, matchedKeywords, totalJobKeywords: jobKeywords.length };
}
